// The allocator - this is where process synchronization happens.
//
// Every emergency case / NGO request is a "process". It's a bounded-buffer
// producer / consumer setup:
//
//   producers  : "Allocate by priority" (releases pending ones, P1 first),
//                a request woken up after a restock, auto mode
//   buffer     : ready queue with N slots, always served by priority (+ aging)
//   consumers  : W allocator workers running side by side
//
//   resEmpty (semaphore, N)   free slots
//   resFull  (semaphore, 0)   items waiting in the queue
//   resQueueMutex             guards the queue array
//   resZoneMutex[zone]        one worker at a time inside a zone's stock
//   resStockCond[zone]        out-of-stock requests sleep here until restock
//
// Inside the zone lock the worker runs ONE ACID transaction
// (sp_AllocateEmergencyResources on MySQL) that locks the stock rows,
// gives MIN(needed, available) and counts the request down.
//
// No deadlock: a worker holds only one zone lock and lets go of it before it
// waits (no hold-and-wait), and the DB always locks rows in the same order.

import { resConfig, RES_ZONES } from './resConfig.js';
import { resQuery, resOne, resAllocate } from './resDb.js';
import { ResMutex, ResSemaphore, ResCondition } from './resSync.js';
import { resSyncLog, resChanged } from './resMonitor.js';
import { resNotify } from './resRecords.js';

const { resWorkers: RES_WORKER_COUNT, resBufferSize, resWorkDelayMs, resAgingMs } = resConfig.resAllocator;
let resAutoMode = resConfig.resAllocator.resAuto;

const resReadyQueue = [];
const resQueueMutex = new ResMutex('ready-queue');
const resEmpty = new ResSemaphore('empty', resBufferSize);
const resFull = new ResSemaphore('full', 0);
const resZoneMutex = Object.fromEntries(RES_ZONES.map((resZ) => [resZ, new ResMutex(resZ)]));
const resStockCond = Object.fromEntries(RES_ZONES.map((resZ) => [resZ, new ResCondition(resZ)]));
const resBlocked = Object.fromEntries(RES_ZONES.map((resZ) => [resZ, new Map()]));
const resInFlight = new Set();   // keys inside the allocator (queue, worker or blocked)
const resLive = new Map();       // key -> item, used for aging
const resWorkerList = [];
const resTrace = [];             // execution trace for the Gantt chart
let resRun = null;
let resRunSeq = 0;

const resSleep = (resMs) => new Promise((resR) => setTimeout(resR, resMs));
const resKeyOf = (resKind, resId) => `${resKind}:${resId}`;

function resParseTime(resValue) {
  if (!resValue) return Date.now();
  const resMs = new Date(String(resValue).replace(' ', 'T') + 'Z').getTime();
  return Number.isFinite(resMs) ? resMs : Date.now();
}

function resUntrack(resKey) {
  resInFlight.delete(resKey);
  resLive.delete(resKey);
}

// aging only counts time spent waiting inside the allocator
function resEffectivePriority(resItem, resNow = Date.now()) {
  if (!resItem.resReadyAt) return resItem.resPriority;
  const resBoost = Math.floor((resNow - resItem.resReadyAt) / resAgingMs);
  return Math.max(1, resItem.resPriority - resBoost);
}

// 1) priority (with aging)  2) arrival time  3) id - so there's never a full tie
function resCompareItems(resA, resB, resNow = Date.now()) {
  return (
    resEffectivePriority(resA, resNow) - resEffectivePriority(resB, resNow) ||
    resA.resCreatedAt - resB.resCreatedAt ||
    (resA.resKind === resB.resKind ? 0 : resA.resKind === 'case' ? -1 : 1) ||
    resA.resId - resB.resId
  );
}

function resItemFromRow(resRow) {
  return {
    resKey: resKeyOf(resRow.kind, resRow.id),
    resKind: resRow.kind,
    resId: Number(resRow.id),
    resPid: resRow.process_id,
    resTitle: resRow.title,
    resZone: resRow.zone,
    resPriority: Number(resRow.priority),
    resCreatedAt: resParseTime(resRow.created_at),
  };
}

// ------------------------------------------------------------------ run table (Ready queue panel)

function resNewRun(resWho) {
  resRun = { resId: ++resRunSeq, resBy: resWho, resStartedAt: Date.now(), resExecuted: 0, resItems: new Map() };
}

function resRunItem(resItem) {
  if (!resRun) resNewRun('auto');
  let resIt = resRun.resItems.get(resItem.resKey);
  if (!resIt) {
    resIt = {
      key: resItem.resKey, kind: resItem.resKind, id: resItem.resId, pid: resItem.resPid, title: resItem.resTitle,
      priority: resItem.resPriority, zone: resItem.resZone, slot: resRun.resItems.size + 1, rounds: [],
    };
    resRun.resItems.set(resItem.resKey, resIt);
  }
  return resIt;
}

let resViewTimer = null;
function resBumpView() {
  if (resViewTimer) return;
  resViewTimer = setTimeout(() => {
    resViewTimer = null;
    resChanged('sync');
  }, 60);
}

function resSetState(resItem, resState, resExtra = {}) {
  Object.assign(resRunItem(resItem), { state: resState, ...resExtra });
  resBumpView();
}

// ------------------------------------------------------------------ queue

function resTakeHighest() {
  const resNow = Date.now();
  let resBest = 0;
  for (let resI = 1; resI < resReadyQueue.length; resI++) {
    if (resCompareItems(resReadyQueue[resI], resReadyQueue[resBest], resNow) < 0) resBest = resI;
  }
  return resReadyQueue.splice(resBest, 1)[0];
}

// PRODUCER: blocks while the queue is full
async function resProduce(resItem, resBy) {
  await resEmpty.resWait();                // P(empty)
  await resQueueMutex.resLock(resBy);
  resReadyQueue.push(resItem);
  resSetState(resItem, 'ready', { worker: null, effective: resEffectivePriority(resItem) });
  resQueueMutex.resUnlock();
  resFull.resSignal();                     // V(full)
  resSyncLog('info', `${resBy} put ${resItem.resPid} (P${resItem.resPriority}, ${resItem.resZone}) in the ready queue`);
  resChanged('queue');
}

export function resSubmit(resRowOrItem, resBy = 'producer') {
  const resItem = resRowOrItem.resKey ? resRowOrItem : resItemFromRow(resRowOrItem);
  if (resInFlight.has(resItem.resKey)) return;
  resInFlight.add(resItem.resKey);
  resItem.resReadyAt = resItem.resReadyAt ?? Date.now();
  resLive.set(resItem.resKey, resItem);
  resProduce(resItem, resBy).catch((resErr) => resSyncLog('error', `Could not queue ${resItem.resPid}: ${resErr.message}`));
}

const resFmt = (resO) =>
  ['food', 'water', 'medicine', 'cots', 'vehicles'].filter((resK) => Number(resO[resK]) > 0).map((resK) => `${resK} ${resO[resK]}`).join(', ');

// after COMMIT: tell the people involved (never inside the critical section)
async function resAfterAllocation(resItem, resResult) {
  if (resResult.resMissionId) {
    await resNotify('volunteer', null, 'info', `New delivery mission in ${resItem.resZone}`,
      `${resItem.resPid}: ${resFmt(resResult.resGiven)}. Claim it from Missions.`);
    if (resItem.resKind === 'request') {
      const resReq = await resOne('SELECT ngo_id FROM resource_requests WHERE id = ?', [resItem.resId]);
      if (resReq) {
        await resNotify('ngo', resReq.ngo_id, resResult.resStatus === 'fulfilled' ? 'success' : 'info',
          `${resItem.resPid} ${resResult.resStatus === 'fulfilled' ? 'fully allocated' : 'partly allocated'}`,
          `Allocated ${resFmt(resResult.resGiven)}. A volunteer will deliver it.`);
      }
    }
  }
  for (const resL of resResult.resLedger) {
    if (resL.after === 0) {
      await resNotify('admin', null, 'critical', `${resL.zone} is out of ${resL.type}`,
        `Requests in ${resL.zone} will wait until you add ${resL.type} on the Stock page.`);
    }
  }
}

// CONSUMER: one allocator worker
async function resWorkerLoop(resW) {
  for (;;) {
    resW.state = 'idle';
    resW.current = null;
    await resFull.resWait();               // P(full) - sleep until there is work

    await resQueueMutex.resLock(resW.name);
    const resItem = resTakeHighest();
    const resPickedAt = Date.now();
    resQueueMutex.resUnlock();
    resEmpty.resSignal();                  // V(empty)

    resW.state = 'locking';
    resW.current = resItem;
    resSetState(resItem, 'locking', { worker: resW.name });
    const resZm = resZoneMutex[resItem.resZone];
    if (resZm.resLocked) resSyncLog('wait', `${resW.name} waits for the ${resItem.resZone} lock (held by ${resZm.resOwner})`);
    await resZm.resLock(resW.name);
    const resStartedAt = Date.now();
    resSyncLog('lock', `${resW.name} entered the ${resItem.resZone} critical section for ${resItem.resPid}`);
    resW.state = 'running';
    resSetState(resItem, 'running', { worker: resW.name, runningSince: resStartedAt, runFor: resWorkDelayMs });

    let resParked = false;
    try {
      await resSleep(resWorkDelayMs); // pretend service (burst) time so you can watch it

      const resResult = await resAllocate(resItem, resW.name, { resPickedAt, resStartedAt });
      resW.handled += 1;

      if (resResult.resStatus !== 'gone') {
        const resIt = resRunItem(resItem);
        resRun.resExecuted += 1;
        const resOutcome = resResult.resStatus === 'fulfilled' ? 'fulfilled' : resResult.resMissionId ? 'partial' : 'waiting';
        resIt.rounds.push({ order: resRun.resExecuted, txnId: resResult.resTxnId, worker: resW.name, ledger: resResult.resLedger });
        resSetState(resItem, resOutcome === 'fulfilled' ? 'done' : resOutcome, { remaining: resResult.resRemaining });

        resTrace.push({
          id: resTrace.length ? resTrace[resTrace.length - 1].id + 1 : 1,
          run: resRun.resId, key: resItem.resKey, pid: resItem.resPid, title: resItem.resTitle,
          priority: resItem.resPriority, zone: resItem.resZone, worker: resW.name, txnId: resResult.resTxnId,
          pickedAt: resPickedAt, startedAt: resStartedAt, finishedAt: Date.now(), result: resOutcome,
          given: resResult.resGiven ? resFmt(resResult.resGiven) : '',
        });
        if (resTrace.length > 200) resTrace.shift();

        if (resResult.resLedger.length) {
          resSyncLog('alloc', `Txn #${resResult.resTxnId} COMMIT: ` +
            resResult.resLedger.map((resL) => `${resL.zone} ${resL.type} ${resL.before} - ${-resL.change} = ${resL.after}`).join('; '));
        }
        resAfterAllocation(resItem, resResult).catch(() => {});
        resChanged('stock');
      }

      if (resResult.resStatus === 'fulfilled') {
        resSyncLog('done', `${resItem.resPid} fulfilled - every quantity is 0, removed from the active list`);
        resUntrack(resItem.resKey);
      } else if (resResult.resStatus === 'gone') {
        resUntrack(resItem.resKey);
      } else {
        // not enough stock: sleep on the zone's condition variable.
        // resWait() lets go of the zone lock in the same step, so no wake-up is lost.
        resParked = true;
        resBlocked[resItem.resZone].set(resItem.resKey, resItem);
        resSyncLog('wait', `${resItem.resPid} blocked: ${resItem.resZone} is short of stock - waiting for restock`);
        resStockCond[resItem.resZone].resWait(resZm, resItem.resPid, resItem.resPriority, resItem.resId).then(() => {
          resSetState(resItem, 'woken');
          resBlocked[resItem.resZone].delete(resItem.resKey);
          resZm.resUnlock();
          resUntrack(resItem.resKey);
          resSubmit(resItem, `wake-up(${resItem.resPid})`);
        });
      }
    } catch (resErr) {
      resSyncLog('error', `${resW.name} failed on ${resItem.resPid}: ${resErr.message}`);
      resUntrack(resItem.resKey);
    } finally {
      if (!resParked) resZm.resUnlock();
      resSyncLog('lock', `${resW.name} left the ${resItem.resZone} critical section`);
      resChanged('queue');
    }
  }
}

/** stock came in (restock / donation): hold the zone lock, add it, wake everyone waiting there */
export async function resReplenishZone(resZone, resWho, resFn) {
  const resZm = resZoneMutex[resZone];
  await resZm.resLock(resWho);
  resSyncLog('lock', `${resWho} entered the ${resZone} critical section to add stock`);
  try {
    const resResult = await resFn();
    const resWoken = resStockCond[resZone].resBroadcast();
    if (resWoken) resSyncLog('wake', `${resWho} signalled ${resZone}: ${resWoken} blocked request(s) woken, P1 first`);
    return resResult;
  } finally {
    resZm.resUnlock();
    resChanged('stock');
  }
}

// ------------------------------------------------------------------ admin controls

export function resIsAuto() {
  return resAutoMode;
}

export async function resSetAuto(resOn, resWho) {
  resAutoMode = Boolean(resOn);
  resSyncLog('info', `${resWho} switched automatic allocation ${resAutoMode ? 'on' : 'off'}`);
  resChanged('queue');
  return resAutoMode ? resReleasePending(resWho) : 0;
}

/** releases every pending (and stranded waiting) case/request in scheduling order */
export async function resReleasePending(resWho) {
  const resRows = await resQuery("SELECT * FROM v_priority_queue WHERE status IN ('pending','waiting')");
  const resNow = Date.now();
  const resTodo = resRows
    .map(resItemFromRow)
    .filter((resItem) => !resInFlight.has(resItem.resKey))
    .sort((resA, resB) => resCompareItems(resA, resB, resNow));
  if (resTodo.length) {
    resNewRun(resWho);
    for (const resZ of RES_ZONES) for (const resIt of resBlocked[resZ].values()) resSetState(resIt, 'waiting');
    resSyncLog('info', `${resWho} ran the allocation: ${resTodo.length} process(es) released in priority order`);
  }
  resTodo.forEach((resItem) => resSubmit(resItem, resWho));
  return resTodo.length;
}

/** where a row is inside the allocator, for the UI */
export function resStageOf(resRow) {
  const resKey = resKeyOf(resRow.kind, resRow.id);
  if (resBlocked[resRow.zone]?.has(resKey)) return 'waiting';
  if (resInFlight.has(resKey)) return 'scheduled';
  return resRow.status === 'waiting' ? 'waiting' : 'pending';
}

export function resIsQueued(resRow) {
  return resInFlight.has(resKeyOf(resRow.kind, resRow.id));
}

export function resEffectiveOf(resRow, resNow = Date.now()) {
  const resItem = resLive.get(resKeyOf(resRow.kind, resRow.id)) || resItemFromRow(resRow);
  return resEffectivePriority(resItem, resNow);
}

export function resCompareRows(resA, resB, resNow = Date.now()) {
  const resPick = (resRow) => resLive.get(resKeyOf(resRow.kind, resRow.id)) || resItemFromRow(resRow);
  return resCompareItems(resPick(resA), resPick(resB), resNow);
}

export function resTraceList() {
  return resTrace.slice();
}

export function resClearTrace() {
  resTrace.length = 0;
}

export function resSyncSnapshot() {
  const resNow = Date.now();
  return {
    config: { workers: RES_WORKER_COUNT, bufferSize: resBufferSize, workDelayMs: resWorkDelayMs, agingMs: resAgingMs, auto: resAutoMode },
    workers: resWorkerList.map((resW) => ({
      name: resW.name,
      state: resW.state,
      handled: resW.handled,
      current: resW.current ? { pid: resW.current.resPid, zone: resW.current.resZone, priority: resW.current.resPriority } : null,
    })),
    readyQueue: [...resReadyQueue]
      .sort((resA, resB) => resCompareItems(resA, resB, resNow))
      .map((resI) => ({ pid: resI.resPid, zone: resI.resZone, priority: resI.resPriority, effective: resEffectivePriority(resI, resNow) })),
    semaphores: [resEmpty.resSnapshot(), resFull.resSnapshot()],
    mutexes: [resQueueMutex.resSnapshot(), ...RES_ZONES.map((resZ) => resZoneMutex[resZ].resSnapshot())],
    blocked: RES_ZONES.map((resZ) => ({ zone: resZ, requests: [...resBlocked[resZ].values()].map((resI) => resI.resPid) })),
    run: resRun && { id: resRun.resId, by: resRun.resBy, startedAt: resRun.resStartedAt, items: [...resRun.resItems.values()] },
  };
}

export async function resStartAllocator() {
  for (let resI = 1; resI <= RES_WORKER_COUNT; resI++) {
    const resW = { name: `Worker-${resI}`, state: 'idle', current: null, handled: 0 };
    resWorkerList.push(resW);
    resWorkerLoop(resW);
  }
  resSyncLog('info', `Allocator started: ${RES_WORKER_COUNT} workers, ready queue of ${resBufferSize}`);

  // things that were already being served before a restart carry on;
  // pending ones wait for the admin (unless auto mode is on)
  const resRows = await resQuery(
    `SELECT * FROM v_priority_queue WHERE status = 'waiting' ${resAutoMode ? "OR status = 'pending'" : ''}`
  );
  const resNow = Date.now();
  resRows.map(resItemFromRow).sort((resA, resB) => resCompareItems(resA, resB, resNow)).forEach((resItem) => resSubmit(resItem, 'startup'));
}
