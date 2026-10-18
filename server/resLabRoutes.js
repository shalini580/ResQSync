// OS lab (C kernel), DBMS lab and analytics - admin only.
import express from 'express';
import bcrypt from 'bcryptjs';
import { RES_ZONES, RES_TYPES } from './resConfig.js';
import { resQuery, resOne, resDescribeSchema, resAllocate, resClaimMission } from './resDb.js';
import { resRequireAuth } from './resAuth.js';
import { resRunKernel, resKernelState } from './resKernel.js';
import { resChanged, resSyncLog } from './resMonitor.js';

export const resLabApi = express.Router();
resLabApi.use(resRequireAuth('admin'));

const resH = (resFn) => (resReq, resRes) =>
  resFn(resReq, resRes).catch((resErr) => {
    if (!resErr.status) console.error(resErr);
    resRes.status(resErr.status || 500).json({ error: resErr.message || 'Something went wrong' });
  });
const resFail = (resStatus, resMsg) => Object.assign(new Error(resMsg), { status: resStatus });
const resInt = (resV, resDef = 0) => {
  const resN = parseInt(resV, 10);
  return Number.isFinite(resN) ? resN : resDef;
};
const resCleanName = (resV, resI) => String(resV || `P${resI}`).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 15) || `P${resI}`;
const resMs = (resV) => new Date(String(resV).replace(' ', 'T') + 'Z').getTime();

// ================================================================== OS lab

resLabApi.get('/lab/kernel', resH(async (_resReq, resRes) => {
  if (!resKernelState.resReady) {
    return resRes.json({ ok: false, error: resKernelState.resError, hint: 'Run "xcode-select --install" (Mac) or install gcc, then restart the server.' });
  }
  resRes.json({ ...(await resRunKernel(['status'])), compiler: resKernelState.resCompiler });
}));

// emergency cases + requests as a process table (PCB) for the scheduling lab
resLabApi.get('/lab/processes', resH(async (_resReq, resRes) => {
  const resRows = await resQuery(
    `SELECT * FROM (
       SELECT 'case' AS kind, process_id, title, priority, burst_time, status, created_at FROM emergency_cases
       UNION ALL
       SELECT 'request', process_id, title, priority, 20, status, created_at FROM resource_requests
     ) p ORDER BY created_at, process_id`
  );
  const resRecent = resRows.slice(-10);
  const resFirst = resRecent.length ? resMs(resRecent[0].created_at) : Date.now();
  const resStateOf = { pending: 'new', waiting: 'waiting', fulfilled: 'terminated' };
  resRes.json(resRecent.map((resR) => ({
    pid: resR.process_id,
    title: resR.title,
    kind: resR.kind,
    arrival: Math.max(0, Math.round((resMs(resR.created_at) - resFirst) / 60000)),
    burst: Number(resR.burst_time),
    priority: Number(resR.priority),
    state: resStateOf[resR.status] || 'ready',
  })));
}));

function resProcessInput(resList) {
  if (!Array.isArray(resList) || !resList.length) throw resFail(400, 'Add at least one process');
  const resSafe = resList.slice(0, 30).map((resP, resI) => ({
    pid: resCleanName(resP.pid, resI + 1),
    arrival: Math.max(0, resInt(resP.arrival)),
    burst: Math.max(1, resInt(resP.burst, 1)),
    priority: Math.min(9, Math.max(1, resInt(resP.priority, 2))),
  }));
  return `${resSafe.length}\n${resSafe.map((resP) => `${resP.pid} ${resP.arrival} ${resP.burst} ${resP.priority}`).join('\n')}\n`;
}

resLabApi.post('/lab/schedule', resH(async (resReq, resRes) => {
  const resAlgo = ['fcfs', 'sjf', 'srtf', 'priority', 'rr'].includes(resReq.body?.algo) ? resReq.body.algo : 'priority';
  const resQuantum = Math.max(1, resInt(resReq.body?.quantum, 2));
  resRes.json(await resRunKernel(['schedule', resAlgo, resQuantum], resProcessInput(resReq.body?.processes)));
}));

resLabApi.post('/lab/compare', resH(async (resReq, resRes) => {
  const resQuantum = Math.max(1, resInt(resReq.body?.quantum, 2));
  resRes.json(await resRunKernel(['compare', resQuantum], resProcessInput(resReq.body?.processes)));
}));

resLabApi.post('/lab/mutex', resH(async (resReq, resRes) => {
  resRes.json(await resRunKernel(['mutex', resInt(resReq.body?.threads, 4), resInt(resReq.body?.iterations, 20000)]));
}));

resLabApi.post('/lab/semaphore', resH(async (resReq, resRes) => {
  const resB = resReq.body || {};
  resRes.json(await resRunKernel(['semaphore', resInt(resB.producers, 2), resInt(resB.consumers, 2), resInt(resB.items, 4), resInt(resB.buffer, 3)]));
}));

// parent process = request desk, child process = allocator; they talk through two pipes
resLabApi.post('/lab/pipe', resH(async (resReq, resRes) => {
  const resZone = RES_ZONES.includes(resReq.body?.zone) ? resReq.body.zone : 'Zone A';
  const resStock = await resQuery("SELECT resource_type, available FROM resources WHERE zone = ? AND resource_type IN ('food','water')", [resZone]);
  const resFood = Number(resStock.find((resS) => resS.resource_type === 'food')?.available || 0);
  const resWater = Number(resStock.find((resS) => resS.resource_type === 'water')?.available || 0);
  let resReqs = await resQuery(
    "SELECT process_id, food, water FROM v_priority_queue WHERE zone = ? AND (food > 0 OR water > 0) ORDER BY priority, created_at",
    [resZone]
  );
  resReqs = resReqs.slice(0, 8);
  if (!resReqs.length) resReqs = [{ process_id: 'DEMO-1', food: 40, water: 30 }, { process_id: 'DEMO-2', food: 25, water: 60 }];
  const resInput = `${resFood} ${resWater} ${resReqs.length}\n${resReqs.map((resR) => `${resCleanName(resR.process_id)} ${resR.food} ${resR.water}`).join('\n')}\n`;
  resRes.json({ zone: resZone, ...(await resRunKernel(['pipe'], resInput)) });
}));

function resMatrixInput(resB, resWithMax) {
  const resNames = (resB.names || []).map(resCleanName);
  const resN = resNames.length;
  const resM = (resB.available || []).length;
  if (!resN || !resM || resN > 20 || resM > 8) throw resFail(400, 'Need 1-20 processes and 1-8 resource types');
  const resRow = (resV) => Array.from({ length: resM }, (_resX, resJ) => Math.max(0, resInt(resV?.[resJ]))).join(' ');
  const resRows = (resMat) => Array.from({ length: resN }, (_resX, resI) => resRow(resMat?.[resI])).join('\n');
  let resText = `${resN} ${resM}\n${resRow(resB.available)}\n`;
  if (resWithMax) {
    resText += `${resRows(resB.max)}\n${resRows(resB.allocation)}\n`;
    const resR = resB.request;
    resText += resR && resR.process >= 0 ? `1 ${resInt(resR.process)} ${resRow(resR.vector)}\n` : '0\n';
  } else {
    resText += `${resRows(resB.allocation)}\n${resRows(resB.request)}\n`;
    resText += `${Array.from({ length: resN }, (_resX, resI) => Math.max(1, resInt(resB.priority?.[resI], 2))).join(' ')}\n`;
  }
  return resText + resNames.join(' ') + '\n';
}

resLabApi.post('/lab/bankers', resH(async (resReq, resRes) => {
  resRes.json(await resRunKernel(['bankers'], resMatrixInput(resReq.body || {}, true)));
}));

resLabApi.post('/lab/deadlock', resH(async (resReq, resRes) => {
  resRes.json(await resRunKernel(['deadlock'], resMatrixInput(resReq.body || {}, false)));
}));

// Banker's data built from a real zone: max = what each case asked for, allocation = what it got
resLabApi.get('/lab/bankers/live', resH(async (resReq, resRes) => {
  const resZone = RES_ZONES.includes(resReq.query.zone) ? resReq.query.zone : 'Zone A';
  const resTypes = ['food', 'water', 'medicine'];
  const resStock = await resQuery('SELECT resource_type, available FROM resources WHERE zone = ?', [resZone]);
  const resOpen = (await resQuery('SELECT * FROM v_priority_queue WHERE zone = ?', [resZone])).slice(0, 8);
  const resGot = await resQuery(
    `SELECT kind, target_id, SUM(food) AS food, SUM(water) AS water, SUM(medicine) AS medicine
     FROM rescue_missions WHERE zone = ? GROUP BY kind, target_id`,
    [resZone]
  );
  const resGotMap = new Map(resGot.map((resG) => [`${resG.kind}:${resG.target_id}`, resG]));
  resRes.json({
    zone: resZone,
    resources: resTypes,
    names: resOpen.map((resO) => resO.process_id),
    available: resTypes.map((resT) => Number(resStock.find((resS) => resS.resource_type === resT)?.available || 0)),
    allocation: resOpen.map((resO) => resTypes.map((resT) => Number(resGotMap.get(`${resO.kind}:${resO.id}`)?.[resT] || 0))),
    max: resOpen.map((resO) => resTypes.map((resT) => Number(resO[resT]) + Number(resGotMap.get(`${resO.kind}:${resO.id}`)?.[resT] || 0))),
  });
}));

// ================================================================== DBMS lab

const RES_VIEWS = ['v_priority_queue', 'v_zone_stock', 'v_volunteer_leaderboard', 'v_mission_board'];

resLabApi.get('/dbms/schema', resH(async (_resReq, resRes) => {
  resRes.json(await resDescribeSchema());
}));

resLabApi.get('/dbms/view/:name', resH(async (resReq, resRes) => {
  if (!RES_VIEWS.includes(resReq.params.name)) throw resFail(404, 'Unknown view');
  resRes.json(await resQuery(`SELECT * FROM ${resReq.params.name} LIMIT 50`));
}));

// trigger test: try to set stock to -5, the trigger must refuse it
resLabApi.post('/dbms/test-underflow', resH(async (resReq, resRes) => {
  const resZone = RES_ZONES.includes(resReq.body?.zone) ? resReq.body.zone : 'Zone A';
  const resType = RES_TYPES.includes(resReq.body?.type) ? resReq.body.type : 'food';
  const resSql = 'SELECT available FROM resources WHERE zone = ? AND resource_type = ?';
  const resBefore = Number((await resOne(resSql, [resZone, resType])).available);
  let resMessage = null;
  try {
    await resQuery('UPDATE resources SET available = -5 WHERE zone = ? AND resource_type = ?', [resZone, resType]);
  } catch (resErr) {
    resMessage = resErr.sqlMessage || resErr.message;
  }
  const resAfter = Number((await resOne(resSql, [resZone, resType])).available);
  resRes.json({ zone: resZone, type: resType, before: resBefore, after: resAfter, blocked: Boolean(resMessage), message: resMessage });
}));

// call the allocation procedure directly on one pending case/request
resLabApi.post('/dbms/call-procedure', resH(async (resReq, resRes) => {
  const resKind = resReq.body?.kind === 'request' ? 'request' : 'case';
  const resRow = await resOne("SELECT * FROM v_priority_queue WHERE kind = ? AND id = ? AND status = 'pending'", [resKind, resInt(resReq.body?.id)]);
  if (!resRow) throw resFail(404, 'Pick a pending case or request');
  const resNow = Date.now();
  const resResult = await resAllocate(
    { resKind, resId: Number(resRow.id), resPid: resRow.process_id, resZone: resRow.zone, resPriority: Number(resRow.priority) },
    'DBMS lab', { resPickedAt: resNow, resStartedAt: resNow }
  );
  resSyncLog('alloc', `DBMS lab called the allocation procedure for ${resRow.process_id} (txn #${resResult.resTxnId})`);
  resChanged('queue');
  resChanged('stock');
  resRes.json({
    pid: resRow.process_id, txnId: resResult.resTxnId, status: resResult.resStatus,
    missionId: resResult.resMissionId, ledger: resResult.resLedger, remaining: resResult.resRemaining,
  });
}));

// real lock contention: N clients call sp_DispatchRescueMission on the same mission at once
async function resRaceVolunteers(resCount) {
  const resIds = [];
  const resHash = await bcrypt.hash('lab-only-' + Math.random(), 4);
  for (let resI = 1; resI <= resCount; resI++) {
    const resEmail = `race${resI}@lab.local`;
    let resU = await resOne('SELECT id FROM users WHERE email = ?', [resEmail]);
    if (!resU) {
      const resIns = await resQuery("INSERT INTO users (name, email, password_hash, role, zone) VALUES (?,?,?,'volunteer','Zone A')", [`Race client ${resI}`, resEmail, resHash]);
      await resQuery('INSERT INTO volunteers (user_id, skills) VALUES (?, ?)', [resIns.insertId, 'Lab test client']);
      resU = { id: resIns.insertId };
    }
    resIds.push(Number(resU.id));
  }
  return resIds;
}

resLabApi.post('/dbms/race/claim', resH(async (resReq, resRes) => {
  const resClients = Math.min(10, Math.max(2, resInt(resReq.body?.clients, 6)));
  const resVols = await resRaceVolunteers(resClients);
  const resAnyCase = await resOne('SELECT id FROM emergency_cases ORDER BY id LIMIT 1');
  const resNow = Date.now();
  const resIns = await resQuery(
    `INSERT INTO rescue_missions (kind, target_id, process_id, zone, worker, txn_id, picked_at, started_at, finished_at, result)
     VALUES ('case', ?, 'LAB-RACE', 'Zone A', 'DBMS lab', 0, ?, ?, ?, 'fulfilled')`,
    [resAnyCase?.id || 0, resNow, resNow, resNow]
  );
  const resStart = Date.now();
  const resResults = await Promise.all(resVols.map(async (resV, resI) => ({
    client: `Race client ${resI + 1}`,
    result: await resClaimMission(resIns.insertId, resV),
    ms: Date.now() - resStart,
  })));
  // clean up the test mission so the real data stays untouched
  await resQuery('DELETE FROM rescue_missions WHERE id = ?', [resIns.insertId]);
  await resQuery("UPDATE volunteers SET availability = 'available' WHERE user_id IN (" + resVols.map(() => '?').join(',') + ')', resVols);
  resRes.json({ clients: resClients, winners: resResults.filter((resR) => resR.result === 'OK').length, results: resResults });
}));

// ================================================================== analytics + City Health Score

resLabApi.get('/analytics', resH(async (_resReq, resRes) => {
  const resQueue = await resQuery(
    `SELECT 'case' AS kind, id, priority, status, created_at FROM emergency_cases
     UNION ALL SELECT 'request', id, priority, status, created_at FROM resource_requests`
  );
  const resStock = await resQuery('SELECT * FROM v_zone_stock');
  const resMissions = await resQuery('SELECT kind, target_id, status, started_at FROM rescue_missions');
  const resVols = await resQuery("SELECT v.availability FROM volunteers v JOIN users u ON u.id = v.user_id WHERE u.email NOT LIKE '%@lab.local'");
  const resFood = await resQuery('SELECT status, servings FROM surplus_food');

  const resByPriority = [1, 2, 3, 4].map((resP) => ({
    priority: resP,
    open: resQueue.filter((resQ) => Number(resQ.priority) === resP && resQ.status !== 'fulfilled').length,
    fulfilled: resQueue.filter((resQ) => Number(resQ.priority) === resP && resQ.status === 'fulfilled').length,
  }));

  // how long each case waited before its first allocation, grouped by priority
  const resFirstStart = new Map();
  for (const resM of resMissions) {
    const resKey = `${resM.kind}:${resM.target_id}`;
    const resT = Number(resM.started_at);
    if (!resFirstStart.has(resKey) || resT < resFirstStart.get(resKey)) resFirstStart.set(resKey, resT);
  }
  const resWait = [1, 2, 3, 4].map((resP) => {
    const resList = resQueue
      .filter((resQ) => Number(resQ.priority) === resP && resFirstStart.has(`${resQ.kind}:${resQ.id}`))
      .map((resQ) => Math.max(0, (resFirstStart.get(`${resQ.kind}:${resQ.id}`) - resMs(resQ.created_at)) / 60000));
    return { priority: resP, minutes: resList.length ? +(resList.reduce((resA, resB) => resA + resB, 0) / resList.length).toFixed(1) : 0, count: resList.length };
  });

  const resZones = RES_ZONES.map((resZ) => {
    const resRows = resStock.filter((resS) => resS.zone === resZ);
    return {
      zone: resZ,
      percent: Math.round(resRows.reduce((resA, resR) => resA + Number(resR.percent_left), 0) / Math.max(resRows.length, 1)),
      items: resRows.map((resR) => ({ type: resR.resource_type, available: Number(resR.available), allocated: Number(resR.allocated) })),
    };
  });

  const resMissionStatus = ['open', 'assigned', 'pickup', 'in_transit', 'delivered', 'completed'].map((resS) => ({
    status: resS, count: resMissions.filter((resM) => resM.status === resS).length,
  }));

  // City Health Score - weighted mix of four things the controller cares about
  const resOpen = resQueue.filter((resQ) => resQ.status !== 'fulfilled').length;
  const resDone = resQueue.length - resOpen;
  const resOpenP1 = resByPriority[0].open;
  const resStockScore = Math.round(resZones.reduce((resA, resZ) => resA + Math.min(100, resZ.percent), 0) / resZones.length);
  const resResolveScore = Math.round((100 * resDone) / Math.max(resQueue.length, 1));
  const resCriticalScore = Math.max(0, 100 - 20 * resOpenP1);
  const resVolScore = Math.round((100 * resVols.filter((resV) => resV.availability === 'available').length) / Math.max(resVols.length, 1));
  const resScore = Math.round(0.35 * resStockScore + 0.3 * resResolveScore + 0.2 * resCriticalScore + 0.15 * resVolScore);

  resRes.json({
    health: {
      score: resScore,
      label: resScore >= 80 ? 'Stable' : resScore >= 60 ? 'Under pressure' : 'Critical',
      parts: [
        { name: 'Stock left', weight: 35, value: resStockScore },
        { name: 'Cases resolved', weight: 30, value: resResolveScore },
        { name: 'Open P1 cases', weight: 20, value: resCriticalScore, note: `${resOpenP1} open` },
        { name: 'Volunteers free', weight: 15, value: resVolScore },
      ],
    },
    totals: {
      open: resOpen, fulfilled: resDone,
      missionsOpen: resMissionStatus[0].count, missionsCompleted: resMissionStatus[5].count,
      volunteers: resVols.length,
      surplusServings: resFood.reduce((resA, resF) => resA + Number(resF.servings), 0),
      surplusRescued: resFood.filter((resF) => ['delivered', 'added_to_stock'].includes(resF.status)).reduce((resA, resF) => resA + Number(resF.servings), 0),
      surplusExpired: resFood.filter((resF) => resF.status === 'expired').length,
    },
    byPriority: resByPriority,
    waitByPriority: resWait,
    zones: resZones,
    missionStatus: resMissionStatus,
  });
}));
