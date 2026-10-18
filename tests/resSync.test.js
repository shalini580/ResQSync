// End-to-end checks. Start the server first (npm run dev), then: npm run test:sync
// Works the same whether the server is on MySQL or SQLite.

const RES_BASE = process.env.BASE_URL || 'http://localhost:3000/api';
const resSleep = (resMs) => new Promise((resR) => setTimeout(resR, resMs));
let resPassed = 0;
let resFailed = 0;

function resCheck(resName, resOk, resDetail = '') {
  resOk ? resPassed++ : resFailed++;
  console.log(`${resOk ? 'PASS' : 'FAIL'}  ${resName}${resDetail ? '  - ' + resDetail : ''}`);
}

async function resCall(resPath, { resToken, resMethod = 'GET', resBody } = {}) {
  const resR = await fetch(RES_BASE + resPath, {
    method: resMethod,
    headers: { 'content-type': 'application/json', ...(resToken ? { authorization: `Bearer ${resToken}` } : {}) },
    body: resBody ? JSON.stringify(resBody) : undefined,
  });
  return { status: resR.status, data: await resR.json().catch(() => ({})) };
}

async function resLogin(resEmail, resPassword = 'password123') {
  const { data: resD } = await resCall('/auth/login', { resMethod: 'POST', resBody: { email: resEmail, password: resPassword } });
  if (!resD.token) throw new Error('login failed for ' + resEmail);
  return resD.token;
}

async function resWaitFor(resFn, resMs = 60000) {
  const resEnd = Date.now() + resMs;
  while (Date.now() < resEnd) {
    if (await resFn()) return true;
    await resSleep(400);
  }
  return false;
}

const resAdmin = await resLogin('admin@gmail.com', 'admin123');
const resNgo = await resLogin('shantingo@gmail.com');
const resVol = await resLogin('alex@gmail.com');

const resStock = async (resZone, resType) =>
  (await resCall('/resources', { resToken: resAdmin })).data.find((resR) => resR.zone === resZone && resR.resource_type === resType);
const resQueue = async () => (await resCall('/queue', { resToken: resAdmin })).data;
const resAllocate = () => resCall('/admin/allocate', { resToken: resAdmin, resMethod: 'POST' });
const resSettle = async () => {
  await resSleep(600);
  return resWaitFor(async () => {
    const { data: resS } = await resCall('/sync', { resToken: resAdmin });
    return resS.readyQueue.length === 0 && resS.workers.every((resW) => resW.state === 'idle');
  }, 120000);
};

console.log('Database engine:', (await resCall('/me', { resToken: resAdmin })).data.database.engine);

// serve the demo data first
await resAllocate();
await resSettle();

// 1. priority with scarce stock
{
  const resZone = 'Zone A';
  const resHave = (await resStock(resZone, 'medicine')).available;
  const resMk = async (resTitle, resP) =>
    (await resCall('/cases', { resToken: resAdmin, resMethod: 'POST', resBody: { title: resTitle, case_type: 'medical', zone: resZone, priority: resP, medicine: resHave } })).data.id;
  const resLow = await resMk('Test P4 asked first', 4);
  await resSleep(1100);
  const resHigh = await resMk('Test P1 asked later', 1);
  let resRows = await resQueue();
  resCheck('new cases stay pending until the admin allocates',
    resRows.find((resR) => resR.kind === 'case' && resR.id === resLow)?.stage === 'pending');
  await resAllocate();
  await resSettle();
  resRows = await resQueue();
  const resLowRow = resRows.find((resR) => resR.kind === 'case' && resR.id === resLow);
  resCheck('P1 served before an older P4 when stock is short',
    !resRows.some((resR) => resR.kind === 'case' && resR.id === resHigh) && resLowRow?.medicine === resHave);
  await resCall('/resources/restock', { resToken: resAdmin, resMethod: 'POST', resBody: { zone: resZone, type: 'medicine', amount: resHave } });
  resCheck('restock wakes the waiting P4 and it is fulfilled',
    await resWaitFor(async () => !(await resQueue()).some((resR) => resR.kind === 'case' && resR.id === resLow)));
}

// 2. same priority + same arrival -> smaller id first
{
  const resZone = 'Zone C';
  const resHave = (await resStock(resZone, 'medicine')).available;
  const resMk = (resT) => resCall('/cases', { resToken: resAdmin, resMethod: 'POST', resBody: { title: resT, zone: resZone, priority: 2, medicine: resHave } }).then((resR) => resR.data.id);
  const [resA, resB] = await Promise.all([resMk('Tie test A'), resMk('Tie test B')]);
  await resAllocate();
  await resSettle();
  const resRows = await resQueue();
  const resFirst = Math.min(resA, resB);
  const resSecond = Math.max(resA, resB);
  resCheck('tie broken by smaller id (FCFS)',
    !resRows.some((resR) => resR.kind === 'case' && resR.id === resFirst) && resRows.some((resR) => resR.kind === 'case' && resR.id === resSecond));
  await resCall('/resources/restock', { resToken: resAdmin, resMethod: 'POST', resBody: { zone: resZone, type: 'medicine', amount: resHave } });
  await resWaitFor(async () => !(await resQueue()).some((resR) => resR.kind === 'case' && resR.id === resSecond));
}

// 3. many cases at once, same zone
{
  await resCall('/admin/stress', { resToken: resAdmin, resMethod: 'POST', resBody: { count: 10, zone: 'Zone B' } });
  await resAllocate();
  resCheck('10 simultaneous cases drained by the workers', await resSettle());
  const { data: resAll } = await resCall('/resources', { resToken: resAdmin });
  resCheck('no stock ever went negative', resAll.every((resR) => resR.available >= 0));
}

// 4. NGO request + duplicate block
{
  const resBody = { title: 'Duplicate check', zone: 'Zone B', priority: 3, food: 5 };
  const resOne = await resCall('/requests', { resToken: resNgo, resMethod: 'POST', resBody });
  const resTwo = await resCall('/requests', { resToken: resNgo, resMethod: 'POST', resBody });
  resCheck('the same open request cannot be entered twice', resOne.status === 201 && resTwo.status === 409);
  const resPending = await resLogin('seva@gmail.com');
  const resBlocked = await resCall('/requests', { resToken: resPending, resMethod: 'POST', resBody: { ...resBody, title: 'x' } });
  resCheck('unverified NGO is not allowed to raise requests', resBlocked.status === 403);
}

// 5. mission flow: claim -> pickup -> in transit -> delivered -> NGO confirms -> trigger gives XP
{
  await resAllocate();
  await resSettle();
  const { data: resMissions } = await resCall('/missions', { resToken: resVol });
  const resOpen = resMissions.find((resM) => resM.status === 'open' && resM.kind === 'request');
  const resBefore = (await resCall('/me', { resToken: resVol })).data.volunteer.xp;
  if (!resOpen) resCheck('an open request mission exists', false);
  else {
    await resCall(`/missions/${resOpen.id}/claim`, { resToken: resVol, resMethod: 'POST' });
    for (let resI = 0; resI < 3; resI++) await resCall(`/missions/${resOpen.id}/advance`, { resToken: resVol, resMethod: 'POST' });
    const resConfirm = await resCall(`/missions/${resOpen.id}/confirm`, { resToken: resAdmin, resMethod: 'POST' });
    const resAfter = (await resCall('/me', { resToken: resVol })).data.volunteer.xp;
    resCheck('mission stages + confirm -> trigger adds 50 XP', resConfirm.status === 200 && resAfter === resBefore + 50, `${resBefore} -> ${resAfter}`);
  }
}

// 6. DBMS lab: lock race, trigger, rollback
{
  const { data: resRace } = await resCall('/dbms/race/claim', { resToken: resAdmin, resMethod: 'POST', resBody: { clients: 6 } });
  resCheck('6 clients call sp_DispatchRescueMission at once -> exactly 1 winner', resRace.winners === 1);
  const { data: resUnder } = await resCall('/dbms/test-underflow', { resToken: resAdmin, resMethod: 'POST', resBody: { zone: 'Zone A', type: 'food' } });
  resCheck('underflow trigger rejects stock -5, stock unchanged', resUnder.blocked && resUnder.before === resUnder.after, resUnder.message);
  const { data: resRb } = await resCall('/admin/rollback-test', { resToken: resAdmin, resMethod: 'POST', resBody: { zone: 'Zone A', type: 'water', amount: 30 } });
  resCheck('ROLLBACK restores stock and removes the trigger audit row', resRb.ok, `${resRb.before} -> ${resRb.seenInside} -> ${resRb.after}`);
}

// 7. surplus food: alert trigger + pickup flow
{
  const resRest = await resLogin('marcus@gmail.com');
  const resBeforeNotes = (await resCall('/notifications', { resToken: resNgo })).data.items.length;
  await resCall('/surplus', { resToken: resRest, resMethod: 'POST', resBody: { title: 'Test biryani', servings: 90, zone: 'Zone B', expiry_hours: 3 } });
  const resNotes = (await resCall('/notifications', { resToken: resNgo })).data.items;
  resCheck('surplus of 80+ servings fires the alert trigger', resNotes.length > resBeforeNotes && resNotes[0].title.includes('surplus'));
  const resItem = (await resCall('/surplus', { resToken: resNgo })).data.find((resS) => resS.title === 'Test biryani');
  const resR1 = await resCall(`/surplus/${resItem.id}/reserve`, { resToken: resNgo, resMethod: 'POST' });
  const resR2 = await resCall(`/surplus/${resItem.id}/picked-up`, { resToken: resRest, resMethod: 'POST' });
  const resR3 = await resCall(`/surplus/${resItem.id}/delivered`, { resToken: resNgo, resMethod: 'POST' });
  resCheck('surplus pickup tracking: reserved -> picked up -> delivered', [resR1, resR2, resR3].every((resR) => resR.status === 200));
}

// 8. C kernel
{
  const { data: resK } = await resCall('/lab/kernel', { resToken: resAdmin });
  if (!resK.ok) resCheck('C kernel compiled', false, resK.hint);
  else {
    const resProcs = [
      { pid: 'P1', arrival: 0, burst: 5, priority: 2 }, { pid: 'P2', arrival: 1, burst: 3, priority: 1 },
      { pid: 'P3', arrival: 2, burst: 8, priority: 4 }, { pid: 'P4', arrival: 3, burst: 6, priority: 3 },
    ];
    const { data: resCmp } = await resCall('/lab/compare', { resToken: resAdmin, resMethod: 'POST', resBody: { quantum: 2, processes: resProcs } });
    resCheck('C kernel runs all 5 scheduling algorithms', resCmp.results?.length === 5);
    const { data: resMx } = await resCall('/lab/mutex', { resToken: resAdmin, resMethod: 'POST', resBody: { threads: 4, iterations: 20000 } });
    resCheck('pthread mutex keeps the count right (no lost updates)', resMx.withMutex?.finalStock === 0, `without mutex lost ${resMx.withoutMutex?.lostUpdates}`);
    const { data: resBk } = await resCall('/lab/bankers', { resToken: resAdmin, resMethod: 'POST', resBody: {
      names: ['P0', 'P1', 'P2', 'P3', 'P4'], available: [3, 3, 2],
      max: [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]],
      allocation: [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]],
    } });
    resCheck("Banker's algorithm finds the textbook safe sequence", resBk.safe && resBk.sequence.join(',') === 'P1,P3,P4,P0,P2', resBk.sequence?.join(' '));
  }
}

// 9. ledger
{
  const { data: resI } = await resCall('/admin/integrity', { resToken: resAdmin });
  resCheck('stock ledger balances (allocated == sum of missions)', resI.ok, `${resI.checked} rows`);
}

console.log(`\n${resPassed} passed, ${resFailed} failed`);
process.exit(resFailed ? 1 : 0);
