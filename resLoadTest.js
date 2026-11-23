// Load test. Start the server first (npm run dev), then: npm run test:load
//
//   CLIENTS=50 REQUESTS=20 npm run test:load
//
// 1. Read load   - CLIENTS users at the same time, each sends REQUESTS GETs
//                  (queue, stock, missions, surplus, notifications). Measures latency.
// 2. Write load  - CLIENTS cases are created at the same moment, then allocated
//                  by the worker threads. Afterwards the stock ledger must still balance.
// 3. Lock race   - 10 clients try to claim ONE mission with SELECT ... FOR UPDATE:
//                  exactly one must win.
// Works on MySQL and SQLite.

const RES_BASE = process.env.BASE_URL || 'http://localhost:3000/api';
const RES_CLIENTS = Math.max(1, parseInt(process.env.CLIENTS, 10) || 50);
const RES_REQUESTS = Math.max(1, parseInt(process.env.REQUESTS, 10) || 20);
const resSleep = (resMs) => new Promise((resR) => setTimeout(resR, resMs));

let resPassed = 0;
let resFailed = 0;
function resCheck(resName, resOk, resDetail = '') {
  resOk ? resPassed++ : resFailed++;
  console.log(`${resOk ? 'PASS' : 'FAIL'}  ${resName}${resDetail ? '  - ' + resDetail : ''}`);
}

async function resCall(resPath, { resToken, resMethod = 'GET', resBody } = {}) {
  const resStart = performance.now();
  const resR = await fetch(RES_BASE + resPath, {
    method: resMethod,
    headers: { 'content-type': 'application/json', ...(resToken ? { authorization: `Bearer ${resToken}` } : {}) },
    body: resBody ? JSON.stringify(resBody) : undefined,
  });
  const resData = await resR.json().catch(() => ({}));
  return { status: resR.status, data: resData, ms: performance.now() - resStart };
}

async function resLogin(resEmail, resPassword = 'password123') {
  const { data: resD } = await resCall('/auth/login', { resMethod: 'POST', resBody: { email: resEmail, password: resPassword } });
  if (!resD.token) throw new Error(`login failed for ${resEmail} - is the server running (npm run dev)?`);
  return resD.token;
}

function resStats(resTimes) {
  const resS = [...resTimes].sort((resA, resB) => resA - resB);
  const resAt = (resP) => resS[Math.min(resS.length - 1, Math.floor((resP / 100) * resS.length))];
  const resAvg = resS.reduce((resA, resB) => resA + resB, 0) / (resS.length || 1);
  return { avg: resAvg.toFixed(1), p50: resAt(50).toFixed(1), p95: resAt(95).toFixed(1), p99: resAt(99).toFixed(1), max: resS[resS.length - 1].toFixed(1) };
}

async function resSettle() {
  const resEnd = Date.now() + 180000;
  await resSleep(500);
  while (Date.now() < resEnd) {
    const { data: resS } = await resCall('/sync', { resToken: resAdmin });
    if (resS.readyQueue.length === 0 && resS.workers.every((resW) => resW.state === 'idle')) return true;
    await resSleep(500);
  }
  return false;
}

const resAdmin = await resLogin('admin@gmail.com', 'admin123');
const resTokens = {
  admin: resAdmin,
  ngo: await resLogin('shantingo@gmail.com'),
  restaurant: await resLogin('marcus@gmail.com'),
  volunteer: await resLogin('alex@gmail.com'),
};
const resEngine = (await resCall('/me', { resToken: resAdmin })).data.database?.engine;
console.log(`ResQSync load test: ${RES_CLIENTS} clients x ${RES_REQUESTS} requests, database ${resEngine}\n`);

// ------------------------------------------------------------------ 1. read load
{
  const resPlan = [
    ['admin', '/queue'], ['admin', '/resources'], ['admin', '/missions'], ['admin', '/notifications'],
    ['ngo', '/queue'], ['ngo', '/surplus'], ['restaurant', '/surplus'], ['volunteer', '/missions'], ['volunteer', '/leaderboard'], ['ngo', '/history'],
  ];
  const resTimes = [];
  let resErrors = 0;
  const resStart = performance.now();
  await Promise.all(Array.from({ length: RES_CLIENTS }, async (_, resC) => {
    for (let resI = 0; resI < RES_REQUESTS; resI++) {
      const [resRole, resPath] = resPlan[(resC + resI) % resPlan.length];
      const resR = await resCall(resPath, { resToken: resTokens[resRole] }).catch(() => ({ status: 0, ms: 0 }));
      if (resR.status !== 200) resErrors++;
      else resTimes.push(resR.ms);
    }
  }));
  const resSecs = (performance.now() - resStart) / 1000;
  const resTotal = RES_CLIENTS * RES_REQUESTS;
  const resS = resStats(resTimes.length ? resTimes : [0]);
  console.log(`Read load: ${resTotal} requests in ${resSecs.toFixed(2)} s = ${(resTotal / resSecs).toFixed(0)} req/s`);
  console.log(`  latency ms: avg ${resS.avg}, p50 ${resS.p50}, p95 ${resS.p95}, p99 ${resS.p99}, max ${resS.max}`);
  resCheck(`${resTotal} parallel reads, no errors`, resErrors === 0, `${resErrors} errors`);
  resCheck('95% of reads answered under 1 second', Number(resS.p95) < 1000, `p95 ${resS.p95} ms`);
}

// ------------------------------------------------------------------ 2. write load
{
  const resTag = Date.now().toString(36);
  const resStart = performance.now();
  const resOut = await Promise.all(Array.from({ length: RES_CLIENTS }, (_, resI) => resCall('/cases', {
    resToken: resAdmin,
    resMethod: 'POST',
    resBody: {
      title: `Load test ${resTag}-${resI}`,
      case_type: ['flood', 'fire', 'medical', 'earthquake'][resI % 4],
      zone: ['Zone A', 'Zone B', 'Zone C', 'Zone D'][resI % 4],
      priority: 1 + (resI % 4),
      people_affected: 5 + resI,
      water: 1,
    },
  })));
  const resSecs = (performance.now() - resStart) / 1000;
  const resMade = resOut.filter((resR) => resR.status === 201).length;
  console.log(`\nWrite load: ${RES_CLIENTS} cases created at once in ${resSecs.toFixed(2)} s`);
  resCheck(`${RES_CLIENTS} parallel inserts all saved (unique process ids)`, resMade === RES_CLIENTS, `${resMade} created`);

  const resAllocStart = performance.now();
  await resCall('/admin/allocate', { resToken: resAdmin, resMethod: 'POST' });
  const resDone = await resSettle();
  console.log(`  worker threads finished the queue in ${((performance.now() - resAllocStart) / 1000).toFixed(1)} s`);
  const { data: resI } = await resCall('/admin/integrity', { resToken: resAdmin });
  resCheck('after the load, every stock row still matches the mission ledger', resDone && resI.ok, `${resI.checked} rows checked`);
  const { data: resRes } = await resCall('/resources', { resToken: resAdmin });
  resCheck('no stock below zero', resRes.every((resR) => Number(resR.available) >= 0));
}

// ------------------------------------------------------------------ 3. lock race
{
  const { data: resRace, status: resSt } = await resCall('/dbms/race/claim', { resToken: resAdmin, resMethod: 'POST', resBody: { clients: 10 } });
  console.log('');
  resCheck('10 clients claim one mission: exactly one wins (row lock)', resSt === 200 && resRace.winners === 1,
    resSt === 200 ? `${resRace.winners} winner, ${resRace.clients - resRace.winners} rejected` : `status ${resSt}`);
}

console.log(`\n${resPassed} passed, ${resFailed} failed`);
process.exit(resFailed ? 1 : 0);
