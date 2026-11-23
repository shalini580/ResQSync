// Crash-recovery demo: a real process is killed with SIGKILL (kill -9) in the
// middle of a stock update, and we look at what the database kept.
//
//  with a transaction    -> nothing of the half-done work survives (ROLLBACK on recovery)
//  without a transaction -> the half-done work survives and units disappear
//
// SQLite: the killed process leaves a "hot journal"; the next connection that opens
//         the file sees it and rolls the half-done transaction back automatically.
// MySQL:  InnoDB sees the client connection die and rolls its open transaction back
//         using the undo log.

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { resConfig, RES_ZONES, RES_TYPES } from './resConfig.js';
import { resOne, resQuery, resIsMysql, resRestock } from './resDb.js';
import { resChanged, resSyncLog } from './resMonitor.js';

const RES_CHILD = path.join(path.dirname(fileURLToPath(import.meta.url)), 'resCrashWorker.js');
let resBusy = false;

const resStockRow = (resZone, resType) =>
  resOne('SELECT available, allocated FROM resources WHERE zone = ? AND resource_type = ?', [resZone, resType]);

async function resLedgerOk() {
  const resStock = await resQuery('SELECT zone, resource_type, allocated FROM resources');
  const resSums = await resQuery(
    `SELECT zone, SUM(food) AS food, SUM(water) AS water, SUM(medicine) AS medicine, SUM(cots) AS cots,
            SUM(CASE WHEN vehicles_back = 0 THEN vehicles ELSE 0 END) AS vehicles
     FROM rescue_missions GROUP BY zone`
  );
  const resBy = new Map(resSums.map((resS) => [resS.zone, resS]));
  return resStock.every((resR) => Number(resR.allocated) === Number(resBy.get(resR.zone)?.[resR.resource_type] || 0));
}

function resRunChild(resMode, resZone, resType, resAmount) {
  return new Promise((resResolve, resReject) => {
    const resChild = spawn(process.execPath, ['--no-warnings', RES_CHILD, resMode, resZone, resType, String(resAmount)], {
      env: {
        ...process.env,
        RES_ENGINE: resIsMysql() ? 'mysql' : 'sqlite',
        RES_SQLITE_FILE: path.resolve(resConfig.resSqliteFile),
        RES_MYSQL: JSON.stringify(resConfig.resMysql),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let resOut = '';
    let resErr = '';
    let resStep1 = null;
    const resTimer = setTimeout(() => {
      resChild.kill('SIGKILL');
      resReject(new Error('The test process did not answer in time'));
    }, 15000);
    resChild.stderr.on('data', (resD) => { resErr += resD; });
    resChild.stdout.on('data', (resD) => {
      resOut += resD;
      const resLine = resOut.split('\n').find((resL) => resL.startsWith('{'));
      if (resLine && !resStep1) {
        resStep1 = JSON.parse(resLine);
        // step 1 is done and step 2 has not run yet: pull the plug
        setTimeout(() => resChild.kill('SIGKILL'), 150);
      }
    });
    resChild.on('exit', (resCode, resSignal) => {
      clearTimeout(resTimer);
      if (!resStep1) return resReject(new Error(`Test process failed: ${resErr.trim().split('\n').pop() || resCode}`));
      return resResolve({ ...resStep1, signal: resSignal, exitCode: resCode });
    });
  });
}

export async function resCrashTest({ mode: resModeIn, zone: resZoneIn, type: resTypeIn, amount: resAmountIn }, resActor) {
  if (resBusy) throw Object.assign(new Error('A crash test is already running'), { status: 409 });
  const resMode = resModeIn === 'no-txn' ? 'no-txn' : 'txn';
  const resZone = RES_ZONES.includes(resZoneIn) ? resZoneIn : 'Zone A';
  const resType = RES_TYPES.includes(resTypeIn) && resTypeIn !== 'vehicles' ? resTypeIn : 'water';
  const resBefore = await resStockRow(resZone, resType);
  const resAmount = Math.max(1, Math.min(Number(resBefore.available), parseInt(resAmountIn, 10) || 25));
  if (Number(resBefore.available) < 1) throw Object.assign(new Error(`${resZone} has no ${resType} left - restock first`), { status: 409 });

  resBusy = true;
  try {
    const resLedgerBefore = await resLedgerOk();
    resSyncLog('info', `Crash test (${resMode}): child process takes ${resAmount} ${resType} from ${resZone}, then gets kill -9`);
    const resChild = await resRunChild(resMode, resZone, resType, resAmount);
    const resAfter = await resStockRow(resZone, resType); // opening the DB again = recovery
    const resLedgerAfter = await resLedgerOk();
    const resLost = Number(resBefore.available) - Number(resAfter.available);
    const resResult = {
      mode: resMode, engine: resChild.engine, zone: resZone, type: resType, amount: resAmount,
      childPid: resChild.pid, signal: resChild.signal || 'SIGKILL',
      before: { available: Number(resBefore.available), allocated: Number(resBefore.allocated) },
      inside: { available: Number(resChild.inside.available), allocated: Number(resChild.inside.allocated) },
      after: { available: Number(resAfter.available), allocated: Number(resAfter.allocated) },
      lost: resLost, rolledBack: resLost === 0, ledgerBefore: resLedgerBefore, ledgerAfter: resLedgerAfter,
      repaired: false,
    };
    if (resLost > 0) {
      // without a transaction the units really vanished: put them back so the demo leaves no damage
      await resRestock(resZone, resType, resLost, `${resActor} (crash-test repair)`);
      resResult.repaired = true;
    }
    await resQuery(
      `INSERT INTO audit_logs (action, entity_type, entity_id, actor, zone, resource_type, old_value, new_value, details, os_concept, dbms_concept)
       VALUES ('CRASH_TEST', 'resources', 0, ?, ?, ?, ?, ?, ?, 'kill -9 (SIGKILL)', ?)`,
      [resActor, resZone, resType, resResult.before.available, resResult.after.available,
        `${resMode === 'txn' ? 'With' : 'Without'} transaction: child ${resChild.pid} killed after taking ${resAmount}; ` +
        (resResult.rolledBack ? 'database rolled it back' : `${resLost} units lost, repaired`),
        resMode === 'txn' ? 'Atomicity + crash recovery (rollback)' : 'No transaction: partial update survives']
    );
    resSyncLog(resResult.rolledBack ? 'done' : 'error',
      `Crash test: ${resResult.rolledBack ? 'half-done transaction rolled back, stock unchanged' : `${resLost} ${resType} lost without a transaction (repaired)`}`);
    ['stock', 'ledger', 'sync'].forEach(resChanged);
    return resResult;
  } finally {
    resBusy = false;
  }
}
