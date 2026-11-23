// Route planning for deliveries: Dijkstra's shortest path on the city road grid.
//
// Each zone is a 10 km x 10 km grid of streets every 0.5 km (21 x 21 = 441 junctions).
// - Main roads run through the depot (x = 5, y = 5 inside the zone): 60 km/h
// - Other streets: 30 km/h
// - A river crosses the city; it can only be crossed at bridges.
// - Roads can be closed (e.g. flooded) by the admin; Dijkstra routes around them.
//
// Edge weight = travel time in minutes, so the result is the FASTEST route,
// not just the shortest one. A min-heap keeps Dijkstra at O(E log V).

import { RES_ZONE_ORIGIN, RES_ZONE_SIZE, resDepotOf } from './resGeo.js';

export const RES_STEP = 0.5;
const RES_N = Math.round(RES_ZONE_SIZE / RES_STEP) + 1; // 21
const RES_MAIN_SPEED = 60; // km/h
const RES_STREET_SPEED = 30;

/** the river: y as a function of x across the whole 20 km city */
export function resRiverY(resX) {
  return 4 + resX * 0.5 + 1.5 * Math.sin(resX / 2);
}
export const RES_BRIDGES = [2.5, 7, 12, 17.5];

// closed road segments (admin toggles), key "x1,y1|x2,y2" in city km
const resClosed = new Set();
const resEdgeKey = (resA, resB) => {
  const [resP, resQ] = [resA, resB].sort((resU, resV) => resU[0] - resV[0] || resU[1] - resV[1]);
  return `${resP[0]},${resP[1]}|${resQ[0]},${resQ[1]}`;
};

export function resRoadClosures() {
  return [...resClosed].map((resK) => resK.split('|').map((resP) => resP.split(',').map(Number)));
}

/** close or reopen every street within resRadius km of a point (e.g. a flooded junction) */
export function resToggleClosure(resX, resY, resRadius = 0.6) {
  const resHits = [];
  const resSnap = (resV) => Math.round(resV / RES_STEP) * RES_STEP;
  for (let resGx = resSnap(resX - resRadius); resGx <= resX + resRadius + 1e-9; resGx += RES_STEP) {
    for (let resGy = resSnap(resY - resRadius); resGy <= resY + resRadius + 1e-9; resGy += RES_STEP) {
      const resA = [+resGx.toFixed(2), +resGy.toFixed(2)];
      for (const resB of [[resA[0] + RES_STEP, resA[1]], [resA[0], resA[1] + RES_STEP]]) {
        const resMid = [(resA[0] + resB[0]) / 2, (resA[1] + resB[1]) / 2];
        if (Math.hypot(resMid[0] - resX, resMid[1] - resY) <= resRadius) resHits.push(resEdgeKey(resA, [+resB[0].toFixed(2), +resB[1].toFixed(2)]));
      }
    }
  }
  const resClosing = resHits.some((resK) => !resClosed.has(resK));
  resHits.forEach((resK) => (resClosing ? resClosed.add(resK) : resClosed.delete(resK)));
  return { closed: resClosing, segments: resHits.length };
}

export function resClearClosures() {
  resClosed.clear();
}

function resCrossesRiver(resA, resB) {
  const resSideA = resA[1] - resRiverY(resA[0]);
  const resSideB = resB[1] - resRiverY(resB[0]);
  if (Math.sign(resSideA) === Math.sign(resSideB)) return false;
  // a crossing is fine only on a bridge (vertical street at a bridge x)
  return !(resA[0] === resB[0] && RES_BRIDGES.some((resBx) => Math.abs(resBx - resA[0]) < 1e-9));
}

class ResHeap {
  constructor() { this.resA = []; }
  get size() { return this.resA.length; }
  push(resItem) {
    const resA = this.resA;
    resA.push(resItem);
    let resI = resA.length - 1;
    while (resI > 0) {
      const resP = (resI - 1) >> 1;
      if (resA[resP][0] <= resA[resI][0]) break;
      [resA[resP], resA[resI]] = [resA[resI], resA[resP]];
      resI = resP;
    }
  }
  pop() {
    const resA = this.resA;
    const resTop = resA[0];
    const resLast = resA.pop();
    if (resA.length) {
      resA[0] = resLast;
      let resI = 0;
      for (;;) {
        const resL = 2 * resI + 1;
        const resR = resL + 1;
        let resM = resI;
        if (resL < resA.length && resA[resL][0] < resA[resM][0]) resM = resL;
        if (resR < resA.length && resA[resR][0] < resA[resM][0]) resM = resR;
        if (resM === resI) break;
        [resA[resM], resA[resI]] = [resA[resI], resA[resM]];
        resI = resM;
      }
    }
    return resTop;
  }
}

/**
 * Fastest route from the zone depot to (x, y) inside the zone.
 * returns { path: [[x,y],...], km, minutes, straightKm, visited, bridges, blocked }
 */
export function resPlanRoute(resZone, resX, resY) {
  const resOrigin = RES_ZONE_ORIGIN[resZone];
  if (!resOrigin) throw Object.assign(new Error('Unknown zone'), { status: 400 });
  const [resOx, resOy] = resOrigin;
  const resToKm = (resI, resJ) => [+(resOx + resI * RES_STEP).toFixed(2), +(resOy + resJ * RES_STEP).toFixed(2)];
  const resClampIdx = (resV) => Math.max(0, Math.min(RES_N - 1, resV));
  const [resDx, resDy] = resDepotOf(resZone);
  const resStart = [resClampIdx(Math.round((resDx - resOx) / RES_STEP)), resClampIdx(Math.round((resDy - resOy) / RES_STEP))];
  const resGoal = [resClampIdx(Math.round((resX - resOx) / RES_STEP)), resClampIdx(Math.round((resY - resOy) / RES_STEP))];
  const resMid = (RES_N - 1) / 2;
  const resIdx = (resI, resJ) => resJ * RES_N + resI;

  const resDist = new Float64Array(RES_N * RES_N).fill(Infinity);
  const resPrev = new Int32Array(RES_N * RES_N).fill(-1);
  const resHeap = new ResHeap();
  resDist[resIdx(...resStart)] = 0;
  resHeap.push([0, resStart[0], resStart[1]]);
  let resVisited = 0;
  let resBlocked = 0;
  const resGoalIdx = resIdx(...resGoal);

  while (resHeap.size) {
    const [resD, resI, resJ] = resHeap.pop();
    const resU = resIdx(resI, resJ);
    if (resD > resDist[resU]) continue;
    resVisited++;
    if (resU === resGoalIdx) break;
    for (const [resDi, resDj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const resNi = resI + resDi;
      const resNj = resJ + resDj;
      if (resNi < 0 || resNj < 0 || resNi >= RES_N || resNj >= RES_N) continue;
      const resA = resToKm(resI, resJ);
      const resB = resToKm(resNi, resNj);
      if (resCrossesRiver(resA, resB) || resClosed.has(resEdgeKey(resA, resB))) {
        resBlocked++;
        continue;
      }
      // main road: the street through the depot, in its own direction
      const resMain = (resDi !== 0 && resJ === resMid) || (resDj !== 0 && resI === resMid);
      const resMinutes = (RES_STEP / (resMain ? RES_MAIN_SPEED : RES_STREET_SPEED)) * 60;
      const resV = resIdx(resNi, resNj);
      if (resD + resMinutes < resDist[resV]) {
        resDist[resV] = resD + resMinutes;
        resPrev[resV] = resU;
        resHeap.push([resDist[resV], resNi, resNj]);
      }
    }
  }

  if (!Number.isFinite(resDist[resGoalIdx])) {
    return { reachable: false, path: [], km: null, minutes: null, straightKm: +Math.hypot(resX - resDx, resY - resDy).toFixed(2), visited: resVisited };
  }
  const resPath = [];
  for (let resV = resGoalIdx; resV !== -1; resV = resPrev[resV]) resPath.push(resToKm(resV % RES_N, Math.floor(resV / RES_N)));
  resPath.reverse();
  // merge straight runs so the polyline is short
  const resSimple = resPath.filter((resP, resK) => {
    if (resK === 0 || resK === resPath.length - 1) return true;
    const resA = resPath[resK - 1];
    const resB = resPath[resK + 1];
    return !((resA[0] === resP[0] && resP[0] === resB[0]) || (resA[1] === resP[1] && resP[1] === resB[1]));
  });
  const resBridges = [];
  for (let resK = 1; resK < resPath.length; resK++) {
    const resSa = Math.sign(resPath[resK - 1][1] - resRiverY(resPath[resK - 1][0]));
    const resSb = Math.sign(resPath[resK][1] - resRiverY(resPath[resK][0]));
    if (resSa !== resSb) resBridges.push(resPath[resK][0]);
  }
  return {
    reachable: true,
    path: resSimple,
    km: +((resPath.length - 1) * RES_STEP).toFixed(1),
    minutes: +resDist[resGoalIdx].toFixed(1),
    straightKm: +Math.hypot(resX - resDx, resY - resDy).toFixed(2),
    visited: resVisited,
    blockedEdges: resBlocked,
    bridges: [...new Set(resBridges)],
    from: [resDx, resDy],
    to: resToKm(...resGoal),
  };
}

/** river polyline + bridges for drawing (city km) */
export function resCityLayout() {
  const resRiver = [];
  for (let resX = 0; resX <= 20.001; resX += 0.25) resRiver.push([+resX.toFixed(2), +resRiverY(resX).toFixed(3)]);
  return {
    river: resRiver,
    bridges: RES_BRIDGES.map((resBx) => [resBx, +resRiverY(resBx).toFixed(3)]),
    closures: resRoadClosures(),
    step: RES_STEP,
  };
}
