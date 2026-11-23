// Showcase features: Disaster Drill, crash recovery, Banker's on the live fleet,
// smart text reports, stock forecast, route planning (Dijkstra), index lab.
import express from 'express';
import { RES_ZONES } from './resConfig.js';
import { resQuery } from './resDb.js';
import { resRequireAuth } from './resAuth.js';
import { resCreateCase } from './resRecords.js';
import { resReleasePending } from './resAllocator.js';
import { resClampToZone } from './resGeo.js';
import { resChanged, resSyncLog } from './resMonitor.js';
import { resRunDrill, resDrillIncidents } from './resDrill.js';
import { resCrashTest } from './resCrash.js';
import { resBankerLog, resFleetState, resBankerSafe, resBankerTry } from './resBanker.js';
import { resParseReport } from './resParse.js';
import { resForecast, resForecastAlerts } from './resForecast.js';
import { resPlanRoute, resCityLayout, resToggleClosure, resClearClosures } from './resRoutePlan.js';
import { resIndexBench } from './resIndexLab.js';

export const resNewApi = express.Router();

const resH = (resFn) => (resReq, resRes) =>
  resFn(resReq, resRes).catch((resErr) => {
    if (!resErr.status) console.error(resErr);
    resRes.status(resErr.status || 500).json({ error: resErr.message || 'Something went wrong on the server' });
  });
const resFail = (resStatus, resMessage) => Object.assign(new Error(resMessage), { status: resStatus });

// ------------------------------------------------------------------ Disaster Drill

resNewApi.post('/drill/run', resRequireAuth('admin'), resH(async (resReq, resRes) => {
  resRes.json(resRunDrill(resReq.body || {}));
}));

// the first few drill incidents become REAL cases, handled by the real worker threads
resNewApi.post('/drill/live', resRequireAuth('admin'), resH(async (resReq, resRes) => {
  const resB = resReq.body || {};
  const resCount = Math.min(12, Math.max(3, parseInt(resB.count, 10) || 8));
  const resD = resDrillIncidents({ scenario: resB.scenario, zone: RES_ZONES.includes(resB.zone) ? resB.zone : 'Zone C', count: resCount, seed: Number(resB.seed) || Date.now() % 100000 });
  const resStamp = new Date().toISOString().slice(11, 16);
  const resMade = [];
  for (const resI of resD.incidents) {
    const [resX, resY] = resClampToZone(resI.zone, resI.x, resI.y);
    const resScale = Math.max(1, Math.round(resI.people / 10));
    const resOut = await resCreateCase({
      title: `Drill ${resStamp}: ${resD.scenario} ${resI.pid}`, case_type: resI.type, priority: resI.priority, zone: resI.zone,
      location: `Drill site ${resI.pid}`, loc_x: resX, loc_y: resY, people_affected: resI.people,
      food: resScale * 2, water: resScale * 3, medicine: Math.min(60, resI.medicine), cots: resI.priority <= 2 ? resScale : 0,
      vehicles: resI.priority === 1 ? 1 : 0, burst_time: 30, reported_by: resReq.user.id,
    });
    resMade.push({ ...resOut, priority: resI.priority, zone: resI.zone });
  }
  resSyncLog('info', `Live drill: ${resMade.length} ${resD.scenario.toLowerCase()} cases reported around ${resD.epicentre.zone}`);
  resChanged('queue');
  const resReleased = await resReleasePending(`Drill (${resReq.user.name})`);
  resRes.json({ ok: true, scenario: resD.scenario, created: resMade, released: resReleased });
}));

// ------------------------------------------------------------------ crash recovery

resNewApi.post('/admin/crash-test', resRequireAuth('admin'), resH(async (resReq, resRes) => {
  resRes.json(await resCrashTest(resReq.body || {}, resReq.user.name));
}));

// ------------------------------------------------------------------ Banker's on the live fleet

resNewApi.get('/banker/live', resRequireAuth('admin'), resH(async (_resReq, resRes) => {
  const resFleet = await resQuery(
    `SELECT r.zone, r.available,
            (SELECT COALESCE(SUM(m.vehicles), 0) FROM rescue_missions m WHERE m.zone = r.zone AND m.vehicles_back = 0) AS on_road,
            (SELECT COALESCE(SUM(q.vehicles), 0) FROM v_priority_queue q WHERE q.zone = r.zone) AS still_needed
     FROM resources r WHERE r.resource_type = 'vehicles' ORDER BY r.zone`
  );
  const resZones = [];
  for (const resF of resFleet) {
    const { resAvailable, resProcs } = await resFleetState(resF.zone);
    const resNow = resBankerSafe(resProcs, resAvailable);
    resZones.push({
      zone: resF.zone, available: Number(resF.available), onRoad: Number(resF.on_road), stillNeeded: Number(resF.still_needed),
      fleet: resNow.fleet, safe: resNow.safe, sequence: resNow.sequence,
      processes: resNow.rows.map((resR, resI) => ({ ...resR, remaining: resProcs[resI].remaining })),
    });
  }
  resRes.json({ zones: resZones, decisions: resBankerLog() });
}));

// "what if this process asked for N vehicles now?" - checked on the live fleet, nothing is changed
resNewApi.post('/banker/try', resRequireAuth('admin'), resH(async (resReq, resRes) => {
  const { zone: resZone, pid: resPid } = resReq.body || {};
  if (!RES_ZONES.includes(resZone)) throw resFail(400, 'Pick a zone');
  const resAmount = Math.max(1, parseInt(resReq.body?.amount, 10) || 1);
  const { resAvailable, resProcs } = await resFleetState(resZone);
  const resP = resProcs.find((resX) => resX.pid === resPid);
  if (!resP) throw resFail(404, 'That process has no vehicle need in this zone');
  if (resAmount > resAvailable) return resRes.json({ granted: false, reason: `Only ${resAvailable} vehicle(s) are at the depot - it has to wait` });
  if (resAmount > resP.remaining) return resRes.json({ granted: false, reason: `${resPid} only needs ${resP.remaining} more` });
  const resCheck = resBankerTry(resProcs, resAvailable, resPid, resAmount);
  return resRes.json({ granted: resCheck.safe, safe: resCheck.safe, sequence: resCheck.sequence, rows: resCheck.rows,
    reason: resCheck.safe ? `Safe: everyone can still finish in the order ${resCheck.sequence.join(' > ')}` : 'Unsafe: after this no order lets every convoy finish - the request must wait' });
}));

// ------------------------------------------------------------------ smart text report

resNewApi.post('/parse-report', resRequireAuth('admin', 'ngo'), resH(async (resReq, resRes) => {
  const resText = String(resReq.body?.text || '').slice(0, 1000);
  if (!resText.trim()) throw resFail(400, 'Type what happened first');
  resRes.json(resParseReport(resText));
}));

// ------------------------------------------------------------------ stock forecast

resNewApi.get('/forecast', resRequireAuth('admin'), resH(async (_resReq, resRes) => {
  resRes.json(await resForecast());
}));

resNewApi.post('/forecast/alerts', resRequireAuth('admin'), resH(async (_resReq, resRes) => {
  resRes.json({ sent: await resForecastAlerts() });
}));

// ------------------------------------------------------------------ route planning

resNewApi.get('/city/layout', resRequireAuth(), resH(async (_resReq, resRes) => {
  resRes.json(resCityLayout());
}));

resNewApi.get('/route', resRequireAuth(), resH(async (resReq, resRes) => {
  const resZone = String(resReq.query.zone || '');
  if (!RES_ZONES.includes(resZone)) throw resFail(400, 'Pick a zone');
  const resX = Number(resReq.query.x);
  const resY = Number(resReq.query.y);
  if (!Number.isFinite(resX) || !Number.isFinite(resY)) throw resFail(400, 'x and y (km) are needed');
  const [resCx, resCy] = resClampToZone(resZone, resX, resY);
  resRes.json(resPlanRoute(resZone, resCx, resCy));
}));

resNewApi.post('/admin/roads/toggle', resRequireAuth('admin'), resH(async (resReq, resRes) => {
  const resX = Number(resReq.body?.x);
  const resY = Number(resReq.body?.y);
  if (!Number.isFinite(resX) || !Number.isFinite(resY)) throw resFail(400, 'x and y (km) are needed');
  const resOut = resToggleClosure(resX, resY);
  resSyncLog('info', `${resReq.user.name} ${resOut.closed ? 'closed' : 'reopened'} roads near (${resX.toFixed(1)}, ${resY.toFixed(1)}) km`);
  resChanged('roads');
  resRes.json(resOut);
}));

resNewApi.post('/admin/roads/clear', resRequireAuth('admin'), resH(async (_resReq, resRes) => {
  resClearClosures();
  resChanged('roads');
  resRes.json({ ok: true });
}));

// ------------------------------------------------------------------ index lab

resNewApi.post('/dbms/index-bench', resRequireAuth('admin'), resH(async (resReq, resRes) => {
  resRes.json(await resIndexBench(resReq.body?.rows));
}));
