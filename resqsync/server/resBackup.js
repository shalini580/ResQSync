// Database backup and recovery.
//
// Backup  = a logical dump: every table's rows written to one JSON file in data/backups/.
//           Works the same on MySQL and SQLite, so a backup from one can be restored on the other.
// Restore = ONE transaction: delete all rows (children first), insert the saved rows
//           (parents first, so foreign keys are always satisfied). If anything fails,
//           ROLLBACK leaves the database exactly as it was - atomicity again.
// Automatic backups run every BACKUP_EVERY_HOURS (default 24) and the newest
// BACKUP_KEEP (default 10) files are kept.

import fs from 'fs';
import path from 'path';
import { resConfig } from './resConfig.js';
import { resQuery, resTransaction, resColumnsOf, resRefreshTxnSeq, resDbState } from './resDb.js';
import { resPrepareRestore, resAfterRestore } from './resAllocator.js';
import { resChanged, resSyncLog } from './resMonitor.js';

// parents before children (insert order); deleting goes the other way
export const RES_BACKUP_TABLES = [
  'users', 'organisations', 'volunteers', 'resources', 'emergency_cases', 'resource_requests',
  'surplus_food', 'surplus_food_archive', 'rescue_missions', 'feedback', 'audit_logs', 'notifications',
];

const RES_FILE_RX = /^resqsync-[0-9A-Za-z_-]+\.json$/;
const resDir = () => path.resolve(resConfig.resBackup.resDir);

function resAudit(resAction, resDetails, resActor) {
  return resQuery(
    `INSERT INTO audit_logs (action, entity_type, entity_id, actor, details, os_concept, dbms_concept)
     VALUES (?, 'database', 0, ?, ?, NULL, ?)`,
    [resAction, resActor, resDetails.slice(0, 255), resAction === 'BACKUP' ? 'Backup (logical dump)' : 'Recovery (restore in one transaction)']
  );
}

export async function resCreateBackup(resActor = 'Admin') {
  fs.mkdirSync(resDir(), { recursive: true });
  const resTables = {};
  const resCounts = {};
  for (const resT of RES_BACKUP_TABLES) {
    resTables[resT] = await resQuery(`SELECT * FROM ${resT} ORDER BY id`);
    resCounts[resT] = resTables[resT].length;
  }
  const resStamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const resFile = `resqsync-${resStamp}.json`;
  const resBody = {
    app: 'ResQSync', format: 1, engine: resDbState.resEngine, createdAt: new Date().toISOString(), createdBy: resActor,
    counts: resCounts, tables: resTables,
  };
  fs.writeFileSync(path.join(resDir(), resFile), JSON.stringify(resBody));
  const resTotal = Object.values(resCounts).reduce((resA, resB) => resA + resB, 0);
  await resAudit('BACKUP', `Backup ${resFile}: ${resTotal} rows from ${RES_BACKUP_TABLES.length} tables`, resActor);
  resPrune();
  resChanged('backups');
  return resMeta(resFile);
}

function resMeta(resFile) {
  const resFull = path.join(resDir(), resFile);
  const resStat = fs.statSync(resFull);
  let resHead = {};
  try {
    const { tables: resSkip, ...resRest } = JSON.parse(fs.readFileSync(resFull, 'utf8'));
    resHead = resRest;
  } catch {
    resHead = { broken: true };
  }
  return { file: resFile, size: resStat.size, createdAt: resHead.createdAt || resStat.mtime.toISOString(), ...resHead };
}

export function resListBackups() {
  if (!fs.existsSync(resDir())) return [];
  return fs.readdirSync(resDir()).filter((resF) => RES_FILE_RX.test(resF)).sort().reverse().map(resMeta);
}

function resPrune() {
  const resKeep = Math.max(1, resConfig.resBackup.resKeep);
  resListBackups().slice(resKeep).forEach((resB) => fs.unlinkSync(path.join(resDir(), resB.file)));
}

export function resBackupPath(resFile) {
  if (!RES_FILE_RX.test(String(resFile))) throw Object.assign(new Error('Bad backup name'), { status: 400 });
  const resFull = path.join(resDir(), resFile);
  if (!fs.existsSync(resFull)) throw Object.assign(new Error('Backup not found'), { status: 404 });
  return resFull;
}

/** saves an uploaded backup (JSON object) into the backup folder */
export function resSaveUploaded(resBody) {
  if (!resBody || resBody.app !== 'ResQSync' || typeof resBody.tables !== 'object') {
    throw Object.assign(new Error('This is not a ResQSync backup file'), { status: 400 });
  }
  fs.mkdirSync(resDir(), { recursive: true });
  const resFile = `resqsync-upload-${Date.now()}.json`;
  fs.writeFileSync(path.join(resDir(), resFile), JSON.stringify(resBody));
  return resMeta(resFile);
}

export async function resRestoreBackup(resFile, resActor = 'Admin') {
  const resData = JSON.parse(fs.readFileSync(resBackupPath(resFile), 'utf8'));
  if (resData.app !== 'ResQSync' || typeof resData.tables !== 'object') {
    throw Object.assign(new Error('This is not a ResQSync backup file'), { status: 400 });
  }
  // safety net: keep a copy of the current data before overwriting it
  const resSafety = await resCreateBackup(`${resActor} (before restore)`);

  // column lists are read before the transaction (SQLite has one connection)
  const resCols = {};
  for (const resT of RES_BACKUP_TABLES) resCols[resT] = await resColumnsOf(resT);

  resPrepareRestore();
  const resCounts = {};
  const { resTxnId } = await resTransaction({ resActor: `${resActor} (restore)` }, async (resQ) => {
    for (const resT of [...RES_BACKUP_TABLES].reverse()) await resQ(`DELETE FROM ${resT}`);
    for (const resT of RES_BACKUP_TABLES) {
      const resRows = resData.tables[resT] || [];
      // inserting surplus food / feedback fires notification triggers - clear those before notifications go back
      if (resT === 'notifications') await resQ('DELETE FROM notifications');
      const resUse = resCols[resT].filter((resC) => resRows.some((resR) => resC in resR));
      for (let resI = 0; resI < resRows.length; resI += 100) {
        const resChunk = resRows.slice(resI, resI + 100);
        const resMarks = resChunk.map(() => `(${resUse.map(() => '?').join(',')})`).join(',');
        const resArgs = resChunk.flatMap((resR) => resUse.map((resC) => (resR[resC] === undefined ? null : resR[resC])));
        await resQ(`INSERT INTO ${resT} (${resUse.join(',')}) VALUES ${resMarks}`, resArgs);
      }
      resCounts[resT] = resRows.length;
    }
  });
  await resRefreshTxnSeq();
  await resAudit('RESTORE', `Restored ${resFile} (txn #${resTxnId}); safety copy ${resSafety.file}`, resActor);
  await resAfterRestore(resActor);
  resSyncLog('info', `Database restored from ${resFile} in transaction #${resTxnId}`);
  ['queue', 'stock', 'missions', 'surplus', 'organisations', 'notifications', 'ledger', 'backups', 'sync'].forEach(resChanged);
  return { ok: true, file: resFile, txnId: resTxnId, counts: resCounts, safetyCopy: resSafety.file };
}

let resTimer = null;
export function resStartAutoBackup() {
  const resHours = resConfig.resBackup.resEveryHours;
  if (!resHours || resTimer) return;
  resTimer = setInterval(() => {
    resCreateBackup('Scheduled backup').catch((resErr) => console.error('[backup] failed:', resErr.message));
  }, resHours * 3600000);
  resTimer.unref?.();
  console.log(`[backup] automatic backup every ${resHours} h, keeping ${resConfig.resBackup.resKeep}`);
}

export function resLastBackupAt() {
  return resListBackups()[0]?.createdAt || null;
}

