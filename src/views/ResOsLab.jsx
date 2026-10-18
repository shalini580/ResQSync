// OS lab - every button here runs the real C program (c_engine/) and shows what it printed.
import { useEffect, useState } from 'react';
import { resApi, resUseLive, RES_ZONES } from '../resApi.jsx';
import { ResPage, ResEmpty, ResBars } from '../components/ResShared.jsx';

const RES_TABS = [
  ['pcb', 'Process table'],
  ['cpu', 'CPU scheduling'],
  ['mutex', 'Mutex'],
  ['sem', 'Semaphore'],
  ['pipe', 'IPC pipes'],
  ['bank', "Banker's"],
  ['dead', 'Deadlock'],
];

const RES_ALGOS = [
  ['fcfs', 'FCFS'],
  ['sjf', 'SJF (non-preemptive)'],
  ['srtf', 'SRTF (preemptive SJF)'],
  ['priority', 'Priority (non-preemptive)'],
  ['rr', 'Round Robin'],
];

// small classic example, handy for checking answers against the textbook
const RES_TEXTBOOK = [
  { pid: 'P1', arrival: 0, burst: 8, priority: 3 },
  { pid: 'P2', arrival: 1, burst: 4, priority: 1 },
  { pid: 'P3', arrival: 2, burst: 9, priority: 4 },
  { pid: 'P4', arrival: 3, burst: 5, priority: 2 },
];

const RES_DEADLOCK_PRESET = {
  names: ['P0', 'P1', 'P2', 'P3'],
  available: [0, 0, 0],
  allocation: [[0, 1, 0], [2, 0, 0], [3, 0, 3], [2, 1, 1]],
  request: [[0, 0, 0], [2, 0, 2], [0, 0, 1], [1, 0, 0]],
  priority: [1, 2, 3, 4],
};

const RES_BANK_TEXTBOOK = {
  resources: ['A', 'B', 'C'],
  names: ['P0', 'P1', 'P2', 'P3', 'P4'],
  available: [3, 3, 2],
  max: [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]],
  allocation: [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]],
};

// one hook for the "press button, call kernel, show result or error" pattern
function resUseRun() {
  const [resOut, resSetOut] = useState(null);
  const [resErr, resSetErr] = useState('');
  const [resBusy, resSetBusy] = useState(false);
  async function resRun(resPath, resBody) {
    resSetBusy(true);
    resSetErr('');
    try {
      const resData = await resApi(resPath, { method: 'POST', body: resBody });
      if (resData.ok === false) throw new Error(resData.error || 'Kernel said no');
      resSetOut(resData);
    } catch (resE) {
      resSetErr(resE.message);
    } finally {
      resSetBusy(false);
    }
  }
  return { resOut, resErr, resBusy, resRun, resSetOut };
}

function ResNum({ value: resValue, onChange: resOnChange, min: resMin = 0 }) {
  return <input type="number" className="num-in" min={resMin} value={resValue} onChange={(resE) => resOnChange(resE.target.value === '' ? '' : Number(resE.target.value))} />;
}

// ------------------------------------------------------------------ 1. PCB

function ResPcbTab() {
  const { resData: resRows } = resUseLive('/lab/processes', ['queue']);
  return (
    <section className="panel">
      <h2>Process control blocks</h2>
      <p className="muted">Each emergency case and NGO request is treated as a process. Arrival is minutes after the first one in this list, burst is the estimated handling time, and state follows the case status.</p>
      {!resRows ? <p className="muted">Loading…</p> : !resRows.length ? <ResEmpty>No cases yet.</ResEmpty> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>PID</th><th>Title</th><th>Kind</th><th className="r">Arrival</th><th className="r">Burst</th><th className="r">Priority</th><th>State</th></tr></thead>
            <tbody>
              {resRows.map((resP) => (
                <tr key={resP.pid}>
                  <td><strong>{resP.pid}</strong></td>
                  <td>{resP.title}</td>
                  <td><span className={`kind-tag kind-${resP.kind}`}>{resP.kind}</span></td>
                  <td className="r num">{resP.arrival}</td>
                  <td className="r num">{resP.burst}</td>
                  <td className="r num">{resP.priority}</td>
                  <td><span className={`pstate ps-${resP.state}`}>{resP.state}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small">State mapping: pending → new, waiting for stock → waiting, fulfilled → terminated.</p>
    </section>
  );
}

// ------------------------------------------------------------------ 2. CPU scheduling

function ResGantt({ gantt: resGantt }) {
  if (!resGantt?.length) return null;
  const resEnd = resGantt[resGantt.length - 1].to;
  const resNames = [...new Set(resGantt.map((resG) => resG.pid))];
  return (
    <div className="cpu-gantt">
      <div className="cpu-bar">
        {resGantt.map((resG, resI) => (
          <div
            key={resI}
            className={`cpu-cell g${resNames.indexOf(resG.pid) % 8}${resG.pid === 'IDLE' ? ' idle' : ''}`}
            style={{ flexGrow: resG.to - resG.from }}
            title={`${resG.pid}: ${resG.from} → ${resG.to}`}
          >
            {resG.pid}
          </div>
        ))}
      </div>
      <div className="cpu-ticks">
        {resGantt.map((resG, resI) => (
          <span key={resI} style={{ flexGrow: resG.to - resG.from }}>{resG.from}</span>
        ))}
        <span className="last">{resEnd}</span>
      </div>
    </div>
  );
}

function ResCpuTab() {
  const [resProcs, resSetProcs] = useState(RES_TEXTBOOK);
  const [resAlgo, resSetAlgo] = useState('priority');
  const [resQuantum, resSetQuantum] = useState(2);
  const resOne = resUseRun();
  const resAll = resUseRun();

  async function resFromQueue() {
    const resRows = await resApi('/lab/processes');
    if (resRows.length) resSetProcs(resRows.map(({ pid: resPid, arrival: resA, burst: resB, priority: resP }) => ({ pid: resPid, arrival: resA, burst: resB, priority: resP })));
  }
  function resEdit(resI, resKey, resVal) {
    resSetProcs((resOld) => resOld.map((resP, resJ) => (resJ === resI ? { ...resP, [resKey]: resVal } : resP)));
  }
  function resAdd() {
    resSetProcs((resOld) => [...resOld, { pid: `P${resOld.length + 1}`, arrival: 0, burst: 3, priority: 2 }]);
  }
  function resRemove(resI) {
    resSetProcs((resOld) => resOld.filter((_resP, resJ) => resJ !== resI));
  }

  const resBody = { processes: resProcs, quantum: resQuantum };
  const resBest = resAll.resOut?.results?.reduce((resA, resB) => (resB.avgWaiting < resA.avgWaiting ? resB : resA));

  return (
    <>
      <section className="panel">
        <h2>Processes</h2>
        <div className="toolbar">
          <button className="btn" onClick={resFromQueue}>Load from emergency queue</button>
          <button className="btn" onClick={() => resSetProcs(RES_TEXTBOOK)}>Textbook example</button>
          <button className="btn" onClick={resAdd}>Add process</button>
        </div>
        <div className="table-wrap">
          <table className="table edit-table">
            <thead><tr><th>PID</th><th>Arrival</th><th>Burst</th><th>Priority (1 = highest)</th><th /></tr></thead>
            <tbody>
              {resProcs.map((resP, resI) => (
                <tr key={resI}>
                  <td><input className="pid-in" value={resP.pid} onChange={(resE) => resEdit(resI, 'pid', resE.target.value)} /></td>
                  <td><ResNum value={resP.arrival} onChange={(resV) => resEdit(resI, 'arrival', resV)} /></td>
                  <td><ResNum min={1} value={resP.burst} onChange={(resV) => resEdit(resI, 'burst', resV)} /></td>
                  <td><ResNum min={1} value={resP.priority} onChange={(resV) => resEdit(resI, 'priority', resV)} /></td>
                  <td><button className="small-btn" onClick={() => resRemove(resI)} title="Remove">✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="toolbar">
          <label className="inline-label">Algorithm
            <select value={resAlgo} onChange={(resE) => resSetAlgo(resE.target.value)}>
              {RES_ALGOS.map(([resV, resL]) => <option key={resV} value={resV}>{resL}</option>)}
            </select>
          </label>
          <label className="inline-label">Quantum
            <ResNum min={1} value={resQuantum} onChange={resSetQuantum} />
          </label>
          <button className="btn primary" disabled={resOne.resBusy} onClick={() => resOne.resRun('/lab/schedule', { ...resBody, algo: resAlgo })}>Run</button>
          <button className="btn" disabled={resAll.resBusy} onClick={() => resAll.resRun('/lab/compare', resBody)}>Compare all five</button>
        </div>
        {resOne.resErr && <p className="error">{resOne.resErr}</p>}
        {resAll.resErr && <p className="error">{resAll.resErr}</p>}
      </section>

      {resOne.resOut && (
        <section className="panel">
          <h2>{RES_ALGOS.find(([resV]) => resV === resOne.resOut.algorithm)?.[1]}{resOne.resOut.algorithm === 'rr' ? `, quantum ${resOne.resOut.quantum}` : ''}</h2>
          <ResGantt gantt={resOne.resOut.gantt} />
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>PID</th><th className="r">Arrival</th><th className="r">Burst</th><th className="r">Priority</th><th className="r">Start</th><th className="r">Completion</th><th className="r">Turnaround</th><th className="r">Waiting</th><th className="r">Response</th></tr></thead>
              <tbody>
                {resOne.resOut.processes.map((resP) => (
                  <tr key={resP.pid}>
                    <td><strong>{resP.pid}</strong></td>
                    <td className="r num">{resP.arrival}</td>
                    <td className="r num">{resP.burst}</td>
                    <td className="r num">{resP.priority}</td>
                    <td className="r num">{resP.start}</td>
                    <td className="r num">{resP.completion}</td>
                    <td className="r num">{resP.turnaround}</td>
                    <td className="r num">{resP.waiting}</td>
                    <td className="r num">{resP.response}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={6}>Average</td><td className="r num">{resOne.resOut.avgTurnaround}</td><td className="r num">{resOne.resOut.avgWaiting}</td><td className="r num">{resOne.resOut.avgResponse}</td></tr>
              </tfoot>
            </table>
          </div>
          <p className="muted small">Turnaround = completion − arrival. Waiting = turnaround − burst. Response = first time on CPU − arrival.</p>
        </section>
      )}

      {resAll.resOut && (
        <section className="panel">
          <h2>All algorithms on the same processes</h2>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Algorithm</th><th className="r">Avg waiting</th><th className="r">Avg turnaround</th><th className="r">Avg response</th><th className="r">Context switches</th></tr></thead>
              <tbody>
                {resAll.resOut.results.map((resR) => (
                  <tr key={resR.algorithm} className={resR === resBest ? 'best-row' : ''}>
                    <td>{RES_ALGOS.find(([resV]) => resV === resR.algorithm)?.[1]}</td>
                    <td className="r num">{resR.avgWaiting}</td>
                    <td className="r num">{resR.avgTurnaround}</td>
                    <td className="r num">{resR.avgResponse}</td>
                    <td className="r num">{resR.switches}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ResBars items={resAll.resOut.results.map((resR) => ({ label: resR.algorithm.toUpperCase(), value: resR.avgWaiting, tone: resR === resBest ? 't-ok' : '' }))} />
          <p className="muted small">Highlighted row has the lowest average waiting time. RR usually wins on response time but pays for it with more switches.</p>
        </section>
      )}
    </>
  );
}

// ------------------------------------------------------------------ 3. Mutex

function ResMutexTab() {
  const [resThreads, resSetThreads] = useState(4);
  const [resIters, resSetIters] = useState(20000);
  const { resOut, resErr, resBusy, resRun } = resUseRun();
  return (
    <section className="panel">
      <h2>Race condition, with and without a mutex</h2>
      <p className="muted">Several pthreads take stock out of the same counter at once. Without a lock some updates overwrite each other and are lost. With <code>pthread_mutex_lock</code> around the critical section the count is always exact.</p>
      <div className="toolbar">
        <label className="inline-label">Threads <ResNum min={2} value={resThreads} onChange={resSetThreads} /></label>
        <label className="inline-label">Withdrawals each <ResNum min={100} value={resIters} onChange={resSetIters} /></label>
        <button className="btn primary" disabled={resBusy} onClick={() => resRun('/lab/mutex', { threads: resThreads, iterations: resIters })}>Run in C</button>
      </div>
      {resErr && <p className="error">{resErr}</p>}
      {resOut && (
        <>
          <p>Stock starts at <strong>{resOut.startStock}</strong>, {resOut.threads} threads × {resOut.iterations} withdrawals, so it should end at <strong>{resOut.expected}</strong>.</p>
          <div className="grid2">
            <div className={`result-box ${resOut.withoutMutex.lostUpdates ? 'bad' : 'good'}`}>
              <h3>No mutex</h3>
              <span className="big-num">{resOut.withoutMutex.finalStock}</span>
              <span>{resOut.withoutMutex.lostUpdates} updates lost · {resOut.withoutMutex.ms} ms</span>
            </div>
            <div className={`result-box ${resOut.withMutex.lostUpdates ? 'bad' : 'good'}`}>
              <h3>With mutex</h3>
              <span className="big-num">{resOut.withMutex.finalStock}</span>
              <span>{resOut.withMutex.lostUpdates} updates lost · {resOut.withMutex.ms} ms</span>
            </div>
          </div>
          {resOut.withoutMutex.lostUpdates === 0 && <p className="muted small">The race didn't show up this time. Try more threads or more withdrawals.</p>}
        </>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ 4. Semaphore

function ResSemTab() {
  const [resForm, resSetForm] = useState({ producers: 2, consumers: 2, items: 4, buffer: 3 });
  const { resOut, resErr, resBusy, resRun } = resUseRun();
  const resField = (resKey, resLabel) => (
    <label className="inline-label">{resLabel} <ResNum min={1} value={resForm[resKey]} onChange={(resV) => resSetForm({ ...resForm, [resKey]: resV })} /></label>
  );
  return (
    <section className="panel">
      <h2>Producer–consumer with counting semaphores</h2>
      <p className="muted">Producers are NGOs dropping relief kits into a shared depot of fixed size, consumers are volunteers taking them out. <code>empty</code> counts free slots, <code>full</code> counts kits ready, and a mutex guards the depot itself.</p>
      <div className="toolbar">
        {resField('producers', 'Producers')}
        {resField('consumers', 'Consumers')}
        {resField('items', 'Kits each')}
        {resField('buffer', 'Depot size')}
        <button className="btn primary" disabled={resBusy} onClick={() => resRun('/lab/semaphore', resForm)}>Run in C</button>
      </div>
      {resErr && <p className="error">{resErr}</p>}
      {resOut && (
        <>
          <div className="tiles">
            <div className="tile"><span className="tile-num">{resOut.produced}</span><span>Produced</span></div>
            <div className="tile"><span className="tile-num">{resOut.consumed}</span><span>Consumed</span></div>
            <div className="tile"><span className="tile-num">{resOut.maxInBuffer}/{resOut.bufferSize}</span><span>Most kits in depot at once</span></div>
            <div className="tile"><span className="tile-num">{resOut.neverOverflowed ? 'Yes' : 'No'}</span><span>Depot never overflowed</span></div>
          </div>
          <ol className="log mono-log">
            {resOut.log.map((resL, resI) => <li key={resI} className={resL.startsWith('Producer') ? 'ev ev-produce' : 'ev ev-consume'}>{resL}</li>)}
          </ol>
        </>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ 5. Pipes

function ResPipeTab() {
  const [resZone, resSetZone] = useState('Zone A');
  const { resOut, resErr, resBusy, resRun } = resUseRun();
  return (
    <section className="panel">
      <h2>Inter-process communication with pipes</h2>
      <p className="muted">The C program calls <code>fork()</code>. The parent acts as the request desk and writes each open request for this zone into pipe 1. The child acts as the allocator, reads the request, decides how much it can give from the zone's food and water, and writes the answer back on pipe 2. Nothing in the real stock is changed.</p>
      <div className="toolbar">
        <label className="inline-label">Zone
          <select value={resZone} onChange={(resE) => resSetZone(resE.target.value)}>
            {RES_ZONES.map((resZ) => <option key={resZ}>{resZ}</option>)}
          </select>
        </label>
        <button className="btn primary" disabled={resBusy} onClick={() => resRun('/lab/pipe', { zone: resZone })}>Fork and send</button>
      </div>
      {resErr && <p className="error">{resErr}</p>}
      {resOut && (
        <>
          <div className="pipe-diagram">
            <div className="proc-box">Parent<br /><b>pid {resOut.parentPid}</b><br /><span className="muted small">request desk</span></div>
            <div className="pipe-arrows"><span>pipe 1: request →</span><span>← pipe 2: answer</span></div>
            <div className="proc-box">Child<br /><b>pid {resOut.childPid}</b><br /><span className="muted small">allocator</span></div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Request</th><th className="r">Asked food</th><th className="r">Asked water</th><th className="r">Got food</th><th className="r">Got water</th><th className="r">Food left</th><th className="r">Water left</th><th className="r">Answered by</th></tr></thead>
              <tbody>
                {resOut.messages.map((resM, resI) => (
                  <tr key={resI}>
                    <td><strong>{resM.pid}</strong></td>
                    <td className="r num">{resM.askedFood}</td>
                    <td className="r num">{resM.askedWater}</td>
                    <td className={`r num${resM.gaveFood < resM.askedFood ? ' short' : ''}`}>{resM.gaveFood}</td>
                    <td className={`r num${resM.gaveWater < resM.askedWater ? ' short' : ''}`}>{resM.gaveWater}</td>
                    <td className="r num">{resM.stockFoodLeft}</td>
                    <td className="r num">{resM.stockWaterLeft}</td>
                    <td className="r num">pid {resM.answeredBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ matrix editor used by Banker's and deadlock

function ResMatrix({ title: resTitle, names: resNames, cols: resCols, value: resValue, onChange: resOnChange }) {
  function resSet(resI, resJ, resV) {
    resOnChange(resValue.map((resRow, resA) => (resA === resI ? resRow.map((resX, resB) => (resB === resJ ? resV : resX)) : resRow)));
  }
  return (
    <div className="matrix">
      <h3 className="sub">{resTitle}</h3>
      <table className="table small-table">
        <thead><tr><th />{resCols.map((resC) => <th key={resC} className="r">{resC}</th>)}</tr></thead>
        <tbody>
          {resNames.map((resN, resI) => (
            <tr key={resI}>
              <td>{resN}</td>
              {resCols.map((resC, resJ) => (
                <td key={resC} className="r"><ResNum value={resValue[resI]?.[resJ] ?? 0} onChange={(resV) => resSet(resI, resJ, resV)} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResVector({ title: resTitle, cols: resCols, value: resValue, onChange: resOnChange }) {
  return (
    <div className="matrix">
      <h3 className="sub">{resTitle}</h3>
      <div className="vector">
        {resCols.map((resC, resJ) => (
          <label key={resC} className="inline-label">{resC}
            <ResNum value={resValue[resJ] ?? 0} onChange={(resV) => resOnChange(resValue.map((resX, resK) => (resK === resJ ? resV : resX)))} />
          </label>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ 6. Banker's

function ResBankTab() {
  const [resData, resSetData] = useState(RES_BANK_TEXTBOOK);
  const [resZone, resSetZone] = useState('Zone A');
  const [resAsk, resSetAsk] = useState({ on: false, process: 1, vector: [1, 0, 2] });
  const [resInfo, resSetInfo] = useState('Textbook example (Silberschatz).');
  const { resOut, resErr, resBusy, resRun, resSetOut } = resUseRun();

  async function resLoadZone() {
    const resLive = await resApi(`/lab/bankers/live?zone=${encodeURIComponent(resZone)}`);
    resSetOut(null);
    if (!resLive.names.length) {
      resSetInfo(`${resZone} has no open cases right now, so there is nothing to check.`);
      return;
    }
    resSetData({ ...resLive, resources: resLive.resources.map((resR) => resR[0].toUpperCase() + resR.slice(1)) });
    resSetAsk({ on: false, process: 0, vector: resLive.resources.map(() => 0) });
    resSetInfo(`Live data from ${resZone}: max = what each open case asked for in total, allocation = what it has already been given, available = stock in the zone.`);
  }
  function resLoadTextbook() {
    resSetOut(null);
    resSetData(RES_BANK_TEXTBOOK);
    resSetAsk({ on: false, process: 1, vector: [1, 0, 2] });
    resSetInfo('Textbook example (Silberschatz).');
  }

  const resNeed = resData.max.map((resRow, resI) => resRow.map((resX, resJ) => Number(resX) - Number(resData.allocation[resI]?.[resJ] || 0)));

  return (
    <section className="panel">
      <h2>Banker's algorithm (deadlock avoidance)</h2>
      <p className="muted">Before giving resources, check that there is still some order in which every process can finish. If there is, the state is safe.</p>
      <div className="toolbar">
        <button className="btn" onClick={resLoadTextbook}>Textbook example</button>
        <label className="inline-label">
          <select value={resZone} onChange={(resE) => resSetZone(resE.target.value)}>
            {RES_ZONES.map((resZ) => <option key={resZ}>{resZ}</option>)}
          </select>
        </label>
        <button className="btn" onClick={resLoadZone}>Load live zone data</button>
      </div>
      <p className="muted small">{resInfo}</p>

      <div className="matrices">
        <ResVector title="Available" cols={resData.resources} value={resData.available} onChange={(resV) => resSetData({ ...resData, available: resV })} />
        <ResMatrix title="Max" names={resData.names} cols={resData.resources} value={resData.max} onChange={(resV) => resSetData({ ...resData, max: resV })} />
        <ResMatrix title="Allocation" names={resData.names} cols={resData.resources} value={resData.allocation} onChange={(resV) => resSetData({ ...resData, allocation: resV })} />
        <div className="matrix">
          <h3 className="sub">Need = Max − Allocation</h3>
          <table className="table small-table">
            <thead><tr><th />{resData.resources.map((resC) => <th key={resC} className="r">{resC}</th>)}</tr></thead>
            <tbody>
              {resData.names.map((resN, resI) => (
                <tr key={resI}><td>{resN}</td>{resNeed[resI].map((resX, resJ) => <td key={resJ} className={`r num${resX < 0 ? ' short' : ''}`}>{resX}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="toolbar">
        <label className="inline-label"><input type="checkbox" checked={resAsk.on} onChange={(resE) => resSetAsk({ ...resAsk, on: resE.target.checked })} /> Also test a new request from</label>
        <select value={resAsk.process} disabled={!resAsk.on} onChange={(resE) => resSetAsk({ ...resAsk, process: Number(resE.target.value) })}>
          {resData.names.map((resN, resI) => <option key={resI} value={resI}>{resN}</option>)}
        </select>
        {resData.resources.map((resC, resJ) => (
          <label key={resC} className="inline-label">{resC}
            <ResNum value={resAsk.vector[resJ] ?? 0} onChange={(resV) => resSetAsk({ ...resAsk, vector: resData.resources.map((_resX, resK) => (resK === resJ ? resV : resAsk.vector[resK] ?? 0)) })} />
          </label>
        ))}
      </div>
      <button
        className="btn primary"
        disabled={resBusy}
        onClick={() => resRun('/lab/bankers', { ...resData, request: resAsk.on ? { process: resAsk.process, vector: resAsk.vector } : null })}
      >
        Check safety in C
      </button>
      {resErr && <p className="error">{resErr}</p>}

      {resOut && (
        <div className="bank-result">
          <p className={`verdict ${resOut.safe ? 'good' : 'bad'}`}>
            {resOut.safe ? <>Safe state. Safe sequence: <strong>{resOut.sequence.join(' → ')}</strong></> : 'Unsafe state: no order lets every process finish.'}
          </p>
          {resOut.steps?.length > 0 && (
            <table className="table small-table">
              <thead><tr><th>Step</th><th>Runs</th><th>Work before</th><th>Work after (+ its allocation)</th></tr></thead>
              <tbody>
                {resOut.steps.map((resS, resI) => (
                  <tr key={resI}><td>{resI + 1}</td><td><strong>{resS.pid}</strong></td><td className="num">[{resS.workBefore.join(', ')}]</td><td className="num">[{resS.workAfter.join(', ')}]</td></tr>
                ))}
              </tbody>
            </table>
          )}
          {resOut.request && (
            <p className={`verdict ${resOut.request.granted ? 'good' : 'bad'}`}>
              Request [{resOut.request.vector.join(', ')}] from {resOut.request.pid}: {resOut.request.granted ? 'can be granted' : 'must wait'} ({resOut.request.reason})
              {resOut.request.sequenceAfter?.length > 0 && <> · sequence after: {resOut.request.sequenceAfter.join(' → ')}</>}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ 7. Deadlock

function ResDeadTab() {
  const [resData, resSetData] = useState(RES_DEADLOCK_PRESET);
  const { resOut, resErr, resBusy, resRun } = resUseRun();
  const resCols = ['R1', 'R2', 'R3'];
  return (
    <section className="panel">
      <h2>Deadlock detection and recovery</h2>
      <p className="muted">Detection runs the same work/finish loop as Banker's but against current requests, not max claims. Whoever can't finish is deadlocked. Recovery terminates the lowest priority process (biggest number), releases what it held, and checks again.</p>
      <div className="toolbar"><button className="btn" onClick={() => resSetData(RES_DEADLOCK_PRESET)}>Reset example</button></div>
      <div className="matrices">
        <ResVector title="Available" cols={resCols} value={resData.available} onChange={(resV) => resSetData({ ...resData, available: resV })} />
        <ResMatrix title="Allocation" names={resData.names} cols={resCols} value={resData.allocation} onChange={(resV) => resSetData({ ...resData, allocation: resV })} />
        <ResMatrix title="Request" names={resData.names} cols={resCols} value={resData.request} onChange={(resV) => resSetData({ ...resData, request: resV })} />
        <div className="matrix">
          <h3 className="sub">Priority</h3>
          <div className="vector">
            {resData.names.map((resN, resI) => (
              <label key={resN} className="inline-label">{resN}
                <ResNum min={1} value={resData.priority[resI]} onChange={(resV) => resSetData({ ...resData, priority: resData.priority.map((resX, resK) => (resK === resI ? resV : resX)) })} />
              </label>
            ))}
          </div>
        </div>
      </div>
      <button className="btn primary" disabled={resBusy} onClick={() => resRun('/lab/deadlock', resData)}>Detect in C</button>
      {resErr && <p className="error">{resErr}</p>}
      {resOut && (
        <div className="bank-result">
          <p className={`verdict ${resOut.deadlocked.length ? 'bad' : 'good'}`}>
            {resOut.deadlocked.length ? <>Deadlocked: <strong>{resOut.deadlocked.join(', ')}</strong></> : 'No deadlock. Every process can finish.'}
          </p>
          {resOut.recovery.map((resR, resI) => (
            <p key={resI}>
              Step {resI + 1}: terminate <strong>{resR.victim}</strong> (priority {resR.priority}), releasing [{resR.released.join(', ')}].{' '}
              {resR.stillDeadlocked.length ? `Still stuck: ${resR.stillDeadlocked.join(', ')}` : 'Everyone else can now finish.'}
            </p>
          ))}
          {resOut.deadlocked.length > 0 && <p className={`verdict ${resOut.resolved ? 'good' : 'bad'}`}>{resOut.resolved ? 'Recovered.' : 'Could not recover.'}</p>}
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ page

export default function ResOsLab() {
  const [resTab, resSetTab] = useState('cpu');
  const [resKernel, resSetKernel] = useState(null);

  useEffect(() => {
    resApi('/lab/kernel').then(resSetKernel).catch((resE) => resSetKernel({ ok: false, error: resE.message }));
  }, []);

  return (
    <ResPage
      title="OS lab"
      intro="The operating system side of the project, written in C with pthreads, fork and pipes. The server compiles c_engine/ when it starts and runs it for each button below."
      actions={resKernel && (
        <span className={`kernel-chip ${resKernel.ok ? 'on' : 'off'}`}>
          {resKernel.ok ? 'C kernel ready' : 'C kernel not built'}
        </span>
      )}
    >
      {resKernel && !resKernel.ok && (
        <div className="panel warn-panel">
          <strong>The C kernel couldn't be compiled.</strong> {resKernel.error}
          <p>{resKernel.hint || 'On a Mac run "xcode-select --install" once, then restart the server.'}</p>
          <p className="muted small">The process table still works because it comes from the database.</p>
        </div>
      )}
      <nav className="tabs">
        {RES_TABS.map(([resKey, resLabel]) => (
          <button key={resKey} className={resTab === resKey ? 'active' : ''} onClick={() => resSetTab(resKey)}>{resLabel}</button>
        ))}
      </nav>
      {resTab === 'pcb' && <ResPcbTab />}
      {resTab === 'cpu' && <ResCpuTab />}
      {resTab === 'mutex' && <ResMutexTab />}
      {resTab === 'sem' && <ResSemTab />}
      {resTab === 'pipe' && <ResPipeTab />}
      {resTab === 'bank' && <ResBankTab />}
      {resTab === 'dead' && <ResDeadTab />}
    </ResPage>
  );
}
