// Stock forecast: "Zone B will run out of medicine in about 3 hours".
//
// usage rate  = units given out in the last FORECAST_HOURS (from the audit log the
//               stock trigger writes) / FORECAST_HOURS        (moving average)
// hours left  = available / usage rate
// shortfall   = what open cases/requests still need - available  (needed RIGHT NOW)
// suggestion  = enough to cover the waiting demand + the next 12 hours of usage
//
// Vehicles are left out of the usage rate because they come back after a mission.

import { RES_ZONES, RES_TYPES } from './resConfig.js';
import { resQuery } from './resDb.js';
import { resSqlTime, resNotify } from './resRecords.js';
import { resChanged } from './resMonitor.js';

const RES_WINDOW_HOURS = Math.max(1, Number(process.env.FORECAST_HOURS) || 6);
const RES_COVER_HOURS = 12;

export async function resForecast() {
  const resSince = resSqlTime(new Date(Date.now() - RES_WINDOW_HOURS * 3600000));
  const resStock = await resQuery('SELECT zone, resource_type, available FROM resources');
  const resUsed = await resQuery(
    `SELECT zone, resource_type, SUM(old_value - new_value) AS used, COUNT(*) AS txns
     FROM audit_logs WHERE action = 'STOCK_ALLOCATED' AND created_at >= ? GROUP BY zone, resource_type`,
    [resSince]
  );
  const resDemand = await resQuery(
    `SELECT zone, SUM(food) AS food, SUM(water) AS water, SUM(medicine) AS medicine, SUM(cots) AS cots, SUM(vehicles) AS vehicles
     FROM v_priority_queue GROUP BY zone`
  );
  const resUsedBy = new Map(resUsed.map((resU) => [`${resU.zone}|${resU.resource_type}`, resU]));
  const resDemandBy = new Map(resDemand.map((resD) => [resD.zone, resD]));

  const resRows = [];
  for (const resZ of RES_ZONES) {
    for (const resT of RES_TYPES) {
      const resS = resStock.find((resX) => resX.zone === resZ && resX.resource_type === resT);
      if (!resS) continue;
      const resAvail = Number(resS.available);
      const resUse = resT === 'vehicles' ? 0 : Number(resUsedBy.get(`${resZ}|${resT}`)?.used || 0);
      const resRate = resUse / RES_WINDOW_HOURS;
      const resWaiting = Number(resDemandBy.get(resZ)?.[resT] || 0);
      const resHours = resRate > 0 ? resAvail / resRate : null;
      let resStatus = 'ok';
      if (resWaiting > resAvail) resStatus = 'short';
      else if (resHours !== null && resHours < 3) resStatus = 'critical';
      else if (resHours !== null && resHours < 12) resStatus = 'watch';
      const resSuggest = Math.max(0, Math.ceil(resWaiting + resRate * RES_COVER_HOURS - resAvail));
      resRows.push({
        zone: resZ, type: resT, available: resAvail, usedInWindow: resUse, ratePerHour: Math.round(resRate * 10) / 10,
        hoursLeft: resHours === null ? null : Math.round(resHours * 10) / 10,
        emptyAt: resHours === null ? null : new Date(Date.now() + resHours * 3600000).toISOString(),
        waiting: resWaiting, shortfall: Math.max(0, resWaiting - resAvail), suggest: resSuggest, status: resStatus,
      });
    }
  }
  return { windowHours: RES_WINDOW_HOURS, coverHours: RES_COVER_HOURS, generatedAt: new Date().toISOString(), rows: resRows };
}

// warn the admin once when something turns critical / short
const resWarned = new Map();
export async function resForecastAlerts() {
  const { rows: resRows } = await resForecast();
  let resSent = 0;
  for (const resR of resRows) {
    const resKey = `${resR.zone}|${resR.type}`;
    const resBad = resR.status === 'short' || resR.status === 'critical';
    if (!resBad) {
      resWarned.delete(resKey);
      continue;
    }
    if (resWarned.get(resKey) === resR.status) continue;
    resWarned.set(resKey, resR.status);
    await resNotify('admin', null, resR.status === 'short' ? 'critical' : 'alert',
      resR.status === 'short' ? `${resR.zone}: ${resR.type} is short right now` : `${resR.zone}: ${resR.type} runs out in ~${resR.hoursLeft} h`,
      resR.status === 'short'
        ? `Waiting cases need ${resR.waiting}, only ${resR.available} left. Suggested restock: ${resR.suggest}.`
        : `Using ${resR.ratePerHour}/h, ${resR.available} left. Suggested restock: ${resR.suggest}.`);
    resSent++;
  }
  if (resSent) resChanged('notifications');
  return resSent;
}

export function resStartForecastAlerts() {
  const resTimer = setInterval(() => resForecastAlerts().catch(() => {}), 5 * 60000);
  resTimer.unref?.();
}
