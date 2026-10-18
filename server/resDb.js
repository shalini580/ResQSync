// Database layer.
// Tries MySQL first (like the report says). If MySQL isn't running or the
// password is wrong, it falls back to a SQLite file so the app still works.
// Everything else in the server only uses the functions exported here.

import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { resConfig } from './resConfig.js';
import { ResMutex } from './resSync.js';

export const resDbState = { resEngine: null, resNote: '' };

let resPool = null;     // MySQL connection pool
let resSqlite = null;   // SQLite connection (only one)
let resTxnSeq = 0;      // transaction numbers shown on screen

// SQLite has one connection, so two async handlers must not mix their statements
const resSqliteLock = new ResMutex('sqlite');

const RES_TABLE_OF = { case: 'emergency_cases', request: 'resource_requests' };
const RES_KINDS = ['food', 'water', 'medicine', 'cots', 'vehicles'];

// ------------------------------------------------------------------ setup

// splits a .sql file into statements, understands DELIMITER $$
function resSplitSql(resSql) {
  const resOut = [];
  let resDelim = ';';
  let resBuf = '';
  for (const resLine of resSql.split(/\r?\n/)) {
    const resTrim = resLine.trim();
    if (/^DELIMITER\s+/i.test(resTrim)) {
      resDelim = resTrim.split(/\s+/)[1];
      continue;
    }
    if (resTrim.startsWith('--') && !resBuf.trim()) continue;
    resBuf += resLine + '\n';
    if (resTrim.endsWith(resDelim)) {
      const resStmt = resBuf.trim().slice(0, -resDelim.length).trim();
      if (resStmt) resOut.push(resStmt);
      resBuf = '';
    }
  }
  if (resBuf.trim()) resOut.push(resBuf.trim());
  return resOut;
}

async function resInitMysql() {
  const { database: resDbName, ...resServer } = resConfig.resMysql;
  const resConn = await mysql.createConnection({ ...resServer, connectTimeout: 3000 });
  try {
    const resSql = fs
      .readFileSync(path.resolve('database/schema.mysql.sql'), 'utf8')
      .replaceAll('resqsync_final', resDbName);
    for (const resStmt of resSplitSql(resSql)) await resConn.query(resStmt);
  } finally {
    await resConn.end();
  }

  resPool = mysql.createPool({
    ...resConfig.resMysql,
    waitForConnections: true,
    connectionLimit: 20,
    dateStrings: true,
  });
  // keep every timestamp in UTC so the browser can convert it
  resPool.on('connection', (resC) => resC.query("SET time_zone = '+00:00'"));
  await resPool.query('SELECT 1');
  resDbState.resEngine = 'mysql';
}

async function resInitSqlite() {
  const { DatabaseSync } = await import('node:sqlite');
  fs.mkdirSync(path.dirname(resConfig.resSqliteFile), { recursive: true });
  resSqlite = new DatabaseSync(resConfig.resSqliteFile);
  resSqlite.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  resSqlite.exec(fs.readFileSync(path.resolve('database/schema.sqlite.sql'), 'utf8'));
  resDbState.resEngine = 'sqlite';
}

export async function resInitDatabase() {
  const resWanted = resConfig.resDbEngine;
  if (resWanted !== 'sqlite') {
    try {
      await resInitMysql();
    } catch (resErr) {
      if (resWanted === 'mysql') throw resErr;
      resDbState.resNote = `MySQL not available (${resErr.code || resErr.message}) - using SQLite instead`;
      console.log(`[db] ${resDbState.resNote}`);
    }
  }
  if (!resDbState.resEngine) await resInitSqlite();

  const resMax = await resOne(
    `SELECT GREATEST(COALESCE((SELECT MAX(txn_id) FROM audit_logs), 0),
                     COALESCE((SELECT MAX(txn_id) FROM rescue_missions), 0)) AS n`
      .replace('GREATEST', resDbState.resEngine === 'sqlite' ? 'MAX' : 'GREATEST')
  );
  resTxnSeq = Number(resMax?.n || 0);

  const resWhere =
    resDbState.resEngine === 'mysql'
      ? `MySQL ${resConfig.resMysql.host}:${resConfig.resMysql.port}/${resConfig.resMysql.database}`
      : `SQLite file ${resConfig.resSqliteFile}`;
  console.log(`[db] Connected to ${resWhere}`);
}

// ------------------------------------------------------------------ queries

function resSqliteRun(resSql, resParams = []) {
  const resStmt = resSqlite.prepare(resSql);
  if (/^\s*(SELECT|WITH|PRAGMA)/i.test(resSql)) {
    return resStmt.all(...resParams).map((resRow) => ({ ...resRow }));
  }
  const resInfo = resStmt.run(...resParams);
  return { insertId: Number(resInfo.lastInsertRowid), affectedRows: Number(resInfo.changes) };
}

// SELECT -> array of rows, anything else -> { insertId, affectedRows }
export async function resQuery(resSql, resParams = []) {
  if (resDbState.resEngine === 'mysql') {
    const [resRows] = await resPool.query(resSql, resParams);
    return resRows;
  }
  return resSqliteLock.resRun('query', () => resSqliteRun(resSql, resParams));
}

export async function resOne(resSql, resParams = []) {
  const resRows = await resQuery(resSql, resParams);
  return resRows[0] || null;
}

export function resIsMysql() {
  return resDbState.resEngine === 'mysql';
}

/**
 * Runs resFn inside ONE transaction and returns { resTxnId, resResult }.
 * The transaction number, actor and target are handed to the audit trigger:
 *   MySQL  -> session variables @res_txn_id, @res_actor, @res_target
 *   SQLite -> the single row in txn_context
 * If resFn throws, everything is rolled back - including what the triggers wrote.
 */
export async function resTransaction({ resActor, resTarget = null }, resFn) {
  const resTxnId = ++resTxnSeq;

  if (resIsMysql()) {
    const resConn = await resPool.getConnection();
    try {
      await resConn.query('SET @res_txn_id = ?, @res_actor = ?, @res_target = ?', [resTxnId, resActor, resTarget]);
      await resConn.beginTransaction();
      const resQ = async (resSql, resParams = []) => (await resConn.query(resSql, resParams))[0];
      try {
        const resResult = await resFn(resQ, resTxnId);
        await resConn.commit();
        return { resTxnId, resResult };
      } catch (resErr) {
        await resConn.rollback();
        resErr.resTxnId = resTxnId;
        throw resErr;
      }
    } finally {
      await resConn.query('SET @res_txn_id = NULL, @res_actor = NULL, @res_target = NULL').catch(() => {});
      resConn.release();
    }
  }

  return resSqliteLock.resRun('transaction', async () => {
    resSqlite.exec('BEGIN IMMEDIATE'); // takes the write lock straight away
    try {
      resSqliteRun('UPDATE txn_context SET txn_id = ?, actor = ?, target = ? WHERE id = 1', [resTxnId, resActor, resTarget]);
      const resQ = async (resSql, resParams = []) => resSqliteRun(resSql, resParams);
      const resResult = await resFn(resQ, resTxnId);
      resSqliteRun('UPDATE txn_context SET txn_id = NULL, actor = NULL, target = NULL WHERE id = 1');
      resSqlite.exec('COMMIT');
      return { resTxnId, resResult };
    } catch (resErr) {
      resSqlite.exec('ROLLBACK');
      resErr.resTxnId = resTxnId;
      throw resErr;
    }
  });
}

// ------------------------------------------------------------------ allocation (procedure 1)

/** stock rows the trigger logged for one transaction: before - given = after */
export async function resLedgerFor(resTxnId) {
  const resRows = await resQuery(
    `SELECT zone, resource_type, old_value, new_value FROM audit_logs
     WHERE txn_id = ? AND action IN ('STOCK_ALLOCATED','STOCK_ADDED') ORDER BY id`,
    [resTxnId]
  );
  return resRows.map((resR) => ({
    zone: resR.zone,
    type: resR.resource_type,
    before: Number(resR.old_value),
    after: Number(resR.new_value),
    change: Number(resR.new_value) - Number(resR.old_value),
  }));
}

// SQLite twin of sp_AllocateEmergencyResources - same steps in the same order
async function resAllocateSqlite(resItem, resWorker, resTrace) {
  const resTable = RES_TABLE_OF[resItem.resKind];
  return resTransaction({ resActor: resWorker, resTarget: resItem.resPid }, async (resQ, resTxnId) => {
    const [resRow] = await resQ(`SELECT * FROM ${resTable} WHERE id = ? AND status <> 'fulfilled'`, [resItem.resId]);
    if (!resRow) return { resMissionId: null, resStatus: 'gone' };

    const resStock = {};
    for (const resR of await resQ('SELECT resource_type, available FROM resources WHERE zone = ?', [resRow.zone])) {
      resStock[resR.resource_type] = Number(resR.available);
    }
    const resGive = {};
    let resTotal = 0;
    for (const resK of RES_KINDS) {
      resGive[resK] = Math.min(Number(resRow[resK]), resStock[resK] || 0);
      resTotal += resGive[resK];
    }

    let resMissionId = null;
    if (resTotal > 0) {
      for (const resK of RES_KINDS) {
        if (!resGive[resK]) continue;
        await resQ(
          'UPDATE resources SET available = available - ?, allocated = allocated + ? WHERE zone = ? AND resource_type = ?',
          [resGive[resK], resGive[resK], resRow.zone, resK]
        );
      }
      const resIns = await resQ(
        `INSERT INTO rescue_missions (kind, target_id, process_id, zone, food, water, medicine, cots, vehicles,
                                      worker, txn_id, picked_at, started_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [resItem.resKind, resItem.resId, resRow.process_id, resRow.zone, resGive.food, resGive.water,
          resGive.medicine, resGive.cots, resGive.vehicles, resWorker, resTxnId, resTrace.resPickedAt, resTrace.resStartedAt]
      );
      resMissionId = resIns.insertId;
    }

    // count down - trg_*_fulfilled marks it fulfilled when everything is 0
    await resQ(
      `UPDATE ${resTable} SET food = food - ?, water = water - ?, medicine = medicine - ?,
              cots = cots - ?, vehicles = vehicles - ?, status = 'waiting' WHERE id = ?`,
      [resGive.food, resGive.water, resGive.medicine, resGive.cots, resGive.vehicles, resItem.resId]
    );
    const [resAfter] = await resQ(`SELECT status FROM ${resTable} WHERE id = ?`, [resItem.resId]);
    if (resMissionId) {
      await resQ('UPDATE rescue_missions SET result = ?, finished_at = ? WHERE id = ?', [
        resAfter.status === 'fulfilled' ? 'fulfilled' : 'partial', Date.now(), resMissionId,
      ]);
    }
    return { resMissionId, resStatus: resAfter.status };
  });
}

/**
 * Gives one case/request as much stock as its zone has - one ACID transaction.
 * MySQL: CALL sp_AllocateEmergencyResources.  SQLite: the JS twin above.
 */
export async function resAllocate(resItem, resWorker, resTrace) {
  let resTxnId;
  let resMissionId;
  let resStatus;

  if (resIsMysql()) {
    resTxnId = ++resTxnSeq;
    const resConn = await resPool.getConnection();
    try {
      await resConn.query('CALL sp_AllocateEmergencyResources(?, ?, ?, ?, ?, ?, @res_m, @res_s)', [
        resItem.resKind, resItem.resId, resWorker, resTxnId, resTrace.resPickedAt, resTrace.resStartedAt,
      ]);
      const [[resOut]] = await resConn.query('SELECT @res_m AS missionId, @res_s AS status');
      resMissionId = resOut.missionId ? Number(resOut.missionId) : null;
      resStatus = resOut.status;
    } finally {
      resConn.release();
    }
  } else {
    const resDone = await resAllocateSqlite(resItem, resWorker, resTrace);
    resTxnId = resDone.resTxnId;
    resMissionId = resDone.resResult.resMissionId;
    resStatus = resDone.resResult.resStatus;
  }

  if (resStatus === 'gone') return { resTxnId, resStatus, resMissionId: null, resLedger: [], resRemaining: null, resGiven: null };

  const resRemaining = await resOne(
    `SELECT food, water, medicine, cots, vehicles, status FROM ${RES_TABLE_OF[resItem.resKind]} WHERE id = ?`,
    [resItem.resId]
  );
  const resGiven = resMissionId
    ? await resOne('SELECT food, water, medicine, cots, vehicles FROM rescue_missions WHERE id = ?', [resMissionId])
    : null;
  return { resTxnId, resStatus, resMissionId, resLedger: await resLedgerFor(resTxnId), resRemaining, resGiven };
}

// ------------------------------------------------------------------ mission claim (procedure 2)

/** returns OK | TAKEN | BUSY | NOT_FOUND - only one volunteer can ever get OK */
export async function resClaimMission(resMissionId, resVolunteerId) {
  if (resIsMysql()) {
    const resConn = await resPool.getConnection();
    try {
      await resConn.query('CALL sp_DispatchRescueMission(?, ?, @res_r)', [resMissionId, resVolunteerId]);
      const [[resOut]] = await resConn.query('SELECT @res_r AS result');
      return resOut.result;
    } finally {
      resConn.release();
    }
  }
  const { resResult } = await resTransaction({ resActor: `volunteer #${resVolunteerId}` }, async (resQ) => {
    const [resM] = await resQ('SELECT status FROM rescue_missions WHERE id = ?', [resMissionId]);
    const [resBusy] = await resQ(
      "SELECT COUNT(*) AS n FROM rescue_missions WHERE volunteer_id = ? AND status IN ('assigned','pickup','in_transit')",
      [resVolunteerId]
    );
    if (!resM) return 'NOT_FOUND';
    if (resM.status !== 'open') return 'TAKEN';
    if (Number(resBusy.n) > 0) return 'BUSY';
    await resQ("UPDATE rescue_missions SET volunteer_id = ?, status = 'assigned' WHERE id = ?", [resVolunteerId, resMissionId]);
    await resQ("UPDATE volunteers SET availability = 'busy' WHERE user_id = ?", [resVolunteerId]);
    return 'OK';
  });
  return resResult;
}

// ------------------------------------------------------------------ stock in / ACID demo

export async function resRestock(resZone, resType, resAmount, resActor) {
  const { resTxnId } = await resTransaction({ resActor }, (resQ) =>
    resQ('UPDATE resources SET available = available + ? WHERE zone = ? AND resource_type = ?', [resAmount, resZone, resType])
  );
  return resTxnId;
}

/** surplus food goes into the zone's food stock (one transaction) */
export async function resSurplusToStock(resFoodId, resActor) {
  return resTransaction({ resActor, resTarget: `surplus #${resFoodId}` }, async (resQ) => {
    const [resFood] = await resQ("SELECT * FROM surplus_food WHERE id = ? AND status IN ('available','reserved')", [resFoodId]);
    if (!resFood) throw Object.assign(new Error('This food is no longer available'), { status: 409 });
    await resQ("UPDATE resources SET available = available + ? WHERE zone = ? AND resource_type = 'food'", [resFood.servings, resFood.zone]);
    await resQ("UPDATE surplus_food SET status = 'added_to_stock' WHERE id = ?", [resFoodId]);
    return resFood;
  });
}

/**
 * Atomicity demo: take stock inside a transaction, then "crash" before COMMIT.
 * After ROLLBACK the stock must be back and the trigger's audit row must be gone.
 */
export async function resRollbackTest(resZone, resType, resAmount, resActor) {
  const resStockSql = 'SELECT available FROM resources WHERE zone = ? AND resource_type = ?';
  const resBefore = Number((await resOne(resStockSql, [resZone, resType])).available);
  let resSeenInside = null;
  let resTxnId = null;
  try {
    await resTransaction({ resActor, resTarget: 'rollback test' }, async (resQ, resTxn) => {
      resTxnId = resTxn;
      const resTake = Math.min(resAmount, resBefore);
      await resQ('UPDATE resources SET available = available - ? WHERE zone = ? AND resource_type = ?', [resTake, resZone, resType]);
      resSeenInside = Number((await resQ(resStockSql, [resZone, resType]))[0].available);
      throw new Error('simulated crash before COMMIT');
    });
  } catch {
    // expected
  }
  const resAfter = Number((await resOne(resStockSql, [resZone, resType])).available);
  const resKept = Number((await resOne('SELECT COUNT(*) AS n FROM audit_logs WHERE txn_id = ?', [resTxnId])).n);
  return {
    txnId: resTxnId, zone: resZone, type: resType,
    before: resBefore, seenInside: resSeenInside, after: resAfter,
    auditRowsKept: resKept, ok: resBefore === resAfter && resKept === 0,
  };
}

// ------------------------------------------------------------------ schema info for the DBMS lab

export async function resDescribeSchema() {
  if (resIsMysql()) {
    const resCols = await resQuery(
      `SELECT TABLE_NAME AS t, COLUMN_NAME AS name, COLUMN_TYPE AS type, IS_NULLABLE AS nullable,
              COLUMN_KEY AS keyType, COLUMN_DEFAULT AS def, EXTRA AS extra
       FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME, ORDINAL_POSITION`
    );
    const resTables = await resQuery(
      "SELECT TABLE_NAME AS name, TABLE_TYPE AS kind FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME"
    );
    const resFks = await resQuery(
      `SELECT TABLE_NAME AS t, COLUMN_NAME AS col, REFERENCED_TABLE_NAME AS refTable, REFERENCED_COLUMN_NAME AS refCol
       FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL`
    );
    const resIdx = await resQuery(
      `SELECT TABLE_NAME AS t, INDEX_NAME AS name, NON_UNIQUE AS nonUnique,
              GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols
       FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE()
       GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE`
    );
    const resTrig = await resQuery(
      `SELECT TRIGGER_NAME AS name, EVENT_OBJECT_TABLE AS tableName, ACTION_TIMING AS timing,
              EVENT_MANIPULATION AS event, ACTION_STATEMENT AS body
       FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE() ORDER BY EVENT_OBJECT_TABLE`
    );
    const resProcs = await resQuery(
      `SELECT ROUTINE_NAME AS name, ROUTINE_DEFINITION AS body
       FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_TYPE = 'PROCEDURE'`
    );
    return resShapeSchema(resTables, resCols, resFks, resIdx, resTrig, resProcs);
  }

  const resMaster = await resQuery("SELECT type, name, tbl_name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'");
  const resTables = resMaster
    .filter((resM) => resM.type === 'table' || resM.type === 'view')
    .map((resM) => ({ name: resM.name, kind: resM.type === 'view' ? 'VIEW' : 'BASE TABLE' }));
  const resCols = [];
  const resFks = [];
  const resIdx = [];
  for (const resT of resTables) {
    for (const resC of await resQuery(`PRAGMA table_info(${resT.name})`)) {
      resCols.push({ t: resT.name, name: resC.name, type: resC.type, nullable: resC.notnull ? 'NO' : 'YES', keyType: resC.pk ? 'PRI' : '', def: resC.dflt_value });
    }
    if (resT.kind !== 'VIEW') {
      for (const resF of await resQuery(`PRAGMA foreign_key_list(${resT.name})`)) {
        resFks.push({ t: resT.name, col: resF.from, refTable: resF.table, refCol: resF.to });
      }
      for (const resI of await resQuery(`PRAGMA index_list(${resT.name})`)) {
        const resInfo = await resQuery(`PRAGMA index_info(${resI.name})`);
        resIdx.push({ t: resT.name, name: resI.name, nonUnique: resI.unique ? 0 : 1, cols: resInfo.map((resX) => resX.name || 'expression').join(',') });
      }
    }
  }
  const resTrig = resMaster
    .filter((resM) => resM.type === 'trigger')
    .map((resM) => {
      const resHead = resM.sql.match(/(BEFORE|AFTER)\s+(INSERT|UPDATE|DELETE)/i) || [];
      return { name: resM.name, tableName: resM.tbl_name, timing: (resHead[1] || '').toUpperCase(), event: (resHead[2] || '').toUpperCase(), body: resM.sql };
    });
  return resShapeSchema(resTables, resCols, resFks, resIdx, resTrig, []);
}

async function resShapeSchema(resTables, resCols, resFks, resIdx, resTrig, resProcs) {
  const resOut = { engine: resDbState.resEngine, note: resDbState.resNote, tables: [], views: [], triggers: resTrig, procedures: resProcs };
  for (const resT of resTables) {
    if (resT.name === 'txn_context') continue; // SQLite helper only
    if (resT.kind === 'VIEW') {
      resOut.views.push(resT.name);
      continue;
    }
    const resCount = await resOne(`SELECT COUNT(*) AS n FROM ${resT.name}`);
    resOut.tables.push({
      name: resT.name,
      rows: Number(resCount.n),
      columns: resCols.filter((resC) => resC.t === resT.name).map(({ t: resSkip, ...resRest }) => resRest),
      foreignKeys: resFks.filter((resF) => resF.t === resT.name).map(({ t: resSkip, ...resRest }) => resRest),
      indexes: resIdx.filter((resI) => resI.t === resT.name).map(({ t: resSkip, ...resRest }) => ({ ...resRest, unique: Number(resRest.nonUnique) === 0 })),
    });
  }
  return resOut;
}
