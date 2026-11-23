// Child process for the crash-recovery demo (started by resCrash.js).
//
// It behaves like a second allocator that gets killed half-way through:
//   step 1  take stock out:      available = available - N
//   (here the parent kills this process with SIGKILL - like a power cut)
//   step 2  book it as given:    allocated = allocated + N
//
// mode=txn     both steps are inside BEGIN ... COMMIT. The kill happens before COMMIT,
//              so the database must throw step 1 away (atomicity + recovery).
// mode=no-txn  autocommit: step 1 is saved on its own, the kill skips step 2,
//              so N units simply vanish. This is why we need transactions.
//
// It prints one JSON line after step 1 and then waits to be killed.

import mysql from 'mysql2/promise';
import { DatabaseSync } from 'node:sqlite';

const [resMode, resZone, resType, resAmountRaw] = process.argv.slice(2);
const resAmount = Math.max(1, parseInt(resAmountRaw, 10) || 1);
const resTxn = resMode !== 'no-txn';
const resSay = (resObj) => process.stdout.write(JSON.stringify(resObj) + '\n');
const resWaitForKill = () => setInterval(() => {}, 1000);

if (process.env.RES_ENGINE === 'mysql') {
  const resConn = await mysql.createConnection(JSON.parse(process.env.RES_MYSQL));
  if (resTxn) await resConn.query('START TRANSACTION');
  await resConn.query("SET @res_actor = 'crash-test child', @res_txn_id = NULL, @res_target = 'crash test'");
  await resConn.query('UPDATE resources SET available = available - ? WHERE zone = ? AND resource_type = ?', [resAmount, resZone, resType]);
  const [[resRow]] = await resConn.query('SELECT available, allocated FROM resources WHERE zone = ? AND resource_type = ?', [resZone, resType]);
  resSay({ stage: 'step1', pid: process.pid, engine: 'mysql', inside: resRow });
  resWaitForKill();
} else {
  const resDb = new DatabaseSync(process.env.RES_SQLITE_FILE);
  resDb.exec('PRAGMA busy_timeout = 5000;');
  if (resTxn) resDb.exec('BEGIN IMMEDIATE');
  resDb.prepare('UPDATE resources SET available = available - ? WHERE zone = ? AND resource_type = ?').run(resAmount, resZone, resType);
  const resRow = resDb.prepare('SELECT available, allocated FROM resources WHERE zone = ? AND resource_type = ?').get(resZone, resType);
  resSay({ stage: 'step1', pid: process.pid, engine: 'sqlite', inside: { ...resRow } });
  resWaitForKill();
}
