// REST API for the four roles (admin, ngo, restaurant, volunteer).
import express from 'express';
import bcrypt from 'bcryptjs';
import { RES_ZONES, RES_TYPES } from './resConfig.js';
import { resQuery, resOne, resDbState, resClaimMission, resRestock, resSurplusToStock, resRollbackTest } from './resDb.js';
import { resSignToken, resRequireAuth } from './resAuth.js';
import { resCreateCase, resCreateRequest, resNotify, resSqlTime } from './resRecords.js';
import {
  resSubmit, resReplenishZone, resSyncSnapshot, resIsAuto, resSetAuto, resReleasePending,
  resStageOf, resEffectiveOf, resCompareRows, resTraceList, resClearTrace, resIsQueued,
} from './resAllocator.js';
import { ResMutex } from './resSync.js';
import { resBus, resSyncLog, resRecentLog, resChanged } from './resMonitor.js';

export const resApi = express.Router();

// async handler -> JSON error instead of a crash
const resH = (resFn) => (resReq, resRes) =>
  resFn(resReq, resRes).catch((resErr) => {
    if (!resErr.status) console.error(resErr);
    resRes.status(resErr.status || 500).json({ error: resErr.message || 'Something went wrong on the server' });
  });
const resFail = (resStatus, resMessage) => Object.assign(new Error(resMessage), { status: resStatus });
const resToInt = (resV) => Math.max(0, parseInt(resV, 10) || 0);
const RES_QTY = ['food', 'water', 'medicine', 'cots', 'vehicles'];

async function resNeedVerified(resUser) {
  const resOrg = await resOne('SELECT status FROM organisations WHERE user_id = ?', [resUser.id]);
  if (!resOrg || resOrg.status !== 'verified') {
    throw resFail(403, 'Your organisation is waiting for the city controller to verify it.');
  }
}

// ================================================================== auth

resApi.post('/auth/login', resH(async (resReq, resRes) => {
  const { email: resEmail, password: resPassword } = resReq.body || {};
  if (!resEmail || !resPassword) throw resFail(400, 'Enter your email and password');
  const resUser = await resOne('SELECT * FROM users WHERE email = ?', [String(resEmail).trim().toLowerCase()]);
  if (!resUser || !(await bcrypt.compare(resPassword, resUser.password_hash))) {
    throw resFail(401, 'Email or password is wrong');
  }
  delete resUser.password_hash;
  resRes.json({ token: resSignToken(resUser), user: resUser });
}));

resApi.post('/auth/register', resH(async (resReq, resRes) => {
  const resB = resReq.body || {};
  const resName = String(resB.name || '').trim();
  const resEmail = String(resB.email || '').trim().toLowerCase();
  if (!resName || !resEmail || !resB.password) throw resFail(400, 'Name, email and password are needed');
  if (String(resB.password).length < 6) throw resFail(400, 'Password must be at least 6 characters');
  if (!['ngo', 'restaurant', 'volunteer'].includes(resB.role)) throw resFail(400, 'Pick NGO, restaurant or volunteer');
  if (!RES_ZONES.includes(resB.zone)) throw resFail(400, 'Pick a zone');
  if (resB.role !== 'volunteer' && !String(resB.org_name || '').trim()) throw resFail(400, 'Enter your organisation name');

  const resHash = await bcrypt.hash(resB.password, 10);
  let resIns;
  try {
    resIns = await resQuery('INSERT INTO users (name, email, password_hash, role, zone, phone) VALUES (?,?,?,?,?,?)', [
      resName, resEmail, resHash, resB.role, resB.zone, resB.phone || null,
    ]);
  } catch (resErr) {
    if (resErr.code === 'ER_DUP_ENTRY' || String(resErr.message).includes('UNIQUE')) throw resFail(409, 'This email is already registered');
    throw resErr;
  }

  if (resB.role === 'volunteer') {
    await resQuery('INSERT INTO volunteers (user_id, skills) VALUES (?, ?)', [resIns.insertId, String(resB.skills || 'First aid').slice(0, 200)]);
  } else {
    const resType = resB.role === 'restaurant' ? 'Restaurant'
      : ['NGO', 'Emergency Shelter', 'Community Kitchen'].includes(resB.org_type) ? resB.org_type : 'NGO';
    await resQuery(
      'INSERT INTO organisations (user_id, org_name, org_type, zone, address, capacity) VALUES (?,?,?,?,?,?)',
      [resIns.insertId, String(resB.org_name).trim().slice(0, 120), resType, resB.zone,
        String(resB.address || resB.zone).slice(0, 200), resToInt(resB.capacity) || 100]
    );
    await resNotify('admin', null, 'alert', 'New organisation to verify', `${resB.org_name} (${resType}, ${resB.zone}) signed up.`);
    resChanged('notifications');
  }
  const resUser = { id: resIns.insertId, name: resName, email: resEmail, role: resB.role, zone: resB.zone };
  resRes.status(201).json({ token: resSignToken(resUser), user: resUser });
}));

resApi.get('/me', resRequireAuth(), resH(async (resReq, resRes) => {
  const resUser = await resOne('SELECT id, name, email, role, zone, phone FROM users WHERE id = ?', [resReq.user.id]);
  if (!resUser) throw resFail(401, 'Account not found');
  resUser.organisation = await resOne('SELECT org_name, org_type, status, address, capacity FROM organisations WHERE user_id = ?', [resUser.id]);
  resUser.volunteer = await resOne('SELECT * FROM v_volunteer_leaderboard WHERE user_id = ?', [resUser.id]);
  resUser.database = { engine: resDbState.resEngine, note: resDbState.resNote };
  resRes.json(resUser);
}));

// ================================================================== live updates (Server-Sent Events)

resApi.get('/events', resRequireAuth(), (resReq, resRes) => {
  resRes.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  resRes.flushHeaders();
  let resPending = new Set();
  let resTimer = null;
  const resOnData = (resTopic) => {
    resPending.add(resTopic);
    if (resTimer) return;
    resTimer = setTimeout(() => {
      resRes.write(`event: data\ndata: ${JSON.stringify([...resPending])}\n\n`);
      resPending = new Set();
      resTimer = null;
    }, 150);
  };
  resBus.on('data', resOnData);
  const resPing = setInterval(() => resRes.write(': ping\n\n'), 25000);
  resRes.write(`event: data\ndata: ${JSON.stringify(['all'])}\n\n`);
  resReq.on('close', () => {
    resBus.off('data', resOnData);
    clearInterval(resPing);
    clearTimeout(resTimer);
  });
});

// ================================================================== notifications

const RES_MY_NOTES = '(recipient_id = ? OR (recipient_id IS NULL AND recipient_role IN (?, ?)))';

resApi.get('/notifications', resRequireAuth(), resH(async (resReq, resRes) => {
  const resArgs = [resReq.user.id, 'all', resReq.user.role];
  const resRows = await resQuery(`SELECT * FROM notifications WHERE ${RES_MY_NOTES} ORDER BY id DESC LIMIT 30`, resArgs);
  const resUnread = await resOne(`SELECT COUNT(*) AS n FROM notifications WHERE is_read = 0 AND ${RES_MY_NOTES}`, resArgs);
  resRes.json({ items: resRows, unread: Number(resUnread.n) });
}));

resApi.post('/notifications/read-all', resRequireAuth(), resH(async (resReq, resRes) => {
  await resQuery(`UPDATE notifications SET is_read = 1 WHERE ${RES_MY_NOTES}`, [resReq.user.id, 'all', resReq.user.role]);
  resChanged('notifications');
  resRes.json({ ok: true });
}));

// ================================================================== stock

resApi.get('/resources', resRequireAuth(), resH(async (_resReq, resRes) => {
  resRes.json(await resQuery('SELECT zone, resource_type, available, allocated, unit_name FROM resources ORDER BY zone, id'));
}));

resApi.post('/resources/restock', resRequireAuth('admin'), resH(async (resReq, resRes) => {
  const { zone: resZone, type: resType } = resReq.body || {};
  const resAmount = resToInt(resReq.body?.amount);
  if (!RES_ZONES.includes(resZone) || !RES_TYPES.includes(resType)) throw resFail(400, 'Pick a zone and a resource');
  if (resAmount < 1) throw resFail(400, 'Amount must be at least 1');
  const resTxnId = await resReplenishZone(resZone, 'Admin restock', () => resRestock(resZone, resType, resAmount, 'Admin restock'));
  resChanged('ledger');
  resRes.json({ ok: true, txnId: resTxnId });
}));

// ================================================================== emergency queue (cases + requests)

// what each case/request already received, from its missions
async function resGivenMap() {
  const resRows = await resQuery(
    `SELECT kind, target_id, SUM(food) AS food, SUM(water) AS water, SUM(medicine) AS medicine,
            SUM(cots) AS cots, SUM(vehicles) AS vehicles, COUNT(*) AS rounds
     FROM rescue_missions GROUP BY kind, target_id`
  );
  return new Map(resRows.map((resR) => [`${resR.kind}:${resR.target_id}`, resR]));
}

resApi.get('/queue', resRequireAuth('admin', 'ngo'), resH(async (resReq, resRes) => {
  let resRows = await resQuery('SELECT * FROM v_priority_queue');
  if (resReq.user.role === 'ngo') {
    const resMine = await resQuery("SELECT id FROM resource_requests WHERE ngo_id = ? AND status <> 'fulfilled'", [resReq.user.id]);
    const resIds = new Set(resMine.map((resR) => Number(resR.id)));
    resRows = resRows.filter((resR) => resR.kind === 'request' && resIds.has(Number(resR.id)));
  }
  const resGiven = await resGivenMap();
  const resOwners = new Map(
    (await resQuery(
      `SELECT r.id, COALESCE(o.org_name, u.name) AS owner FROM resource_requests r
       JOIN users u ON u.id = r.ngo_id LEFT JOIN organisations o ON o.user_id = u.id`
    )).map((resR) => [Number(resR.id), resR.owner])
  );
  const resNow = Date.now();
  const resOut = resRows
    .map((resR) => {
      const resG = resGiven.get(`${resR.kind}:${resR.id}`) || {};
      const resRow = { ...resR, stage: resStageOf(resR), effective: resEffectiveOf(resR, resNow) };
      resRow.owner = resR.kind === 'case' ? 'City control' : resOwners.get(Number(resR.id)) || 'NGO';
      for (const resK of RES_QTY) resRow[`got_${resK}`] = Number(resG[resK] || 0);
      return resRow;
    })
    .sort((resA, resB) => resCompareRows(resA, resB, resNow));
  resRes.json(resOut);
}));

resApi.post('/cases', resRequireAuth('admin'), resH(async (resReq, resRes) => {
  const resB = resReq.body || {};
  const resTitle = String(resB.title || '').trim();
  const resPriority = parseInt(resB.priority, 10);
  if (!resTitle) throw resFail(400, 'Write what happened');
  if (!RES_ZONES.includes(resB.zone)) throw resFail(400, 'Pick a zone');
  if (!(resPriority >= 1 && resPriority <= 4)) throw resFail(400, 'Pick a priority');
  if (RES_QTY.every((resK) => !resToInt(resB[resK]))) throw resFail(400, 'Ask for at least one resource');
  const resType = ['flood', 'fire', 'earthquake', 'medical', 'other'].includes(resB.case_type) ? resB.case_type : 'other';

  const resCase = await resCreateCase({
    ...resB, title: resTitle.slice(0, 150), case_type: resType, priority: resPriority,
    location: String(resB.location || resB.zone).slice(0, 150), burst_time: resToInt(resB.burst_time) || 30, reported_by: resReq.user.id,
  });
  if (resPriority === 1) {
    await resNotify('all', null, 'critical', `Critical ${resType} in ${resB.zone}`, `${resCase.process_id}: ${resTitle}`);
  }
  if (resIsAuto()) {
    resSubmit({ kind: 'case', id: resCase.id, process_id: resCase.process_id, title: resTitle, zone: resB.zone, priority: resPriority, created_at: null }, resReq.user.name);
  } else {
    resSyncLog('info', `${resCase.process_id} (P${resPriority}, ${resB.zone}) logged - pending until the allocation is run`);
  }
  resChanged('queue');
  resChanged('notifications');
  resRes.status(201).json(resCase);
}));

resApi.post('/requests', resRequireAuth('ngo'), resH(async (resReq, resRes) => {
  await resNeedVerified(resReq.user);
  const resB = resReq.body || {};
  const resTitle = String(resB.title || '').trim();
  const resPriority = parseInt(resB.priority, 10);
  if (!resTitle) throw resFail(400, 'Write what the supplies are for');
  if (!RES_ZONES.includes(resB.zone)) throw resFail(400, 'Pick a zone');
  if (!(resPriority >= 1 && resPriority <= 4)) throw resFail(400, 'Pick a priority');
  if (RES_QTY.every((resK) => !resToInt(resB[resK]))) throw resFail(400, 'Ask for at least one resource');

  const resRequest = await resCreateRequest({ ...resB, title: resTitle.slice(0, 150), priority: resPriority, ngo_id: resReq.user.id });
  await resNotify('admin', null, resPriority === 1 ? 'critical' : 'info', `New request ${resRequest.process_id}`, `${resReq.user.name}: ${resTitle} (${resB.zone}, P${resPriority})`);
  if (resIsAuto()) {
    resSubmit({ kind: 'request', id: resRequest.id, process_id: resRequest.process_id, title: resTitle, zone: resB.zone, priority: resPriority, created_at: null }, resReq.user.name);
  } else {
    resSyncLog('info', `${resRequest.process_id} (P${resPriority}, ${resB.zone}) added - pending until the allocation is run`);
  }
  resChanged('queue');
  resChanged('notifications');
  resRes.status(201).json(resRequest);
}));

resApi.get('/history', resRequireAuth('admin', 'ngo'), resH(async (resReq, resRes) => {
  const resNgo = resReq.user.role === 'ngo';
  const resRows = await resQuery(
    `SELECT * FROM (
       SELECT 'case' AS kind, id, process_id, title, zone, priority, created_at, fulfilled_at, 'City control' AS owner
       FROM emergency_cases WHERE status = 'fulfilled' ${resNgo ? 'AND 1 = 0' : ''}
       UNION ALL
       SELECT 'request', r.id, r.process_id, r.title, r.zone, r.priority, r.created_at, r.fulfilled_at, u.name
       FROM resource_requests r JOIN users u ON u.id = r.ngo_id
       WHERE r.status = 'fulfilled' ${resNgo ? 'AND r.ngo_id = ?' : ''}
     ) h ORDER BY fulfilled_at DESC LIMIT 60`,
    resNgo ? [resReq.user.id] : []
  );
  const resGiven = await resGivenMap();
  resRes.json(resRows.map((resR) => {
    const resG = resGiven.get(`${resR.kind}:${resR.id}`) || {};
    const resOut = { ...resR, rounds: Number(resG.rounds || 0) };
    for (const resK of RES_QTY) resOut[resK] = Number(resG[resK] || 0);
    return resOut;
  }));
}));

// ================================================================== allocator controls

async function resPendingCount() {
  const resRows = await resQuery("SELECT kind, id, zone, status FROM v_priority_queue WHERE status IN ('pending','waiting')");
  // anything not inside the allocator yet will be released by the next run
  return resRows.filter((resR) => !resIsQueued(resR)).length;
}

resApi.get('/allocator', resRequireAuth(), resH(async (_resReq, resRes) => {
  resRes.json({ auto: resIsAuto(), pending: await resPendingCount() });
}));

resApi.post('/admin/allocate', resRequireAuth('admin'), resH(async (resReq, resRes) => {
  resRes.json({ ok: true, count: await resReleasePending(resReq.user.name) });
}));

resApi.post('/admin/auto', resRequireAuth('admin'), resH(async (resReq, resRes) => {
  const resReleased = await resSetAuto(Boolean(resReq.body?.auto), resReq.user.name);
  resRes.json({ ok: true, auto: resIsAuto(), released: resReleased });
}));

resApi.get('/sync', resRequireAuth('admin'), (_resReq, resRes) => {
  resRes.json({ ...resSyncSnapshot(), log: resRecentLog(60) });
});

resApi.get('/trace', resRequireAuth('admin'), (_resReq, resRes) => resRes.json(resTraceList()));

resApi.post('/trace/clear', resRequireAuth('admin'), (_resReq, resRes) => {
  resClearTrace();
  resChanged('sync');
  resRes.json({ ok: true });
});

// ================================================================== rescue missions

const RES_NEXT_STAGE = { assigned: 'pickup', pickup: 'in_transit', in_transit: 'delivered' };
const resMissionMutex = new ResMutex('missions');

resApi.get('/missions', resRequireAuth(), resH(async (resReq, resRes) => {
  const resRole = resReq.user.role;
  let resWhere = '1 = 1';
  let resArgs = [];
  if (resRole === 'volunteer') {
    resWhere = "(status = 'open' OR volunteer_id = ?)";
    resArgs = [resReq.user.id];
  } else if (resRole === 'ngo') {
    resWhere = "kind = 'request' AND target_id IN (SELECT id FROM resource_requests WHERE ngo_id = ?)";
    resArgs = [resReq.user.id];
  } else if (resRole === 'restaurant') {
    throw resFail(403, 'Restaurants track pickups on the Surplus food page');
  }
  resRes.json(await resQuery(
    `SELECT * FROM v_mission_board WHERE ${resWhere}
     ORDER BY CASE status WHEN 'assigned' THEN 0 WHEN 'pickup' THEN 0 WHEN 'in_transit' THEN 0
              WHEN 'delivered' THEN 1 WHEN 'open' THEN 2 ELSE 3 END, priority, id DESC LIMIT 150`,
    resArgs
  ));
}));

resApi.post('/missions/:id/claim', resRequireAuth('volunteer'), resH(async (resReq, resRes) => {
  const resId = resToInt(resReq.params.id);
  // the mutex lines up claims in this server, the procedure's row lock decides between servers
  const resResult = await resMissionMutex.resRun(resReq.user.name, () => resClaimMission(resId, resReq.user.id));
  const resMessages = {
    TAKEN: 'Another volunteer already claimed this mission',
    BUSY: 'Finish your current mission before claiming another one',
    NOT_FOUND: 'Mission not found',
  };
  if (resResult !== 'OK') throw resFail(409, resMessages[resResult] || 'Could not claim');
  resSyncLog('lock', `${resReq.user.name} claimed mission #${resId} (sp_DispatchRescueMission)`);
  resChanged('missions');
  resRes.json({ ok: true });
}));

resApi.post('/missions/:id/advance', resRequireAuth('volunteer'), resH(async (resReq, resRes) => {
  const resM = await resOne('SELECT * FROM rescue_missions WHERE id = ? AND volunteer_id = ?', [resToInt(resReq.params.id), resReq.user.id]);
  if (!resM) throw resFail(404, 'This mission is not yours');
  const resNext = RES_NEXT_STAGE[resM.status];
  if (!resNext) throw resFail(409, 'Nothing more to do on this mission');
  await resQuery('UPDATE rescue_missions SET status = ? WHERE id = ? AND status = ?', [resNext, resM.id, resM.status]);
  if (resNext === 'delivered') {
    if (resM.kind === 'request') {
      const resR = await resOne('SELECT ngo_id FROM resource_requests WHERE id = ?', [resM.target_id]);
      await resNotify('ngo', resR?.ngo_id ?? null, 'success', `Delivery for ${resM.process_id} arrived`, 'Please confirm you received it so the volunteer gets their reward.');
    } else {
      await resNotify('admin', null, 'success', `Delivery for ${resM.process_id} arrived`, 'Confirm it on the Missions page.');
    }
    resChanged('notifications');
  }
  resChanged('missions');
  resRes.json({ ok: true, status: resNext });
}));

resApi.post('/missions/:id/confirm', resRequireAuth('admin', 'ngo'), resH(async (resReq, resRes) => {
  const resM = await resOne('SELECT * FROM rescue_missions WHERE id = ?', [resToInt(resReq.params.id)]);
  if (!resM) throw resFail(404, 'Mission not found');
  if (resReq.user.role === 'ngo') {
    const resMine = resM.kind === 'request' && (await resOne('SELECT id FROM resource_requests WHERE id = ? AND ngo_id = ?', [resM.target_id, resReq.user.id]));
    if (!resMine) throw resFail(403, 'This delivery is not for your organisation');
  }
  if (resM.status !== 'delivered') throw resFail(409, 'Only delivered missions can be confirmed');
  // trigger trg_mission_reward gives the volunteer XP + coins
  await resQuery("UPDATE rescue_missions SET status = 'completed' WHERE id = ? AND status = 'delivered'", [resM.id]);
  await resNotify('volunteer', resM.volunteer_id, 'success', 'Mission completed: +50 XP, +20 coins', `${resM.process_id} was confirmed. Thank you!`);
  resChanged('missions');
  resChanged('notifications');
  resRes.json({ ok: true });
}));

resApi.get('/leaderboard', resRequireAuth(), resH(async (_resReq, resRes) => {
  resRes.json(await resQuery('SELECT * FROM v_volunteer_leaderboard LIMIT 20'));
}));

// ================================================================== surplus food

async function resExpireOldFood() {
  await resQuery("UPDATE surplus_food SET status = 'expired' WHERE status = 'available' AND expiry_time < ?", [resSqlTime()]);
}

resApi.get('/surplus', resRequireAuth(), resH(async (resReq, resRes) => {
  await resExpireOldFood();
  const resRole = resReq.user.role;
  let resWhere = '1 = 1';
  let resArgs = [];
  if (resRole === 'restaurant') {
    resWhere = 's.restaurant_id = ?';
    resArgs = [resReq.user.id];
  } else if (resRole === 'ngo') {
    resWhere = "(s.status = 'available' OR s.claimed_by = ?)";
    resArgs = [resReq.user.id];
  } else if (resRole === 'volunteer') {
    throw resFail(403, 'Not available for volunteers');
  }
  resRes.json(await resQuery(
    `SELECT s.*, COALESCE(o.org_name, u.name) AS restaurant_name, COALESCE(nor.org_name, nus.name) AS claimed_by_name
     FROM surplus_food s
     JOIN users u ON u.id = s.restaurant_id
     LEFT JOIN organisations o ON o.user_id = u.id
     LEFT JOIN users nus ON nus.id = s.claimed_by
     LEFT JOIN organisations nor ON nor.user_id = nus.id
     WHERE ${resWhere} ORDER BY s.id DESC LIMIT 100`,
    resArgs
  ));
}));

resApi.post('/surplus', resRequireAuth('restaurant'), resH(async (resReq, resRes) => {
  await resNeedVerified(resReq.user);
  const resB = resReq.body || {};
  const resTitle = String(resB.title || '').trim();
  const resServings = resToInt(resB.servings);
  const resZone = RES_ZONES.includes(resB.zone) ? resB.zone : resReq.user.zone;
  const resHours = Math.min(48, Math.max(1, resToInt(resB.expiry_hours) || 4));
  if (!resTitle) throw resFail(400, 'Say what food it is');
  if (resServings < 1) throw resFail(400, 'Servings must be at least 1');
  // trigger trg_surplus_food_alert tells every NGO if it's 80+ servings
  await resQuery(
    'INSERT INTO surplus_food (restaurant_id, title, food_type, servings, zone, expiry_time) VALUES (?,?,?,?,?,?)',
    [resReq.user.id, resTitle.slice(0, 150), String(resB.food_type || 'Cooked meals').slice(0, 60), resServings, resZone,
      resSqlTime(new Date(Date.now() + resHours * 3600000))]
  );
  resChanged('surplus');
  resChanged('notifications');
  resRes.status(201).json({ ok: true, alerted: resServings >= 80 });
}));

resApi.post('/surplus/:id/reserve', resRequireAuth('ngo'), resH(async (resReq, resRes) => {
  await resNeedVerified(resReq.user);
  const resId = resToInt(resReq.params.id);
  // conditional UPDATE = only the first NGO wins
  const resUpd = await resQuery("UPDATE surplus_food SET status = 'reserved', claimed_by = ? WHERE id = ? AND status = 'available'", [resReq.user.id, resId]);
  if (!resUpd.affectedRows) throw resFail(409, 'Someone else already reserved this food');
  const resFood = await resOne('SELECT restaurant_id, title FROM surplus_food WHERE id = ?', [resId]);
  await resNotify('restaurant', resFood.restaurant_id, 'info', 'Your surplus food was reserved', `${resReq.user.name} will pick up "${resFood.title}".`);
  resChanged('surplus');
  resChanged('notifications');
  resRes.json({ ok: true });
}));

resApi.post('/surplus/:id/picked-up', resRequireAuth('restaurant'), resH(async (resReq, resRes) => {
  const resId = resToInt(resReq.params.id);
  const resUpd = await resQuery("UPDATE surplus_food SET status = 'picked_up' WHERE id = ? AND restaurant_id = ? AND status = 'reserved'", [resId, resReq.user.id]);
  if (!resUpd.affectedRows) throw resFail(409, 'Only reserved food can be marked as picked up');
  const resFood = await resOne('SELECT claimed_by, title FROM surplus_food WHERE id = ?', [resId]);
  await resNotify('ngo', resFood.claimed_by, 'info', 'Food is on the way', `"${resFood.title}" was picked up from the restaurant.`);
  resChanged('surplus');
  resChanged('notifications');
  resRes.json({ ok: true });
}));

resApi.post('/surplus/:id/delivered', resRequireAuth('ngo'), resH(async (resReq, resRes) => {
  const resUpd = await resQuery("UPDATE surplus_food SET status = 'delivered' WHERE id = ? AND claimed_by = ? AND status = 'picked_up'", [resToInt(resReq.params.id), resReq.user.id]);
  if (!resUpd.affectedRows) throw resFail(409, 'Only picked-up food can be confirmed');
  resChanged('surplus');
  resRes.json({ ok: true });
}));

resApi.post('/surplus/:id/to-stock', resRequireAuth('admin'), resH(async (resReq, resRes) => {
  const resFood = await resOne('SELECT zone FROM surplus_food WHERE id = ?', [resToInt(resReq.params.id)]);
  if (!resFood) throw resFail(404, 'Not found');
  const resDone = await resReplenishZone(resFood.zone, 'Surplus to depot', () => resSurplusToStock(resToInt(resReq.params.id), 'Surplus to depot'));
  resChanged('surplus');
  resChanged('ledger');
  resRes.json({ ok: true, txnId: resDone.resTxnId });
}));

// ================================================================== organisations

resApi.get('/organisations', resRequireAuth('admin'), resH(async (_resReq, resRes) => {
  resRes.json(await resQuery(
    `SELECT o.*, u.name AS contact, u.email FROM organisations o JOIN users u ON u.id = o.user_id
     ORDER BY CASE o.status WHEN 'pending' THEN 0 WHEN 'verified' THEN 1 ELSE 2 END, o.id`
  ));
}));

resApi.post('/organisations/:id/status', resRequireAuth('admin'), resH(async (resReq, resRes) => {
  const resStatus = resReq.body?.status;
  if (!['verified', 'rejected', 'pending'].includes(resStatus)) throw resFail(400, 'Bad status');
  const resOrg = await resOne('SELECT * FROM organisations WHERE id = ?', [resToInt(resReq.params.id)]);
  if (!resOrg) throw resFail(404, 'Organisation not found');
  await resQuery('UPDATE organisations SET status = ? WHERE id = ?', [resStatus, resOrg.id]);
  await resNotify(resOrg.org_type === 'Restaurant' ? 'restaurant' : 'ngo', resOrg.user_id,
    resStatus === 'verified' ? 'success' : 'alert', `Organisation ${resStatus}`,
    resStatus === 'verified' ? `${resOrg.org_name} is verified. You can use every feature now.` : `${resOrg.org_name} was ${resStatus} by the city controller.`);
  resChanged('organisations');
  resChanged('notifications');
  resRes.json({ ok: true });
}));

// ================================================================== admin tools

resApi.get('/admin/integrity', resRequireAuth('admin'), resH(async (_resReq, resRes) => {
  const resStock = await resQuery('SELECT zone, resource_type, available, allocated FROM resources');
  const resSums = await resQuery(
    `SELECT zone, SUM(food) AS food, SUM(water) AS water, SUM(medicine) AS medicine, SUM(cots) AS cots, SUM(vehicles) AS vehicles
     FROM rescue_missions GROUP BY zone`
  );
  const resByZone = new Map(resSums.map((resS) => [resS.zone, resS]));
  const resBad = resStock.filter((resR) => {
    const resLedger = Number(resByZone.get(resR.zone)?.[resR.resource_type] || 0);
    return Number(resR.allocated) !== resLedger || Number(resR.available) < 0;
  });
  resRes.json({ ok: resBad.length === 0, checked: resStock.length, mismatches: resBad });
}));

resApi.post('/admin/stress', resRequireAuth('admin'), resH(async (resReq, resRes) => {
  const resCount = Math.min(30, Math.max(2, resToInt(resReq.body?.count) || 10));
  const resZone = RES_ZONES.includes(resReq.body?.zone) ? resReq.body.zone : null;
  const resStamp = Date.now().toString(36).slice(-4);
  const resRand = (resN) => Math.floor(Math.random() * resN);
  const resTypes = ['flood', 'fire', 'earthquake', 'medical', 'other'];
  resSyncLog('info', `Load test: ${resCount} cases logged at the same moment`);
  await Promise.all(
    Array.from({ length: resCount }, (_resX, resI) =>
      resCreateCase({
        title: `Load test ${resStamp}-${resI + 1}`, case_type: resTypes[resRand(5)], priority: 1 + resRand(4),
        zone: resZone || RES_ZONES[resRand(4)], location: 'Load test', food: 10 + resRand(50), water: 10 + resRand(50),
        medicine: resRand(15), cots: resRand(15), vehicles: resRand(2), burst_time: 10 + resRand(40), reported_by: resReq.user.id,
      })
    )
  );
  if (resIsAuto()) await resReleasePending('auto');
  resChanged('queue');
  resRes.json({ ok: true, count: resCount });
}));

resApi.post('/admin/rollback-test', resRequireAuth('admin'), resH(async (resReq, resRes) => {
  const resZone = RES_ZONES.includes(resReq.body?.zone) ? resReq.body.zone : 'Zone A';
  const resType = RES_TYPES.includes(resReq.body?.type) ? resReq.body.type : 'food';
  const resAmount = Math.max(1, resToInt(resReq.body?.amount) || 50);
  const resResult = await resReplenishZone(resZone, 'Rollback test', () => resRollbackTest(resZone, resType, resAmount, 'Rollback test'));
  resSyncLog('error', `Txn #${resResult.txnId} ROLLBACK: ${resZone} ${resType} ${resResult.before} -> ${resResult.seenInside} inside, back to ${resResult.after}`);
  resRes.json(resResult);
}));

resApi.get('/audit', resRequireAuth('admin'), resH(async (resReq, resRes) => {
  const resAction = String(resReq.query.action || '');
  const resLimit = Math.min(300, Math.max(10, resToInt(resReq.query.limit) || 100));
  const resRows = resAction
    ? await resQuery('SELECT * FROM audit_logs WHERE action = ? ORDER BY id DESC LIMIT ?', [resAction, resLimit])
    : await resQuery('SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?', [resLimit]);
  resRes.json(resRows);
}));

resApi.get('/ledger', resRequireAuth('admin'), resH(async (_resReq, resRes) => {
  resRes.json(await resQuery("SELECT * FROM audit_logs WHERE action IN ('STOCK_ALLOCATED','STOCK_ADDED') ORDER BY id DESC LIMIT 80"));
}));
