// Index performance lab: the same query on a big table, without and with an index.
//
// Table lab_bench_reports gets N rows of fake incident reports (only for this lab).
// Query:  SELECT COUNT(*), AVG(people) FROM lab_bench_reports
//         WHERE zone = 'Zone C' AND status = 'open' AND priority = 1
//
// Without an index the database reads EVERY row (full table scan).
// With a composite B-tree index on (zone, status, priority, people) it jumps straight
// to the matching entries - and because people is in the index too (a COVERING index)
// it never has to open the table rows at all. EXPLAIN shows the plan the database chose.

import { resQuery, resIsMysql } from './resDb.js';

const RES_TABLE = 'lab_bench_reports';
const RES_INDEX = 'idx_bench_zone_status_prio';
const RES_SQL = `SELECT COUNT(*) AS matches, AVG(people) AS avg_people FROM ${RES_TABLE}
WHERE zone = 'Zone C' AND status = 'open' AND priority = 1`;
let resBusy = false;

async function resEnsureTable(resRows) {
  if (resIsMysql()) {
    await resQuery(`CREATE TABLE IF NOT EXISTS ${RES_TABLE} (
      id INT AUTO_INCREMENT PRIMARY KEY, zone VARCHAR(10) NOT NULL, status VARCHAR(10) NOT NULL,
      priority TINYINT NOT NULL, people INT NOT NULL, reported_at DATETIME NOT NULL) ENGINE=InnoDB`);
  } else {
    await resQuery(`CREATE TABLE IF NOT EXISTS ${RES_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT, zone TEXT NOT NULL, status TEXT NOT NULL,
      priority INTEGER NOT NULL, people INTEGER NOT NULL, reported_at TEXT NOT NULL)`);
  }
  const [resHave] = await resQuery(`SELECT COUNT(*) AS n FROM ${RES_TABLE}`);
  if (Number(resHave.n) === resRows) return { created: 0, ms: 0 };
  await resQuery(`DELETE FROM ${RES_TABLE}`);
  const resStart = performance.now();
  const resZones = ['Zone A', 'Zone B', 'Zone C', 'Zone D'];
  const resStatus = ['open', 'open', 'closed', 'closed', 'closed', 'closed', 'closed', 'closed'];
  let resSeed = 12345;
  const resRand = () => ((resSeed = (resSeed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let resI = 0; resI < resRows; resI += 1000) {
    const resN = Math.min(1000, resRows - resI);
    const resVals = [];
    const resArgs = [];
    for (let resK = 0; resK < resN; resK++) {
      resVals.push('(?,?,?,?,?)');
      resArgs.push(resZones[Math.floor(resRand() * 4)], resStatus[Math.floor(resRand() * 8)], 1 + Math.floor(resRand() * 4),
        1 + Math.floor(resRand() * 400), '2026-01-01 00:00:00');
    }
    await resQuery(`INSERT INTO ${RES_TABLE} (zone, status, priority, people, reported_at) VALUES ${resVals.join(',')}`, resArgs);
  }
  return { created: resRows, ms: Math.round(performance.now() - resStart) };
}

async function resDropIndex() {
  if (resIsMysql()) {
    const resHas = await resQuery(`SHOW INDEX FROM ${RES_TABLE} WHERE Key_name = ?`, [RES_INDEX]);
    if (resHas.length) await resQuery(`DROP INDEX ${RES_INDEX} ON ${RES_TABLE}`);
  } else {
    await resQuery(`DROP INDEX IF EXISTS ${RES_INDEX}`);
  }
}

async function resPlan() {
  if (resIsMysql()) {
    const resRows = await resQuery(`EXPLAIN ${RES_SQL}`);
    return resRows.map((resR) => ({
      text: `type=${resR.type} key=${resR.key || 'NULL'} rows=${resR.rows} ${resR.Extra || ''}`.trim(),
      scan: resR.type === 'ALL', rowsExamined: Number(resR.rows),
    }));
  }
  const resRows = await resQuery(`EXPLAIN QUERY PLAN ${RES_SQL}`);
  return resRows.map((resR) => ({ text: resR.detail, scan: /^SCAN/.test(resR.detail), rowsExamined: null }));
}

async function resTime(resRuns) {
  const resTimes = [];
  let resOut = null;
  for (let resI = 0; resI < resRuns; resI++) {
    const resStart = performance.now();
    [resOut] = await resQuery(RES_SQL);
    resTimes.push(performance.now() - resStart);
  }
  resTimes.sort((resA, resB) => resA - resB);
  return { medianMs: +resTimes[Math.floor(resTimes.length / 2)].toFixed(2), bestMs: +resTimes[0].toFixed(2), matches: Number(resOut.matches) };
}

export async function resIndexBench(resRowsIn) {
  if (resBusy) throw Object.assign(new Error('The index test is already running'), { status: 409 });
  const resRows = Math.min(300000, Math.max(10000, parseInt(resRowsIn, 10) || 100000));
  resBusy = true;
  try {
    const resFill = await resEnsureTable(resRows);
    await resDropIndex();
    const resPlanBefore = await resPlan();
    const resBefore = await resTime(7);

    const resIdxStart = performance.now();
    await resQuery(`CREATE INDEX ${RES_INDEX} ON ${RES_TABLE} (zone, status, priority, people)`);
    const resIndexMs = Math.round(performance.now() - resIdxStart);
    const resPlanAfter = await resPlan();
    const resAfter = await resTime(7);

    return {
      engine: resIsMysql() ? 'mysql' : 'sqlite', rows: resRows, fill: resFill, sql: RES_SQL,
      index: `CREATE INDEX ${RES_INDEX} ON ${RES_TABLE} (zone, status, priority, people)`, indexBuildMs: resIndexMs,
      before: { ...resBefore, plan: resPlanBefore },
      after: { ...resAfter, plan: resPlanAfter },
      speedup: +(resBefore.medianMs / Math.max(0.01, resAfter.medianMs)).toFixed(1),
    };
  } finally {
    resBusy = false;
  }
}
