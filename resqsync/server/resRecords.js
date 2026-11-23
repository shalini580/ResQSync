// Creating cases and requests in one place, so the process ids
// (PID-101, REQ-201 ...) are always made the same way.
import { resQuery } from './resDb.js';
import { resClampToZone, resRandomPoint } from './resGeo.js';

const resQtyCols = ['food', 'water', 'medicine', 'cots', 'vehicles'];

// UTC "YYYY-MM-DD HH:MM:SS", what both databases store
export function resSqlTime(resDate = new Date()) {
  return resDate.toISOString().slice(0, 19).replace('T', ' ');
}

// location inside the zone (km); no location given -> a random spot in the zone
function resLocationOf(resData) {
  const resX = parseFloat(resData.loc_x);
  const resY = parseFloat(resData.loc_y);
  if (Number.isFinite(resX) && Number.isFinite(resY)) return resClampToZone(resData.zone, resX, resY);
  return resRandomPoint(resData.zone);
}

const resPeopleOf = (resData) => Math.min(100000, Math.max(1, parseInt(resData.people_affected, 10) || 10));

function resDuplicate(resErr) {
  const resMsg = String(resErr.message || '');
  return resErr.code === 'ER_DUP_ENTRY' || resMsg.includes('UNIQUE');
}

export async function resCreateCase(resData, resCreatedAt = null) {
  const resQty = resQtyCols.map((resK) => Math.max(0, parseInt(resData[resK], 10) || 0));
  try {
    const resIns = await resQuery(
      `INSERT INTO emergency_cases (process_id, title, case_type, priority, zone, location, loc_x, loc_y, people_affected,
                                    food, water, medicine, cots, vehicles, burst_time, reported_by, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        `T${Date.now().toString(36).slice(-6)}${Math.random().toString(36).slice(2, 6)}`,
        resData.title, resData.case_type, resData.priority, resData.zone, resData.location,
        ...resLocationOf(resData), resPeopleOf(resData),
        ...resQty, resData.burst_time || 30, resData.reported_by, resCreatedAt || resSqlTime(),
      ]
    );
    const resPid = `PID-${100 + resIns.insertId}`;
    await resQuery('UPDATE emergency_cases SET process_id = ? WHERE id = ?', [resPid, resIns.insertId]);
    return { id: resIns.insertId, process_id: resPid };
  } catch (resErr) {
    if (resDuplicate(resErr)) {
      throw Object.assign(new Error(`An open case "${resData.title}" already exists in ${resData.zone}`), { status: 409 });
    }
    throw resErr;
  }
}

export async function resCreateRequest(resData, resCreatedAt = null) {
  const resQty = resQtyCols.map((resK) => Math.max(0, parseInt(resData[resK], 10) || 0));
  try {
    const resIns = await resQuery(
      `INSERT INTO resource_requests (process_id, ngo_id, title, zone, priority, loc_x, loc_y, people_affected,
                                      food, water, medicine, cots, vehicles, notes, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        `T${Date.now().toString(36).slice(-6)}${Math.random().toString(36).slice(2, 6)}`,
        resData.ngo_id, resData.title, resData.zone, resData.priority,
        ...resLocationOf(resData), resPeopleOf(resData), ...resQty,
        resData.notes || null, resCreatedAt || resSqlTime(),
      ]
    );
    const resPid = `REQ-${200 + resIns.insertId}`;
    await resQuery('UPDATE resource_requests SET process_id = ? WHERE id = ?', [resPid, resIns.insertId]);
    return { id: resIns.insertId, process_id: resPid };
  } catch (resErr) {
    if (resDuplicate(resErr)) {
      throw Object.assign(new Error(`You already have an open request "${resData.title}" in ${resData.zone}`), { status: 409 });
    }
    throw resErr;
  }
}

export async function resNotify(resRole, resRecipientId, resType, resTitle, resMessage) {
  await resQuery(
    'INSERT INTO notifications (recipient_role, recipient_id, type, title, message) VALUES (?,?,?,?,?)',
    [resRole, resRecipientId, resType, resTitle.slice(0, 150), resMessage.slice(0, 255)]
  );
}
