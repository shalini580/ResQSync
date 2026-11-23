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
  const resMk = (resT) => resCall('/cases', { resToken: resAdmin, resMethod: 'POST', resBody: { title: resT, zone: resZone, priority: 2, medicine: resHave, loc_x: 4, loc_y: 16, people_affected: 50 } }).then((resR) => resR.data.id);
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

// 10. location: same priority -> the case nearer the depot goes first
{
  const resZone = 'Zone B'; // depot at (15, 5)
  // earlier tests may have used up the stock: top it up so both cases are valid
  if ((await resStock(resZone, 'medicine')).available < 10) {
    await resCall('/resources/restock', { resToken: resAdmin, resMethod: 'POST', resBody: { zone: resZone, type: 'medicine', amount: 20 } });
  }
  const resHave = (await resStock(resZone, 'medicine')).available;
  const resMk = (resT, resX, resY) => resCall('/cases', { resToken: resAdmin, resMethod: 'POST', resBody: {
    title: resT, case_type: 'other', zone: resZone, priority: 3, medicine: resHave, loc_x: resX, loc_y: resY, people_affected: 30,
  } }).then((resR) => resR.data.id);
  const [resFar, resNear] = await Promise.all([resMk('Location test far', 19.6, 9.6), resMk('Location test near', 15.2, 5.1)]);
  await resAllocate();
  await resSettle();
  const resRows = await resQueue();
  resCheck('same priority: nearer case served first (location factor)',
    !resRows.some((resR) => resR.kind === 'case' && resR.id === resNear) && resRows.some((resR) => resR.kind === 'case' && resR.id === resFar),
    `far case distance ${resRows.find((resR) => resR.id === resFar && resR.kind === 'case')?.distance} km`);
  await resCall('/resources/restock', { resToken: resAdmin, resMethod: 'POST', resBody: { zone: resZone, type: 'medicine', amount: resHave } });
  await resWaitFor(async () => !(await resQueue()).some((resR) => resR.kind === 'case' && resR.id === resFar));
}

// 11. emergency beats location: a far P1 is still served before a near P3
{
  const resZone = 'Zone C'; // depot at (5, 15)
  if ((await resStock(resZone, 'cots')).available < 10) {
    await resCall('/resources/restock', { resToken: resAdmin, resMethod: 'POST', resBody: { zone: resZone, type: 'cots', amount: 20 } });
  }
  const resHave = (await resStock(resZone, 'cots')).available;
  const resMk = (resT, resP, resX, resY) => resCall('/cases', { resToken: resAdmin, resMethod: 'POST', resBody: {
    title: resT, case_type: 'other', zone: resZone, priority: resP, cots: resHave, loc_x: resX, loc_y: resY, people_affected: 30,
  } }).then((resR) => resR.data.id);
  const [resNearLow, resFarHigh] = await Promise.all([resMk('Emergency test near P3', 3, 5.1, 15.1), resMk('Emergency test far P1', 1, 0.4, 19.6)]);
  await resAllocate();
  await resSettle();
  const resRows = await resQueue();
  resCheck('emergency first: far P1 served before near P3',
    !resRows.some((resR) => resR.kind === 'case' && resR.id === resFarHigh) && resRows.some((resR) => resR.kind === 'case' && resR.id === resNearLow));
  await resCall('/resources/restock', { resToken: resAdmin, resMethod: 'POST', resBody: { zone: resZone, type: 'cots', amount: resHave } });
  await resWaitFor(async () => !(await resQueue()).some((resR) => resR.kind === 'case' && resR.id === resNearLow));
}

// 12. ML model
{
  const { data: resM } = await resCall('/ml/model', { resToken: resAdmin });
  resCheck('ML model beats the priority-only rule on test data', resM.model.test.accuracy > resM.model.baseline.accuracy,
    `${resM.model.test.accuracy}% vs ${resM.model.baseline.accuracy}%, AUC ${resM.model.test.auc}%`);
  const resHot = (await resCall('/ml/predict', { resToken: resAdmin, resMethod: 'POST', resBody: { priority: 2, case_type: 'medical', people_affected: 900, wait_min: 100, medicine: 60, water: 10, zone: 'Zone A' } })).data;
  const resCold = (await resCall('/ml/predict', { resToken: resAdmin, resMethod: 'POST', resBody: { priority: 2, case_type: 'other', people_affected: 5, wait_min: 0, food: 20, zone: 'Zone A' } })).data;
  resCheck('very high risk P2 is moved up to P1, a low risk one is not', resHot.promoted && resHot.effective === 1 && !resCold.promoted,
    `risk ${resHot.risk} vs ${resCold.risk}`);
}

// 13. feedback & ratings
{
  const { data: resAll } = await resCall('/missions', { resToken: resAdmin });
  const resDone = resAll.find((resM) => resM.status === 'completed' && resM.volunteer_id);
  if (!resDone) resCheck('a completed mission exists to rate', false);
  else {
    const resNotesBefore = (await resCall('/notifications', { resToken: resAdmin })).data.items[0]?.id || 0;
    const resR1 = await resCall('/feedback', { resToken: resAdmin, resMethod: 'POST', resBody: { context: 'mission', context_id: resDone.id, rating: 2, comment: 'Late delivery' } });
    const resR2 = await resCall('/feedback', { resToken: resAdmin, resMethod: 'POST', resBody: { context: 'mission', context_id: resDone.id, rating: 5 } });
    resCheck('rating saved once, second rating of the same delivery refused (UNIQUE)', resR1.status === 201 && resR2.status === 409);
    const resTop = (await resCall('/notifications', { resToken: resAdmin })).data.items[0];
    resCheck('low rating fires trigger trg_low_rating_alert', resTop && resTop.id > resNotesBefore && resTop.title.startsWith('Low rating'));
    const resBad = await resCall('/feedback', { resToken: resVol, resMethod: 'POST', resBody: { context: 'mission', context_id: resDone.id, rating: 9 } });
    resCheck('rating outside 1-5 is rejected', resBad.status === 400);
  }
}

// 14. profile editing
{
  const resNewSkills = `First aid, boat rescue ${Date.now() % 1000}`;
  const resUpd = await resCall('/me', { resToken: resVol, resMethod: 'PATCH', resBody: { name: 'Alex Rivera', zone: 'Zone A', phone: '+91 9000000001', volunteer: { skills: resNewSkills } } });
  const resMe = (await resCall('/me', { resToken: resVol })).data;
  resCheck('profile edit saves name, phone and skills', resUpd.status === 200 && resMe.phone === '+91 9000000001' && resMe.volunteer.skills === resNewSkills);
  const resWrong = await resCall('/me/password', { resToken: resVol, resMethod: 'POST', resBody: { current: 'nope', next: 'newpass123' } });
  const resRight = await resCall('/me/password', { resToken: resVol, resMethod: 'POST', resBody: { current: 'password123', next: 'newpass123' } });
  let resLoginOk = false;
  try { await resLogin('alex@gmail.com', 'newpass123'); resLoginOk = true; } catch { resLoginOk = false; }
  await resCall('/me/password', { resToken: resVol, resMethod: 'POST', resBody: { current: 'newpass123', next: 'password123' } });
  resCheck('password change needs the current password, then the new one works', resWrong.status === 401 && resRight.status === 200 && resLoginOk);
}

// 15. compliance report
{
  const resToday = new Date().toISOString().slice(0, 10);
  const { status: resSt, data: resRep } = await resCall(`/reports/compliance?from=${resToday}&to=${resToday}`, { resToken: resAdmin });
  resCheck('compliance report has SLA per priority, zone totals and checks',
    resSt === 200 && resRep.byPriority.length === 4 && resRep.byZone.length === 4 && resRep.checks.length >= 5, `${resRep.summary?.logged} logged today`);
  const resCsv = await fetch(`${RES_BASE}/reports/compliance.csv?from=${resToday}&to=${resToday}`, { headers: { authorization: `Bearer ${resAdmin}` } });
  resCheck('compliance report downloads as CSV', resCsv.ok && (await resCsv.text()).startsWith('ResQSync compliance report'));
}

// 16. backup & recovery
{
  await resSettle();
  const { status: resSt, data: resB } = await resCall('/admin/backups', { resToken: resAdmin, resMethod: 'POST' });
  resCheck('backup file created', resSt === 201 && resB.counts?.users > 0, `${resB.file}`);
  const resAfter = await resCall('/cases', { resToken: resAdmin, resMethod: 'POST', resBody: { title: 'Made after the backup', zone: 'Zone A', priority: 4, food: 1 } });
  const resRestore = await resCall(`/admin/backups/${resB.file}/restore`, { resToken: resAdmin, resMethod: 'POST' });
  const resGone = !(await resQueue()).some((resR) => resR.kind === 'case' && resR.id === resAfter.data.id);
  resCheck('restore brings the database back to the backup (case made later is gone)', resRestore.status === 200 && resGone,
    `txn #${resRestore.data.txnId}, safety copy ${resRestore.data.safetyCopy}`);
  const { data: resI } = await resCall('/admin/integrity', { resToken: resAdmin });
  resCheck('ledger still balances after restore', resI.ok);
}

// 17. expired-food archiving
{
  const resBefore = (await resCall('/surplus/archive', { resToken: resAdmin })).data;
  const { status: resSt, data: resOut } = await resCall('/admin/archive-expired', { resToken: resAdmin, resMethod: 'POST', resBody: { all: true } });
  const resAfter = (await resCall('/surplus/archive', { resToken: resAdmin })).data;
  const { data: resLive } = await resCall('/surplus', { resToken: resAdmin });
  resCheck('expired food is moved to the archive in one transaction',
    resSt === 200 && resOut.moved >= 1 && resAfter.donations === resBefore.donations + resOut.moved && !resLive.some((resS) => resS.status === 'expired'),
    `${resOut.moved} moved, txn #${resOut.txnId}`);
  const { data: resAgain } = await resCall('/admin/archive-expired', { resToken: resAdmin, resMethod: 'POST', resBody: { all: true } });
  resCheck('archiving twice moves nothing the second time', resAgain.moved === 0);
}

// 18. Disaster Drill: same incidents, three schedulers
{
  const { status: resSt, data: resD } = await resCall('/drill/run', { resToken: resAdmin, resMethod: 'POST', resBody: { scenario: 'earthquake', zone: 'Zone C', count: 30, teams: 4, seed: 7 } });
  const resBy = Object.fromEntries((resD.runs || []).map((resR) => [resR.policy, resR.metrics]));
  resCheck('drill: every scheduler served all 30 incidents', resSt === 200 && resD.runs.every((resR) => resR.served.length === 30));
  resCheck('drill: ResQSync reaches P1 incidents sooner than FCFS', resBy.resqsync.p1AvgResponse < resBy.fcfs.p1AvgResponse,
    `P1 ${resBy.fcfs.p1AvgResponse} -> ${resBy.resqsync.p1AvgResponse} min`);
  const { data: resLive } = await resCall('/drill/live', { resToken: resAdmin, resMethod: 'POST', resBody: { scenario: 'flood', zone: 'Zone A', count: 4 } });
  resCheck('live drill turns incidents into real cases', resLive.created?.length === 4, resLive.created?.map((resC) => resC.process_id).join(' '));
  await resSettle();
}

// 19. crash recovery: kill -9 in the middle of a stock update
{
  const { data: resT } = await resCall('/admin/crash-test', { resToken: resAdmin, resMethod: 'POST', resBody: { mode: 'txn', zone: 'Zone B', type: 'cots', amount: 5 } });
  resCheck('crash inside a transaction: the half-done work is rolled back', resT.rolledBack === true && resT.inside?.available === resT.before?.available - 5,
    `${resT.before?.available} -> ${resT.inside?.available} (killed) -> ${resT.after?.available}`);
  const { data: resN } = await resCall('/admin/crash-test', { resToken: resAdmin, resMethod: 'POST', resBody: { mode: 'no-txn', zone: 'Zone B', type: 'cots', amount: 5 } });
  resCheck('crash without a transaction: units are lost (then repaired)', resN.lost === 5 && resN.repaired === true);
  const { data: resI } = await resCall('/admin/integrity', { resToken: resAdmin });
  resCheck('ledger still balances after both crashes', resI.ok);
}

// 20. Banker's algorithm on the fleet
{
  const { resBankerSafe, resBankerTry } = await import('../server/resBanker.js');
  // fleet 4: A holds 2 and needs 1 more, C needs 3, 2 vehicles are parked
  const resProcs = [{ pid: 'A', alloc: 2, remaining: 1 }, { pid: 'C', alloc: 0, remaining: 3 }];
  resCheck("Banker's: current state is safe", resBankerSafe(resProcs, 2).safe);
  resCheck("Banker's: giving C both parked vehicles is unsafe", resBankerTry(resProcs, 2, 'C', 2).safe === false);
  resCheck("Banker's: giving A its last vehicle is safe", resBankerTry(resProcs, 2, 'A', 1).safe === true);
  const { data: resLive } = await resCall('/banker/live', { resToken: resAdmin });
  resCheck("Banker's: worker threads logged vehicle decisions", resLive.decisions?.length > 0, `${resLive.decisions?.length} decisions`);
}

// 21. vehicles come back after a completed mission
{
  const { data: resMissions } = await resCall('/missions', { resToken: resVol });
  const resM = resMissions.find((resX) => resX.status === 'open' && Number(resX.vehicles) > 0);
  if (!resM) resCheck('an open mission with vehicles exists', false);
  else {
    const resBefore = await resStock(resM.zone, 'vehicles');
    await resCall(`/missions/${resM.id}/claim`, { resToken: resVol, resMethod: 'POST' });
    for (let resI = 0; resI < 3; resI++) await resCall(`/missions/${resM.id}/advance`, { resToken: resVol, resMethod: 'POST' });
    await resCall(`/missions/${resM.id}/confirm`, { resToken: resAdmin, resMethod: 'POST' });
    await resSettle();
    const resAfter = await resStock(resM.zone, 'vehicles');
    const { data: resI } = await resCall('/admin/integrity', { resToken: resAdmin });
    resCheck('completed mission returns its vehicles to the depot', resAfter.allocated === resBefore.allocated - Number(resM.vehicles) && resI.ok,
      `${resM.vehicles} back in ${resM.zone}, allocated ${resBefore.allocated} -> ${resAfter.allocated}`);
  }
}

// 22. smart text report
{
  const { data: resP } = await resCall('/parse-report', { resToken: resNgo, resMethod: 'POST', resBody: { text: 'Aag lagi hai Market Street pe, 40 log ghayal, 2 ambulance chahiye, urgent' } });
  resCheck('text report: type, priority, people and vehicles read correctly',
    resP.form?.case_type === 'fire' && resP.form.priority === 1 && resP.form.people_affected === 40 && resP.form.vehicles === 2, resP.form?.title);
}

// 23. route planning (Dijkstra)
{
  await resCall('/admin/roads/clear', { resToken: resAdmin, resMethod: 'POST' });
  const { data: resR } = await resCall('/route?zone=Zone%20A&x=2.4&y=8.6', { resToken: resAdmin });
  resCheck('route: Dijkstra crosses the river on a bridge', resR.reachable && resR.bridges.length === 1 && resR.km >= resR.straightKm, `${resR.km} km, ${resR.minutes} min`);
  await resCall('/admin/roads/toggle', { resToken: resAdmin, resMethod: 'POST', resBody: { x: 2.5, y: 7.4 } });
  const { data: resR2 } = await resCall('/route?zone=Zone%20A&x=2.4&y=8.6', { resToken: resAdmin });
  resCheck('route: closing the bridge forces a longer way round', resR2.reachable && resR2.minutes > resR.minutes, `${resR.minutes} -> ${resR2.minutes} min`);
  await resCall('/admin/roads/clear', { resToken: resAdmin, resMethod: 'POST' });
}

// 24. forecast + index lab
{
  const { data: resF } = await resCall('/forecast', { resToken: resAdmin });
  resCheck('forecast covers every zone and resource', resF.rows?.length === 20 && resF.rows.every((resR) => ['ok', 'watch', 'critical', 'short'].includes(resR.status)));
  const { data: resIx } = await resCall('/dbms/index-bench', { resToken: resAdmin, resMethod: 'POST', resBody: { rows: 20000 } });
  resCheck('index lab: the index replaces the full table scan and is faster', resIx.before?.plan.some((resP) => resP.scan) && !resIx.after.plan.some((resP) => resP.scan) && resIx.speedup > 1,
    `${resIx.before?.medianMs} ms -> ${resIx.after?.medianMs} ms`);
}

console.log(`\n${resPassed} passed, ${resFailed} failed`);
process.exit(resFailed ? 1 : 0);
