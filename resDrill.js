// Disaster Drill: the same disaster, replayed with different schedulers.
//
// A seeded random generator creates a burst of incidents around an epicentre
// (earthquake, flood or fire). A small pool of rescue teams (the "CPUs") serves
// them one at a time, non-preemptive. We replay the SAME incidents three times:
//
//   FCFS          first come, first served
//   Priority      P1 -> P4, with aging (the classic OS fix for starvation)
//   ResQSync      priority + aging + ML risk boost, and inside one priority level
//                 0.6 x risk + 0.4 x nearness to the depot (what the real allocator does)
//
// and compare waiting times and how many incidents were reached inside their
// target time (P1 30 min, P2 60, P3 120, P4 240). Discrete-event simulation:
// the clock jumps from event to event, so 2 hours of disaster run in milliseconds.

import { resRiskOf } from './resModel.js';
import { RES_ZONE_ORIGIN, RES_ZONE_SIZE, resDistanceKm, resProximity } from './resGeo.js';
import { resConfig } from './resConfig.js';

export const RES_DRILL_SLA = { 1: 30, 2: 60, 3: 120, 4: 240 };
export const RES_DRILL_POLICIES = ['fcfs', 'priority', 'resqsync'];
const RES_POLICY_NAME = { fcfs: 'FCFS', priority: 'Priority + aging', resqsync: 'ResQSync (priority + aging + ML + location)' };

const RES_SCENARIOS = {
  earthquake: { label: 'Earthquake', types: ['earthquake', 'earthquake', 'medical', 'fire', 'other'], p1: 0.3, spread: 0.6 },
  flood: { label: 'Flood', types: ['flood', 'flood', 'flood', 'medical', 'other'], p1: 0.2, spread: 0.9 },
  fire: { label: 'Industrial fire', types: ['fire', 'fire', 'medical', 'medical', 'other'], p1: 0.35, spread: 0.4 },
};

function resRng(resSeed) {
  let resA = resSeed >>> 0;
  return () => {
    resA = (resA + 0x6d2b79f5) >>> 0;
    let resT = resA;
    resT = Math.imul(resT ^ (resT >>> 15), resT | 1);
    resT ^= resT + Math.imul(resT ^ (resT >>> 7), resT | 61);
    return ((resT ^ (resT >>> 14)) >>> 0) / 4294967296;
  };
}

const resClamp = (resV, resLo, resHi) => Math.min(resHi, Math.max(resLo, resV));
const resRound = (resV, resD = 1) => Math.round(resV * 10 ** resD) / 10 ** resD;

/** the incidents of one drill (same seed -> same disaster) */
export function resDrillIncidents({ scenario = 'earthquake', zone = 'Zone C', count = 30, minutes = 60, seed = 7 } = {}) {
  const resSc = RES_SCENARIOS[scenario] || RES_SCENARIOS.earthquake;
  const resR = resRng(seed);
  const [resOx, resOy] = RES_ZONE_ORIGIN[zone] || RES_ZONE_ORIGIN['Zone C'];
  const resEx = resOx + 2 + resR() * 6; // epicentre inside the zone
  const resEy = resOy + 2 + resR() * 6;
  const resZones = Object.keys(RES_ZONE_ORIGIN);
  const resList = [];
  for (let resI = 0; resI < count; resI++) {
    // most reports come in the first minutes after the shock, then fewer
    const resArrival = resRound(minutes * resR() ** 1.8, 1);
    const resAngle = resR() * Math.PI * 2;
    const resDist = (resR() ** 0.7) * 9 * resSc.spread + resR() * 1.5;
    const resX = resClamp(resEx + Math.cos(resAngle) * resDist, 0.1, 19.9);
    const resY = resClamp(resEy + Math.sin(resAngle) * resDist, 0.1, 19.9);
    const resZone = resZones.find((resZ) => {
      const [resZx, resZy] = RES_ZONE_ORIGIN[resZ];
      return resX >= resZx && resX < resZx + RES_ZONE_SIZE && resY >= resZy && resY < resZy + RES_ZONE_SIZE;
    });
    // closer to the epicentre -> more serious
    const resSevere = 1 - resDist / 12;
    const resRoll = resR();
    const resPriority = resRoll < resSc.p1 * (0.6 + resSevere) ? 1 : resRoll < 0.55 ? 2 : resRoll < 0.82 ? 3 : 4;
    const resPeople = Math.round(5 + resR() ** 2 * 300 * (0.4 + resSevere));
    const resType = resSc.types[Math.floor(resR() * resSc.types.length)];
    resList.push({
      id: resI + 1, pid: `D-${String(resI + 1).padStart(2, '0')}`, type: resType, priority: resPriority, people: resPeople,
      arrival: resArrival, zone: resZone, x: resRound(resX, 2), y: resRound(resY, 2),
      distance: resRound(resDistanceKm(resZone, resX, resY), 2),
      medicine: resType === 'medical' ? 20 + Math.round(resR() * 30) : Math.round(resR() * 15),
    });
  }
  resList.sort((resA, resB) => resA.arrival - resB.arrival || resA.id - resB.id);
  return { epicentre: { x: resRound(resEx, 2), y: resRound(resEy, 2), zone }, scenario: resSc.label, incidents: resList };
}

/** on-site work + drive there and back (40 km/h -> 1.5 min per km, each way) */
export function resServiceMinutes(resInc) {
  return resRound(5 + Math.min(15, resInc.people / 30) + resInc.distance * 3, 1);
}

function resRiskAt(resInc, resNow) {
  return resRiskOf({
    priority: resInc.priority, case_type: resInc.type, people_affected: resInc.people,
    waitMin: Math.max(0, resNow - resInc.arrival), medicine: resInc.medicine,
  });
}

function resPicker(resPolicy, resAgingMin) {
  const { resRiskWeight: resWr, resDistanceWeight: resWd, resPromoteAt } = resConfig.resScheduler;
  const resAged = (resInc, resNow) => Math.floor(Math.max(0, resNow - resInc.arrival) / resAgingMin);
  if (resPolicy === 'fcfs') return (resA, resB) => resA.arrival - resB.arrival || resA.id - resB.id;
  if (resPolicy === 'priority') {
    return (resA, resB, resNow) =>
      Math.max(1, resA.priority - resAged(resA, resNow)) - Math.max(1, resB.priority - resAged(resB, resNow)) ||
      resA.arrival - resB.arrival || resA.id - resB.id;
  }
  // resqsync - same rules as the live allocator
  const resEff = (resInc, resNow) => {
    const resMl = resInc.priority > 1 && resRiskAt(resInc, resNow) >= resPromoteAt ? 1 : 0;
    return Math.max(1, resInc.priority - resAged(resInc, resNow) - resMl);
  };
  const resScore = (resInc, resNow) => resWr * resRiskAt(resInc, resNow) + resWd * resProximity(resInc.distance);
  return (resA, resB, resNow) =>
    resEff(resA, resNow) - resEff(resB, resNow) || resScore(resB, resNow) - resScore(resA, resNow) ||
    resA.arrival - resB.arrival || resA.id - resB.id;
}

/** non-preemptive multi-server simulation of one policy */
export function resSimulate(resIncidents, resPolicy, { teams = 4, agingMin = 30 } = {}) {
  const resCmp = resPicker(resPolicy, agingMin);
  const resTeamFree = Array.from({ length: teams }, () => 0);
  const resPending = [...resIncidents];
  const resReady = [];
  const resServed = [];
  let resNow = 0;
  while (resPending.length || resReady.length) {
    while (resPending.length && resPending[0].arrival <= resNow) resReady.push(resPending.shift());
    const resTeam = resTeamFree.indexOf(Math.min(...resTeamFree));
    if (!resReady.length || resTeamFree[resTeam] > resNow) {
      // nothing to do now: jump the clock to the next event
      const resNextArrival = resPending.length ? resPending[0].arrival : Infinity;
      const resNextFree = resReady.length ? resTeamFree[resTeam] : Infinity;
      resNow = Math.max(resNow, Math.min(resNextArrival, resNextFree));
      continue;
    }
    let resBest = 0;
    for (let resI = 1; resI < resReady.length; resI++) if (resCmp(resReady[resI], resReady[resBest], resNow) < 0) resBest = resI;
    const resInc = resReady.splice(resBest, 1)[0];
    const resStart = resNow;
    const resService = resServiceMinutes(resInc);
    // the team is back after the round trip; help ARRIVES after the drive out
    const resReach = resStart + resInc.distance * 1.5;
    resTeamFree[resTeam] = resStart + resService;
    resServed.push({
      id: resInc.id, pid: resInc.pid, team: resTeam + 1, start: resRound(resStart, 1), reach: resRound(resReach, 1),
      end: resRound(resStart + resService, 1), wait: resRound(resStart - resInc.arrival, 1),
      response: resRound(resReach - resInc.arrival, 1),
      onTime: resReach - resInc.arrival <= RES_DRILL_SLA[resInc.priority],
    });
  }
  return resServed;
}

function resMetrics(resIncidents, resServed) {
  const resById = new Map(resIncidents.map((resI) => [resI.id, resI]));
  const resAvg = (resArr) => (resArr.length ? resRound(resArr.reduce((resA, resB) => resA + resB, 0) / resArr.length, 1) : 0);
  const resP1 = resServed.filter((resS) => resById.get(resS.id).priority === 1);
  const resPeople = resServed.reduce((resA, resS) => resA + (resS.onTime ? resById.get(resS.id).people : 0), 0);
  const resAllPeople = resIncidents.reduce((resA, resI) => resA + resI.people, 0);
  const resByP = [1, 2, 3, 4].map((resP) => {
    const resL = resServed.filter((resS) => resById.get(resS.id).priority === resP);
    return { priority: resP, count: resL.length, avgResponse: resAvg(resL.map((resS) => resS.response)), onTime: resL.filter((resS) => resS.onTime).length };
  });
  return {
    avgWait: resAvg(resServed.map((resS) => resS.wait)),
    avgResponse: resAvg(resServed.map((resS) => resS.response)),
    p1AvgResponse: resAvg(resP1.map((resS) => resS.response)),
    p1Worst: resP1.length ? Math.max(...resP1.map((resS) => resS.response)) : 0,
    p1OnTime: resP1.filter((resS) => resS.onTime).length,
    p1Count: resP1.length,
    onTime: resServed.filter((resS) => resS.onTime).length,
    onTimePct: resRound((100 * resServed.filter((resS) => resS.onTime).length) / (resServed.length || 1), 0),
    peopleOnTime: resPeople,
    peoplePct: resRound((100 * resPeople) / (resAllPeople || 1), 0),
    finishedAt: resRound(Math.max(0, ...resServed.map((resS) => resS.end)), 1),
    byPriority: resByP,
  };
}

export function resRunDrill(resOpts = {}) {
  const resCount = Math.min(80, Math.max(5, parseInt(resOpts.count, 10) || 30));
  const resTeams = Math.min(10, Math.max(1, parseInt(resOpts.teams, 10) || 4));
  const resSeed = Number.isFinite(Number(resOpts.seed)) ? Number(resOpts.seed) : 7;
  const resAging = Math.min(120, Math.max(5, parseInt(resOpts.agingMin, 10) || 30));
  const resStart = performance.now();
  const resD = resDrillIncidents({
    scenario: resOpts.scenario, zone: RES_ZONE_ORIGIN[resOpts.zone] ? resOpts.zone : 'Zone C', count: resCount, seed: resSeed,
  });
  const resRuns = RES_DRILL_POLICIES.map((resP) => {
    const resServed = resSimulate(resD.incidents, resP, { teams: resTeams, agingMin: resAging });
    return { policy: resP, name: RES_POLICY_NAME[resP], served: resServed, metrics: resMetrics(resD.incidents, resServed) };
  });
  const [resF, , resQ] = resRuns;
  return {
    ...resD, teams: resTeams, seed: resSeed, sla: RES_DRILL_SLA, runs: resRuns,
    simulatedIn: resRound(performance.now() - resStart, 1),
    headline: {
      p1Faster: resRound(resF.metrics.p1AvgResponse - resQ.metrics.p1AvgResponse, 1),
      moreOnTime: resQ.metrics.onTime - resF.metrics.onTime,
      morePeople: resQ.metrics.peopleOnTime - resF.metrics.peopleOnTime,
    },
  };
}
