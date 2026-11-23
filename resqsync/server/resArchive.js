// Expired-food archiving.
//
// Surplus food that nobody claimed before expiry_time is first marked 'expired'.
// After ARCHIVE_AFTER_HOURS it is MOVED to surplus_food_archive:
//   INSERT INTO surplus_food_archive SELECT ... ;  DELETE FROM surplus_food ... ;
// Both statements run in ONE transaction, so a row is never lost (deleted but not
// copied) and never doubled (copied but not deleted). original_id is UNIQUE, so the
// same donation can never be archived twice.
// The live table stays small and fast; the history is still there for reports.

import { resConfig } from './resConfig.js';
import { resQuery, resTransaction } from './resDb.js';
import { resSqlTime } from './resRecords.js';
import { resChanged, resSyncLog } from './resMonitor.js';

export async function resExpireOldFood() {
  await resQuery("UPDATE surplus_food SET status = 'expired' WHERE status = 'available' AND expiry_time < ?", [resSqlTime()]);
}

/** resAll = true archives every expired row now (admin button); otherwise only old ones */
export async function resArchiveExpired(resActor = 'System', resAll = false) {
  await resExpireOldFood();
  const resHours = resAll ? 0 : resConfig.resArchive.resAfterHours;
  const resCutoff = resSqlTime(new Date(Date.now() - resHours * 3600000));

  const { resTxnId, resResult } = await resTransaction({ resActor: `${resActor} (archive)` }, async (resQ) => {
    const resRows = await resQ(
      "SELECT id, servings FROM surplus_food WHERE status = 'expired' AND expiry_time <= ? ORDER BY id",
      [resCutoff]
    );
    if (!resRows.length) return { moved: 0, servings: 0 };
    const resIds = resRows.map((resR) => resR.id);
    const resMarks = resIds.map(() => '?').join(',');
    await resQ(
      `INSERT INTO surplus_food_archive
         (original_id, restaurant_id, title, food_type, servings, zone, expiry_time, posted_at, archived_by)
       SELECT id, restaurant_id, title, food_type, servings, zone, expiry_time, created_at, ?
       FROM surplus_food WHERE id IN (${resMarks})`,
      [resActor, ...resIds]
    );
    await resQ(`DELETE FROM surplus_food WHERE id IN (${resMarks})`, resIds);
    await resQ(
      `INSERT INTO audit_logs (action, entity_type, entity_id, actor, details, os_concept, dbms_concept)
       VALUES ('ARCHIVE', 'surplus_food', 0, ?, ?, NULL, 'Archiving (move rows in one transaction)')`,
      [resActor, `Archived ${resIds.length} expired donation(s): ids ${resIds.join(', ')}`.slice(0, 255)]
    );
    return { moved: resIds.length, servings: resRows.reduce((resA, resR) => resA + Number(resR.servings), 0) };
  });

  if (resResult.moved) {
    resSyncLog('info', `Archived ${resResult.moved} expired donation(s) in transaction #${resTxnId}`);
    ['surplus', 'archive', 'ledger'].forEach(resChanged);
  }
  return { ...resResult, txnId: resTxnId, afterHours: resHours };
}

export async function resArchiveSummary(resRestaurantId = null) {
  const resWhere = resRestaurantId ? 'WHERE a.restaurant_id = ?' : '';
  const resArgs = resRestaurantId ? [resRestaurantId] : [];
  const resRows = await resQuery(
    `SELECT a.*, COALESCE(o.org_name, u.name) AS restaurant_name FROM surplus_food_archive a
     JOIN users u ON u.id = a.restaurant_id
     LEFT JOIN organisations o ON o.user_id = u.id ${resWhere}
     ORDER BY a.archived_at DESC, a.id DESC LIMIT 100`,
    resArgs
  );
  const [resTotals] = await resQuery(
    `SELECT COUNT(*) AS donations, COALESCE(SUM(servings), 0) AS servings FROM surplus_food_archive a ${resWhere}`,
    resArgs
  );
  return {
    rows: resRows,
    donations: Number(resTotals.donations),
    servings: Number(resTotals.servings),
    afterHours: resConfig.resArchive.resAfterHours,
    everyMinutes: resConfig.resArchive.resEveryMinutes,
  };
}

let resTimer = null;
export function resStartAutoArchive() {
  const resMinutes = resConfig.resArchive.resEveryMinutes;
  if (!resMinutes || resTimer) return;
  const resRun = () => resArchiveExpired('Scheduled archive').catch((resErr) => console.error('[archive] failed:', resErr.message));
  resTimer = setInterval(resRun, resMinutes * 60000);
  resTimer.unref?.();
  setTimeout(resRun, 5000).unref?.();
  console.log(`[archive] expired food archived every ${resMinutes} min (${resConfig.resArchive.resAfterHours} h after expiry)`);
}
