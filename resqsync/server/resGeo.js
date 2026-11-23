// City geometry. The simulated city is 20 km x 20 km, split into four 10 km zones.
// Each zone has one relief depot (where its stock is kept) at the zone centre.
//
//   Zone A (0-10, 0-10)   | Zone B (10-20, 0-10)
//   ----------------------+----------------------
//   Zone C (0-10, 10-20)  | Zone D (10-20, 10-20)

export const RES_ZONE_ORIGIN = {
  'Zone A': [0, 0],
  'Zone B': [10, 0],
  'Zone C': [0, 10],
  'Zone D': [10, 10],
};
export const RES_ZONE_SIZE = 10;
export const RES_MAX_DISTANCE = Math.hypot(RES_ZONE_SIZE / 2, RES_ZONE_SIZE / 2); // depot to zone corner ~7.07 km

export function resDepotOf(resZone) {
  const [resX, resY] = RES_ZONE_ORIGIN[resZone] || [0, 0];
  return [resX + RES_ZONE_SIZE / 2, resY + RES_ZONE_SIZE / 2];
}

/** keeps a point inside its zone (rounded to 0.1 km) */
export function resClampToZone(resZone, resX, resY) {
  const [resX0, resY0] = RES_ZONE_ORIGIN[resZone] || [0, 0];
  const resClamp = (resV, resLo) => Math.round(Math.min(resLo + RES_ZONE_SIZE, Math.max(resLo, resV)) * 10) / 10;
  return [resClamp(resX, resX0), resClamp(resY, resY0)];
}

/** a random point in the zone - used when nobody picked a location */
export function resRandomPoint(resZone) {
  const [resX0, resY0] = RES_ZONE_ORIGIN[resZone] || [0, 0];
  return resClampToZone(resZone, resX0 + 1 + Math.random() * 8, resY0 + 1 + Math.random() * 8);
}

/** straight-line distance (km) from the zone's depot to the case */
export function resDistanceKm(resZone, resX, resY) {
  if (resX === null || resX === undefined || resY === null || resY === undefined) return 0;
  const [resDx, resDy] = resDepotOf(resZone);
  return Math.round(Math.hypot(Number(resX) - resDx, Number(resY) - resDy) * 10) / 10;
}

/** 1 = right next to the depot, 0 = far corner of the zone */
export function resProximity(resDistance) {
  return Math.max(0, 1 - resDistance / RES_MAX_DISTANCE);
}
