// Final-phase features: ML risk model, feedback & ratings, profile editing,
// compliance reports, backup & recovery.
import express from 'express';
import bcrypt from 'bcryptjs';
import { RES_ZONES, RES_TYPES } from './resConfig.js';
import { resQuery, resOne, resDbState } from './resDb.js';
import { resRequireAuth, resSignToken } from './resAuth.js';
import { resNotify } from './resRecords.js';
import { resInsightOf, resStageOf, resCompareRows } from './resAllocator.js';
import { resModelInfo, resTrainModel, resPredictRisk, RES_FEATURES } from './resModel.js';
import { resDistanceKm, resProximity, resClampToZone, resDepotOf } from './resGeo.js';
import { resConfig } from './resConfig.js';
import { resCreateBackup, resListBackups, resBackupPath, resRestoreBackup, resSaveUploaded, resLastBackupAt } from './resBackup.js';
import { resChanged, resSyncLog } from './resMonitor.js';
import { resArchiveExpired, resArchiveSummary } from './resArchive.js';

export const resExtraApi = express.Router();

const resH = (resFn) => (resReq, resRes) =>
  resFn(resReq, resRes).catch((resErr) => {
    if (!resErr.status) console.error(resErr);
    resRes.status(resErr.status || 500).json({ error: resErr.message || 'Something went wrong on the server' });
  });
const resFail = (resStatus, resMessage) => Object.assign(new Error(resMessage), { status: resStatus });
const resToInt = (resV) => Math.max(0, parseInt(resV, 10) || 0);
const RES_QTY = ['food', 'water', 'medicine', 'cots', 'vehicles'];

// ================================================================== ML risk model

resExtraApi.get('/ml/model', resRequireAuth('admin'), resH(async (_resReq, resRes) => {
  const resRows = await resQuery('SELECT * FROM v_priority_queue');
  const resNow = Date.now();
  const resQueue = resRows
    .map((resR) => ({
      kind: resR.kind, id: Number(resR.id), process_id: resR.process_id, title: resR.title, zone: resR.zone,
      priority: Number(resR.priority), case_type: resR.case_type, people_affected: Number(resR.people_affected),
      loc_x: Number(resR.loc_x), loc_y: Number(resR.loc_y), stage: resStageOf(resR), ...resInsightOf(resR, resNow), resRow: resR,
    }))
    .sort((resA, resB) => resCompareRows(resA.resRow, resB.resRow, resNow))
    .map(({ resRow: resSkip, ...resRest }, resI) => ({ ...resRest, rank: resI + 1 }));
  const { resRiskWeight, resDistanceWeight, resPromoteAt } = resConfig.resScheduler;
  resRes.json({
    model: resModelInfo(),
    scheduler: { riskWeight: resRiskWeight, distanceWeight: resDistanceWeight, promoteAt: resPromoteAt, agingMs: resConfig.resAllocator.resAgingMs },
    queue: resQueue,
  });
}));

resExtraApi.post('/ml/retrain', resRequireAuth('admin'), resH(async (resReq, resRes) => {
  const resSeed = resToInt(resReq.body?.seed) || Math.floor(Math.random() * 100000);
  const resInfo = resTrainModel(resSeed);
  resSyncLog('info', `${resReq.user.name} retrained the ML risk model (seed ${resSeed}): test accuracy ${resInfo.test.accuracy}%`);
  resChanged('queue');
  resChanged('ml');
  resRes.json(resInfo);
}));

// "what if" - risk and queue score for a case that doesn't exist yet
resExtraApi.post('/ml/predict', resRequireAuth('admin', 'ngo'), resH(async (resReq, resRes) => {
  const resB = resReq.body || {};
  const resZone = RES_ZONES.includes(resB.zone) ? resB.zone : 'Zone A';
  const resPriority = Math.min(4, Math.max(1, resToInt(resB.priority) || 2));
  const [resDx, resDy] = resDepotOf(resZone);
  const [resX, resY] = resClampToZone(resZone, Number(resB.loc_x ?? resDx), Number(resB.loc_y ?? resDy));
  const resInput = { ...resB, priority: resPriority, waitMin: Number(resB.wait_min || 0) };
  const { risk: resRisk, contributions: resContrib } = resPredictRisk(resInput);
  const resDistance = resDistanceKm(resZone, resX, resY);
  const { resRiskWeight, resDistanceWeight, resPromoteAt } = resConfig.resScheduler;
  const resPromoted = resPriority > 1 && resRisk >= resPromoteAt;
  resRes.json({
    risk: resRisk,
    contributions: resContrib,
    distance: resDistance,
    proximity: +resProximity(resDistance).toFixed(3),
    score: +(resRiskWeight * resRisk + resDistanceWeight * resProximity(resDistance)).toFixed(3),
    promoted: resPromoted,
    effective: resPromoted ? resPriority - 1 : resPriority,
  });
}));

resExtraApi.get('/ml/features', resRequireAuth(), (_resReq, resRes) => resRes.json(RES_FEATURES));

// ================================================================== feedback & ratings

const RES_DONE_FOOD = ['delivered', 'added_to_stock'];

// who is allowed to rate whom, for one finished mission / surplus pickup
async function resRatingTarget(resUser, resContext, resId) {
  if (resContext === 'mission') {
    const resM = await resOne('SELECT * FROM rescue_missions WHERE id = ?', [resId]);
    if (!resM) throw resFail(404, 'Mission not found');
    if (resM.status !== 'completed') throw resFail(409, 'You can rate a mission once it is completed');
    const resReq = resM.kind === 'request' ? await resOne('SELECT ngo_id FROM resource_requests WHERE id = ?', [resM.target_id]) : null;
    if (resUser.role === 'admin' || (resUser.role === 'ngo' && resReq && Number(resReq.ngo_id) === resUser.id)) {
      return { resTo: Number(resM.volunteer_id), resWhat: `delivery ${resM.process_id}` };
    }
    if (resUser.role === 'volunteer' && Number(resM.volunteer_id) === resUser.id && resReq) {
      return { resTo: Number(resReq.ngo_id), resWhat: `delivery ${resM.process_id}` };
    }
    throw resFail(403, 'You were not part of this mission');
  }
  const resF = await resOne('SELECT * FROM surplus_food WHERE id = ?', [resId]);
  if (!resF) throw resFail(404, 'Donation not found');
  if (!RES_DONE_FOOD.includes(resF.status) || !resF.claimed_by) throw resFail(409, 'You can rate a donation once it is delivered');
  if (resUser.role === 'restaurant' && Number(resF.restaurant_id) === resUser.id) return { resTo: Number(resF.claimed_by), resWhat: `pickup of "${resF.title}"` };
  if (resUser.role === 'ngo' && Number(resF.claimed_by) === resUser.id) return { resTo: Number(resF.restaurant_id), resWhat: `donation "${resF.title}"` };
  throw resFail(403, 'You were not part of this donation');
}

resExtraApi.post('/feedback', resRequireAuth(), resH(async (resReq, resRes) => {
  const resB = resReq.body || {};
  const resContext = resB.context === 'surplus' ? 'surplus' : 'mission';
  const resId = resToInt(resB.context_id);
  const resRating = parseInt(resB.rating, 10);
  if (!(resRating >= 1 && resRating <= 5)) throw resFail(400, 'Pick 1 to 5 stars');
  const { resTo, resWhat } = await resRatingTarget(resReq.user, resContext, resId);
  if (!resTo) throw resFail(409, 'Nobody to rate yet');
  try {
    // trigger trg_low_rating_alert tells the admin about 1-2 star ratings
    await resQuery('INSERT INTO feedback (from_user, to_user, context, context_id, rating, comment) VALUES (?,?,?,?,?,?)', [
      resReq.user.id, resTo, resContext, resId, resRating, String(resB.comment || '').trim().slice(0, 255) || null,
    ]);
  } catch (resErr) {
    if (resErr.code === 'ER_DUP_ENTRY' || String(resErr.message).includes('UNIQUE')) throw resFail(409, 'You already rated this');
    throw resErr;
  }
  await resNotify('all', resTo, resRating >= 4 ? 'success' : 'info', `You got ${resRating}/5 stars`, `${resReq.user.name} rated your ${resWhat}.`);
  resChanged('feedback');
  resChanged('notifications');
  resRes.status(201).json({ ok: true });
}));

// what I already rated (so the buttons can hide) + what I received
resExtraApi.get('/feedback/mine', resRequireAuth(), resH(async (resReq, resRes) => {
  const resGiven = await resQuery('SELECT context, context_id, to_user, rating FROM feedback WHERE from_user = ?', [resReq.user.id]);
  const resReceived = await resQuery(
    `SELECT f.*, u.name AS from_name FROM feedback f JOIN users u ON u.id = f.from_user
     WHERE f.to_user = ? ORDER BY f.id DESC LIMIT 30`, [resReq.user.id]
  );
  const resAvg = await resOne('SELECT * FROM v_user_ratings WHERE user_id = ?', [resReq.user.id]);
  resRes.json({ given: resGiven, received: resReceived, average: resAvg ? Number(resAvg.avg_rating) : null, count: resAvg ? Number(resAvg.ratings) : 0 });
}));

resExtraApi.get('/feedback', resRequireAuth('admin'), resH(async (_resReq, resRes) => {
  resRes.json(await resQuery(
    `SELECT f.*, a.name AS from_name, b.name AS to_name, b.role AS to_role
     FROM feedback f JOIN users a ON a.id = f.from_user JOIN users b ON b.id = f.to_user
     ORDER BY f.id DESC LIMIT 100`
  ));
}));

// ================================================================== profile editing

export async function resMe(resId) {
  const resUser = await resOne('SELECT id, name, email, role, zone, phone FROM users WHERE id = ?', [resId]);
  if (!resUser) throw resFail(401, 'Account not found');
  resUser.organisation = await resOne('SELECT org_name, org_type, status, address, capacity FROM organisations WHERE user_id = ?', [resId]);
  resUser.volunteer = await resOne('SELECT * FROM v_volunteer_leaderboard WHERE user_id = ?', [resId]);
  if (resUser.volunteer) {
    const resV = await resOne('SELECT skills FROM volunteers WHERE user_id = ?', [resId]);
    resUser.volunteer.skills = resV?.skills;
  }
  const resR = await resOne('SELECT * FROM v_user_ratings WHERE user_id = ?', [resId]);
  resUser.rating = resR ? { average: Number(resR.avg_rating), count: Number(resR.ratings) } : null;
  resUser.database = { engine: resDbState.resEngine, note: resDbState.resNote };
  return resUser;
}

resExtraApi.patch('/me', resRequireAuth(), resH(async (resReq, resRes) => {
  const resB = resReq.body || {};
  const resId = resReq.user.id;
  const resName = String(resB.name ?? '').trim();
  if (!resName) throw resFail(400, 'Name cannot be empty');
  const resZone = RES_ZONES.includes(resB.zone) ? resB.zone : resReq.user.zone;
  const resPhone = String(resB.phone ?? '').trim().slice(0, 20) || null;
  await resQuery('UPDATE users SET name = ?, zone = ?, phone = ? WHERE id = ?', [resName.slice(0, 100), resZone, resPhone, resId]);

  const resOrg = await resOne('SELECT * FROM organisations WHERE user_id = ?', [resId]);
  if (resOrg && resB.organisation) {
    const resO = resB.organisation;
    const resOrgName = String(resO.org_name ?? resOrg.org_name).trim();
    if (!resOrgName) throw resFail(400, 'Organisation name cannot be empty');
    const resType = resReq.user.role === 'restaurant' ? 'Restaurant'
      : ['NGO', 'Emergency Shelter', 'Community Kitchen'].includes(resO.org_type) ? resO.org_type : resOrg.org_type;
    await resQuery('UPDATE organisations SET org_name = ?, org_type = ?, address = ?, capacity = ?, zone = ? WHERE user_id = ?', [
      resOrgName.slice(0, 120), resType, String(resO.address ?? resOrg.address).slice(0, 200) || resZone,
      resToInt(resO.capacity) || resOrg.capacity, resZone, resId,
    ]);
  }

  if (resReq.user.role === 'volunteer' && resB.volunteer) {
    const resV = resB.volunteer;
    const resAvail = ['available', 'offline'].includes(resV.availability) ? resV.availability : null;
    if (resAvail) {
      const resActive = await resOne("SELECT id FROM rescue_missions WHERE volunteer_id = ? AND status IN ('assigned','pickup','in_transit')", [resId]);
      if (resActive) throw resFail(409, 'Finish your current mission before changing availability');
    }
    await resQuery(`UPDATE volunteers SET skills = ? ${resAvail ? ', availability = ?' : ''} WHERE user_id = ?`, [
      String(resV.skills || 'First aid').slice(0, 200), ...(resAvail ? [resAvail] : []), resId,
    ]);
  }

  const resUser = await resMe(resId);
  resChanged('organisations');
  resChanged('missions');
  // name or zone may have changed - hand out a fresh token
  resRes.json({ user: resUser, token: resSignToken(resUser) });
}));

resExtraApi.post('/me/password', resRequireAuth(), resH(async (resReq, resRes) => {
  const { current: resCurrent, next: resNext } = resReq.body || {};
  if (!resCurrent || !resNext) throw resFail(400, 'Enter your current and new password');
  if (String(resNext).length < 6) throw resFail(400, 'New password must be at least 6 characters');
  const resRow = await resOne('SELECT password_hash FROM users WHERE id = ?', [resReq.user.id]);
  if (!resRow || !(await bcrypt.compare(String(resCurrent), resRow.password_hash))) throw resFail(401, 'Current password is wrong');
  await resQuery('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(String(resNext), 10), resReq.user.id]);
  resRes.json({ ok: true });
}));

// ================================================================== compliance report

const RES_SLA = { 1: 30, 2: 60, 3: 120, 4: 240 }; // minutes until the first allocation
const resMsOf = (resV) => new Date(String(resV).replace(' ', 'T') + (String(resV).includes('Z') ? '' : 'Z')).getTime();
const resRound1 = (resV) => Math.round(resV * 10) / 10;

function resPeriod(resQ) {
  const resIso = (resV) => (/^\d{4}-\d{2}-\d{2}$/.test(String(resV || '')) ? String(resV) : null);
  const resToDay = resIso(resQ.to) || new Date().toISOString().slice(0, 10);
  const resFromDay = resIso(resQ.from) || new Date(Date.parse(resToDay) - 6 * 86400000).toISOString().slice(0, 10);
  return {
    from: resFromDay, to: resToDay,
    resFromSql: `${resFromDay} 00:00:00`, resToSql: `${resToDay} 23:59:59`,
    resFromMs: Date.parse(`${resFromDay}T00:00:00Z`), resToMs: Date.parse(`${resToDay}T23:59:59Z`),
  };
}

async function resComplianceReport(resQ) {
  const resP = resPeriod(resQ);
  const resRange = [resP.resFromSql, resP.resToSql];
  const resItems = await resQuery(
    `SELECT 'case' AS kind, id, process_id, priority, zone, status, created_at, fulfilled_at FROM emergency_cases WHERE created_at BETWEEN ? AND ?
     UNION ALL
     SELECT 'request', id, process_id, priority, zone, status, created_at, fulfilled_at FROM resource_requests WHERE created_at BETWEEN ? AND ?`,
    [...resRange, ...resRange]
  );
  const resMissions = await resQuery('SELECT * FROM rescue_missions');
  const resFirst = new Map();
  for (const resM of resMissions) {
    const resK = `${resM.kind}:${resM.target_id}`;
    const resT = Number(resM.started_at);
    if (!resFirst.has(resK) || resT < resFirst.get(resK)) resFirst.set(resK, resT);
  }

  const resByPriority = [1, 2, 3, 4].map((resPr) => {
    const resList = resItems.filter((resI) => Number(resI.priority) === resPr);
    const resServed = resList.filter((resI) => resFirst.has(`${resI.kind}:${resI.id}`));
    const resWaits = resServed.map((resI) => Math.max(0, (resFirst.get(`${resI.kind}:${resI.id}`) - resMsOf(resI.created_at)) / 60000));
    const resMet = resWaits.filter((resW) => resW <= RES_SLA[resPr]).length;
    const resDone = resList.filter((resI) => resI.status === 'fulfilled' && resI.fulfilled_at);
    const resFulfil = resDone.map((resI) => Math.max(0, (resMsOf(resI.fulfilled_at) - resMsOf(resI.created_at)) / 60000));
    return {
      priority: resPr, logged: resList.length, served: resServed.length, fulfilled: resDone.length, open: resList.length - resDone.length,
      slaMinutes: RES_SLA[resPr],
      avgFirstAllocation: resWaits.length ? resRound1(resWaits.reduce((resA, resB) => resA + resB, 0) / resWaits.length) : null,
      avgFulfilment: resFulfil.length ? resRound1(resFulfil.reduce((resA, resB) => resA + resB, 0) / resFulfil.length) : null,
      slaMetPct: resServed.length ? Math.round((100 * resMet) / resServed.length) : null,
    };
  });

  const resStock = await resQuery('SELECT zone, resource_type, available, allocated FROM resources');
  const resGiven = resMissions.filter((resM) => Number(resM.started_at) >= resP.resFromMs && Number(resM.started_at) <= resP.resToMs);
  const resAdded = await resQuery(
    "SELECT zone, resource_type, SUM(new_value - old_value) AS added FROM audit_logs WHERE action = 'STOCK_ADDED' AND created_at BETWEEN ? AND ? GROUP BY zone, resource_type",
    resRange
  );
  const resByZone = RES_ZONES.map((resZ) => ({
    zone: resZ,
    open: resItems.filter((resI) => resI.zone === resZ && resI.status !== 'fulfilled').length,
    resources: RES_TYPES.map((resT) => {
      const resS = resStock.find((resX) => resX.zone === resZ && resX.resource_type === resT) || {};
      return {
        type: resT,
        given: resGiven.filter((resM) => resM.zone === resZ).reduce((resA, resM) => resA + Number(resM[resT] || 0), 0),
        added: Number(resAdded.find((resA) => resA.zone === resZ && resA.resource_type === resT)?.added || 0),
        available: Number(resS.available || 0),
      };
    }),
  }));

  const resFood = await resQuery('SELECT status, servings FROM surplus_food WHERE created_at BETWEEN ? AND ?', resRange);
  const resSum = (resList) => resList.reduce((resA, resF) => resA + Number(resF.servings), 0);
  const resSurplus = {
    posted: resFood.length, servings: resSum(resFood),
    rescued: resSum(resFood.filter((resF) => RES_DONE_FOOD.includes(resF.status))),
    expired: resSum(resFood.filter((resF) => resF.status === 'expired')),
    inProgress: resSum(resFood.filter((resF) => ['available', 'reserved', 'picked_up'].includes(resF.status))),
  };

  const resVolunteers = await resQuery(
    `SELECT u.id, u.name, COUNT(m.id) AS missions,
            SUM(CASE WHEN m.status = 'completed' THEN 1 ELSE 0 END) AS completed, r.avg_rating
     FROM users u JOIN rescue_missions m ON m.volunteer_id = u.id
     LEFT JOIN v_user_ratings r ON r.user_id = u.id
     WHERE m.created_at BETWEEN ? AND ? GROUP BY u.id, u.name, r.avg_rating ORDER BY completed DESC`,
    resRange
  );
  const resFb = await resQuery('SELECT rating FROM feedback WHERE created_at BETWEEN ? AND ?', resRange);
  const resAudit = await resQuery('SELECT action, COUNT(*) AS n FROM audit_logs WHERE created_at BETWEEN ? AND ? GROUP BY action ORDER BY n DESC', resRange);
  const resTxns = await resOne('SELECT COUNT(DISTINCT txn_id) AS n FROM audit_logs WHERE txn_id IS NOT NULL AND created_at BETWEEN ? AND ?', resRange);

  // ledger check: what the stock table says was given == what the missions add up to
  const resLedgerBad = resStock.filter((resS) => {
    const resSumZone = resMissions.filter((resM) => resM.zone === resS.zone).reduce((resA, resM) => resA + Number(resM[resS.resource_type] || 0), 0);
    return Number(resS.allocated) !== resSumZone || Number(resS.available) < 0;
  }).length;

  const resLastBackup = resLastBackupAt();
  const resServedAll = resByPriority.reduce((resA, resR) => resA + resR.served, 0);
  const resMetAll = resByPriority.reduce((resA, resR) => resA + (resR.slaMetPct === null ? 0 : Math.round((resR.slaMetPct * resR.served) / 100)), 0);

  const resChecks = [
    { name: 'P1 cases allocated within 30 minutes', ok: resByPriority[0].slaMetPct === null || resByPriority[0].slaMetPct >= 90,
      detail: resByPriority[0].slaMetPct === null ? 'no P1 cases served in this period' : `${resByPriority[0].slaMetPct}% within target (goal 90%)` },
    { name: 'No open P1 cases', ok: resByPriority[0].open === 0, detail: `${resByPriority[0].open} open` },
    { name: 'Stock ledger balances', ok: resLedgerBad === 0, detail: resLedgerBad ? `${resLedgerBad} stock row(s) do not match the missions` : 'every stock row matches the missions' },
    { name: 'No stock below zero', ok: !resStock.some((resS) => Number(resS.available) < 0), detail: 'checked by trigger trg_resource_underflow' },
    { name: 'Backup in the last 24 hours', ok: Boolean(resLastBackup && Date.now() - Date.parse(resLastBackup) < 86400000),
      detail: resLastBackup ? `last backup ${resLastBackup.slice(0, 16).replace('T', ' ')} UTC` : 'no backup yet' },
    { name: 'Surplus food not wasted', ok: resSurplus.expired === 0, detail: `${resSurplus.expired} servings expired` },
  ];

  return {
    period: { from: resP.from, to: resP.to },
    generatedAt: new Date().toISOString(),
    engine: resDbState.resEngine,
    summary: {
      logged: resItems.length,
      fulfilled: resItems.filter((resI) => resI.status === 'fulfilled').length,
      open: resItems.filter((resI) => resI.status !== 'fulfilled').length,
      slaMetPct: resServedAll ? Math.round((100 * resMetAll) / resServedAll) : null,
      missions: resGiven.length,
      transactions: Number(resTxns?.n || 0),
      avgRating: resFb.length ? resRound1(resFb.reduce((resA, resF) => resA + Number(resF.rating), 0) / resFb.length) : null,
      ratings: resFb.length,
      lowRatings: resFb.filter((resF) => Number(resF.rating) <= 2).length,
    },
    checks: resChecks,
    byPriority: resByPriority,
    byZone: resByZone,
    surplus: resSurplus,
    volunteers: resVolunteers.map((resV) => ({ name: resV.name, missions: Number(resV.missions), completed: Number(resV.completed), avgRating: resV.avg_rating === null ? null : Number(resV.avg_rating) })),
    audit: resAudit.map((resA) => ({ action: resA.action, count: Number(resA.n) })),
  };
}

resExtraApi.get('/reports/compliance', resRequireAuth('admin'), resH(async (resReq, resRes) => {
  resRes.json(await resComplianceReport(resReq.query));
}));

resExtraApi.get('/reports/compliance.csv', resRequireAuth('admin'), resH(async (resReq, resRes) => {
  const resR = await resComplianceReport(resReq.query);
  const resCell = (resV) => {
    const resS = resV === null || resV === undefined ? '' : String(resV);
    return /[",\n]/.test(resS) ? `"${resS.replace(/"/g, '""')}"` : resS;
  };
  const resLines = [];
  const resRow = (...resCells) => resLines.push(resCells.map(resCell).join(','));
  resRow('ResQSync compliance report', `${resR.period.from} to ${resR.period.to}`, `generated ${resR.generatedAt}`);
  resRow();
  resRow('Check', 'Status', 'Detail');
  resR.checks.forEach((resC) => resRow(resC.name, resC.ok ? 'PASS' : 'FAIL', resC.detail));
  resRow();
  resRow('Priority', 'Logged', 'Served', 'Fulfilled', 'Open', 'SLA (min)', 'Avg first allocation (min)', 'Avg fulfilment (min)', 'SLA met %');
  resR.byPriority.forEach((resP) => resRow(`P${resP.priority}`, resP.logged, resP.served, resP.fulfilled, resP.open, resP.slaMinutes, resP.avgFirstAllocation, resP.avgFulfilment, resP.slaMetPct));
  resRow();
  resRow('Zone', 'Resource', 'Given', 'Added', 'Available now');
  resR.byZone.forEach((resZ) => resZ.resources.forEach((resX) => resRow(resZ.zone, resX.type, resX.given, resX.added, resX.available)));
  resRow();
  resRow('Surplus posted', 'Servings', 'Rescued', 'Expired', 'In progress');
  resRow(resR.surplus.posted, resR.surplus.servings, resR.surplus.rescued, resR.surplus.expired, resR.surplus.inProgress);
  resRow();
  resRow('Volunteer', 'Missions', 'Completed', 'Avg rating');
  resR.volunteers.forEach((resV) => resRow(resV.name, resV.missions, resV.completed, resV.avgRating));
  resRow();
  resRow('Audit action', 'Count');
  resR.audit.forEach((resA) => resRow(resA.action, resA.count));
  resRes.set('Content-Type', 'text/csv; charset=utf-8');
  resRes.set('Content-Disposition', `attachment; filename="resqsync-compliance-${resR.period.from}-to-${resR.period.to}.csv"`);
  resRes.send(resLines.join('\n'));
}));

// ================================================================== expired-food archive

resExtraApi.get('/surplus/archive', resRequireAuth('admin', 'restaurant'), resH(async (resReq, resRes) => {
  resRes.json(await resArchiveSummary(resReq.user.role === 'restaurant' ? resReq.user.id : null));
}));

// all = true moves every expired donation now; otherwise only those expired ARCHIVE_AFTER_HOURS ago
resExtraApi.post('/admin/archive-expired', resRequireAuth('admin'), resH(async (resReq, resRes) => {
  resRes.json(await resArchiveExpired(resReq.user.name, resReq.body?.all !== false));
}));

// ================================================================== backup & recovery

resExtraApi.get('/admin/backups', resRequireAuth('admin'), resH(async (_resReq, resRes) => {
  resRes.json({ backups: resListBackups(), everyHours: resConfig.resBackup.resEveryHours, keep: resConfig.resBackup.resKeep, folder: resConfig.resBackup.resDir });
}));

resExtraApi.post('/admin/backups', resRequireAuth('admin'), resH(async (resReq, resRes) => {
  const resMeta = await resCreateBackup(resReq.user.name);
  resSyncLog('info', `${resReq.user.name} created backup ${resMeta.file}`);
  resChanged('ledger');
  resRes.status(201).json(resMeta);
}));

resExtraApi.get('/admin/backups/:file', resRequireAuth('admin'), resH(async (resReq, resRes) => {
  resRes.download(resBackupPath(resReq.params.file));
}));

resExtraApi.post('/admin/backups/upload', resRequireAuth('admin'), resH(async (resReq, resRes) => {
  resRes.status(201).json(resSaveUploaded(resReq.body));
}));

resExtraApi.post('/admin/backups/:file/restore', resRequireAuth('admin'), resH(async (resReq, resRes) => {
  const resOut = await resRestoreBackup(resReq.params.file, resReq.user.name);
  await resNotify('admin', null, 'alert', 'Database restored', `${resReq.user.name} restored ${resReq.params.file}. A safety copy was saved first.`);
  resRes.json(resOut);
}));

