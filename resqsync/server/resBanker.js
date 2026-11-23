// Banker's algorithm on the real vehicle fleet (deadlock AVOIDANCE).
//
// Food, water and medicine are used up. Vehicles are different: a truck goes out
// with a mission and comes back to the depot when the mission is completed.
// So vehicles are a REUSABLE resource with a fixed number of instances per zone,
// exactly the textbook setting for the Banker's algorithm.
//
// Worst case we plan for: a rescue convoy keeps the vehicles it has until it has
// all it needs (hold and wait). Two half-filled convoys could then wait for each
// other forever -> deadlock. Before a worker hands out vehicles it asks:
//
//   "If I give these vehicles, is there still SOME order in which every open
//    case can get the rest of its vehicles and give them back?"   (safe state)
//
// Available  = vehicles parked at the depot
// Allocation = vehicles a case/request has out on the road
// Need       = vehicles it still needs = min(remaining, fleet - allocation)
//              (a case never needs more than the whole fleet at once; a bigger
//               order is simply served in more trips)
// Safe?      = repeat: find a process with Need <= Work, let it finish, Work += Allocation
//
// Unsafe -> the vehicles are NOT given now (the other supplies still are) and the
// case waits on the zone's condition variable until vehicles come back.

import { resQuery } from './resDb.js';
import { resChanged } from './resMonitor.js';

/**
 * Pure safety check (also used by the tests).
 * resProcs: [{ pid, alloc, remaining }], resAvailable: vehicles at the depot
 * returns { safe, sequence, rows }
 */
export function resBankerSafe(resProcs, resAvailable) {
  const resFleet = resAvailable + resProcs.reduce((resA, resP) => resA + resP.alloc, 0);
  const resRows = resProcs.map((resP) => ({
    pid: resP.pid,
    alloc: resP.alloc,
    need: Math.max(0, Math.min(resP.remaining, resFleet - resP.alloc)),
  }));
  let resWork = resAvailable;
  const resDone = new Set();
  const resSequence = [];
  let resProgress = true;
  while (resProgress) {
    resProgress = false;
    for (const resR of resRows) {
      if (resDone.has(resR.pid) || resR.need > resWork) continue;
      resWork += resR.alloc; // it finishes and its vehicles come back
      resDone.add(resR.pid);
      resSequence.push(resR.pid);
      resProgress = true;
    }
  }
  return { safe: resDone.size === resRows.length, sequence: resSequence, rows: resRows, fleet: resFleet };
}

/**
 * Pretend to grant resGrant vehicles to resPid, then run the safety check.
 */
export function resBankerTry(resProcs, resAvailable, resPid, resGrant) {
  const resAfter = resProcs.map((resP) =>
    resP.pid === resPid ? { ...resP, alloc: resP.alloc + resGrant, remaining: resP.remaining - resGrant } : resP
  );
  return resBankerSafe(resAfter, resAvailable - resGrant);
}

const resDecisions = [];

export function resBankerLog() {
  return resDecisions;
}

/** current fleet state of one zone, read while the worker holds the zone lock */
export async function resFleetState(resZone) {
  const [resStock] = await resQuery("SELECT available FROM resources WHERE zone = ? AND resource_type = 'vehicles'", [resZone]);
  const resOpen = await resQuery(
    `SELECT 'case' AS kind, id, process_id, vehicles FROM emergency_cases WHERE zone = ? AND status <> 'fulfilled' AND vehicles > 0
     UNION ALL
     SELECT 'request' AS kind, id, process_id, vehicles FROM resource_requests WHERE zone = ? AND status <> 'fulfilled' AND vehicles > 0`,
    [resZone, resZone]
  );
  const resOut = await resQuery(
    `SELECT kind, target_id, MAX(process_id) AS process_id, SUM(vehicles) AS out_now FROM rescue_missions
     WHERE zone = ? AND vehicles > 0 AND vehicles_back = 0 GROUP BY kind, target_id`,
    [resZone]
  );
  const resProcs = new Map();
  for (const resR of resOpen) resProcs.set(`${resR.kind}:${resR.id}`, { pid: resR.process_id, alloc: 0, remaining: Number(resR.vehicles) });
  for (const resR of resOut) {
    const resKey = `${resR.kind}:${resR.target_id}`;
    const resP = resProcs.get(resKey) || { pid: resR.process_id, alloc: 0, remaining: 0 };
    resP.alloc = Number(resR.out_now);
    resProcs.set(resKey, resP);
  }
  return { resAvailable: Number(resStock?.available || 0), resProcs: [...resProcs.entries()].map(([resKey, resP]) => ({ key: resKey, ...resP })) };
}

/**
 * How many vehicles may this item get right now?  Called inside the zone's critical section.
 * returns { cap, decision|null }
 */
export async function resBankerCap(resItem, resWorker) {
  const { resAvailable, resProcs } = await resFleetState(resItem.resZone);
  const resMe = resProcs.find((resP) => resP.key === resItem.resKey);
  if (!resMe || resMe.remaining <= 0) return { cap: 0, decision: null };
  const resRequest = Math.min(resMe.remaining, resAvailable);
  if (resRequest <= 0) return { cap: 0, decision: null }; // nothing parked - plain wait

  const resCheck = resBankerTry(resProcs, resAvailable, resMe.pid, resRequest);
  const resDecision = {
    at: Date.now(), worker: resWorker, zone: resItem.resZone, pid: resMe.pid, request: resRequest,
    available: resAvailable, fleet: resCheck.fleet, safe: resCheck.safe, sequence: resCheck.sequence,
    rows: resProcs.map((resP) => ({ pid: resP.pid, alloc: resP.alloc, remaining: resP.remaining })),
  };
  resDecisions.unshift(resDecision);
  if (resDecisions.length > 25) resDecisions.pop();
  resChanged('banker');
  return { cap: resCheck.safe ? resRequest : 0, decision: resDecision };
}
