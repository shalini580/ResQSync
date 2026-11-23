// Lab tabs added in the final phase: crash recovery and indexing (DBMS),
// Banker's algorithm on the live vehicle fleet (OS).
import { useState } from 'react';
import { resApi, resUseLive, RES_ZONES } from '../resApi.jsx';
import { ResNote, ResEmpty } from './ResShared.jsx';

// ------------------------------------------------------------------ crash recovery

function ResStockTriple({ out: resO }) {
  const resCells = [
    ['Before', resO.before, 'saved on disk'],
    ['Inside the child, just before kill -9', resO.inside, resO.mode === 'txn' ? 'not committed yet' : 'already saved (autocommit)'],
    ['After recovery', resO.after, resO.rolledBack ? 'same as before' : `${resO.lost} ${resO.type} gone`],
  ];
  return (
    <ol className="crash-steps">
      {resCells.map(([resLabel, resV, resNote], resI) => (
        <li key={resLabel} className={resI === 2 ? (resO.rolledBack ? 'is-good' : 'is-bad') : ''}>
          <span className="small muted">{resLabel}</span>
          <span className="num crash-num">{resV.available}</span>
          <span className="small">available {resO.type}, allocated {resV.allocated}</span>
          <span className="small muted">{resNote}</span>
        </li>
      ))}
    </ol>
  );
}

export function ResCrashTab() {
  const [resForm, resSetForm] = useState({ zone: 'Zone A', type: 'water', amount: 25 });
  const [resRuns, resSetRuns] = useState({});
  const [resBusy, resSetBusy] = useState(null);
  const [resMsg, resSetMsg] = useState(null);

  async function resRun(resMode) {
    resSetBusy(resMode);
    resSetMsg(null);
    try {
      const resOut = await resApi('/admin/crash-test', { method: 'POST', body: { ...resForm, mode: resMode } });
      resSetRuns((resR) => ({ ...resR, [resMode]: resOut }));
    } catch (resE) {
      resSetMsg({ ok: false, text: resE.message });
    } finally {
      resSetBusy(null);
    }
  }

  return (
    <>
      <section className="panel">
        <h2>Pull the plug in the middle of a transaction</h2>
        <p className="muted measure">
          The server starts a separate Node process that takes {resForm.amount} {resForm.type} out of {resForm.zone} (step 1) and is then
          killed with <code>SIGKILL</code> before it can book them as allocated (step 2), like a power cut. Afterwards we open the database again
          and look at what survived. Run it twice: once inside a transaction, once without.
        </p>
        <div className="crash-form">
          <label>Zone<select value={resForm.zone} onChange={(resE) => resSetForm({ ...resForm, zone: resE.target.value })}>{RES_ZONES.map((resZ) => <option key={resZ}>{resZ}</option>)}</select></label>
          <label>Resource<select value={resForm.type} onChange={(resE) => resSetForm({ ...resForm, type: resE.target.value })}>{['food', 'water', 'medicine', 'cots'].map((resT) => <option key={resT}>{resT}</option>)}</select></label>
          <label>Amount<input type="number" min="1" value={resForm.amount} onChange={(resE) => resSetForm({ ...resForm, amount: resE.target.value })} /></label>
          <button className="btn primary" disabled={!!resBusy} onClick={() => resRun('txn')}>{resBusy === 'txn' ? 'Crashing…' : 'Crash it, with a transaction'}</button>
          <button className="btn" disabled={!!resBusy} onClick={() => resRun('no-txn')}>{resBusy === 'no-txn' ? 'Crashing…' : 'Crash it, without a transaction'}</button>
        </div>
        <ResNote msg={resMsg} />
      </section>
      <div className="split even">
        {['txn', 'no-txn'].map((resMode) => {
          const resO = resRuns[resMode];
          return (
            <section key={resMode} className="panel">
              <h2>{resMode === 'txn' ? 'With BEGIN … COMMIT' : 'Without a transaction'}</h2>
              {!resO ? <ResEmpty>Not run yet.</ResEmpty> : (
                <>
                  <ResStockTriple out={resO} />
                  <p className={resO.rolledBack ? 'ok' : 'error'}>
                    {resO.rolledBack
                      ? `Process ${resO.childPid} was killed (${resO.signal}). The half-done transaction never committed, so ${resO.engine === 'mysql' ? 'InnoDB rolled it back from the undo log' : 'SQLite rolled it back from its journal'} - nothing was lost.`
                      : `Process ${resO.childPid} was killed (${resO.signal}). Step 1 was already saved on its own, step 2 never ran: ${resO.lost} ${resO.type} disappeared from the books.`}
                  </p>
                  {resO.repaired && <p className="muted small">The demo put the {resO.lost} units back afterwards (a normal restock), so your data stays correct.</p>}
                  <p className="muted small">Stock ledger check after the crash: {resO.ledgerAfter ? 'balanced' : 'NOT balanced'}.</p>
                </>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

// ------------------------------------------------------------------ indexing

export function ResIndexTab() {
  const [resRows, resSetRows] = useState(100000);
  const [resOut, resSetOut] = useState(null);
  const [resBusy, resSetBusy] = useState(false);
  const [resMsg, resSetMsg] = useState(null);

  async function resRun() {
    resSetBusy(true);
    resSetMsg(null);
    try {
      resSetOut(await resApi('/dbms/index-bench', { method: 'POST', body: { rows: resRows } }));
    } catch (resE) {
      resSetMsg({ ok: false, text: resE.message });
    } finally {
      resSetBusy(false);
    }
  }
  const resMaxMs = resOut ? Math.max(resOut.before.medianMs, resOut.after.medianMs) : 1;

  return (
    <>
      <section className="panel">
        <h2>Same question, with and without an index</h2>
        <p className="muted measure">
          A lab table gets filled with fake incident reports. We ask how many open P1 reports Zone C has, first with no index (the database has to read every row),
          then with a B-tree index on (zone, status, priority, people). EXPLAIN shows the plan the database picked.
        </p>
        <div className="crash-form">
          <label>Rows
            <select value={resRows} onChange={(resE) => resSetRows(Number(resE.target.value))}>
              {[20000, 100000, 200000].map((resN) => <option key={resN} value={resN}>{resN.toLocaleString('en-IN')}</option>)}
            </select>
          </label>
          <button className="btn primary" disabled={resBusy} onClick={resRun}>{resBusy ? 'Running…' : 'Run the test'}</button>
        </div>
        <ResNote msg={resMsg} />
      </section>
      {resOut && (
        <section className="panel">
          <p className="index-headline">
            The index made this query <strong>{resOut.speedup}× faster</strong> ({resOut.before.medianMs} ms → {resOut.after.medianMs} ms, median of 7 runs on {resOut.rows.toLocaleString('en-IN')} rows).
          </p>
          <pre className="sql">{resOut.sql}</pre>
          <div className="index-compare">
            {[['Without index', resOut.before], ['With index', resOut.after]].map(([resLabel, resR]) => (
              <div key={resLabel} className="index-col">
                <h3>{resLabel}</h3>
                <div className="index-bar" role="img" aria-label={`${resLabel}: ${resR.medianMs} ms`}>
                  <span style={{ width: `${Math.max(1.5, (100 * resR.medianMs) / resMaxMs)}%` }} />
                </div>
                <p className="num index-ms">{resR.medianMs} ms</p>
                <p className="small"><span className="muted">EXPLAIN:</span> <code>{resR.plan.map((resP) => resP.text).join('; ')}</code></p>
                <p className="small">{resR.plan.some((resP) => resP.scan) ? 'Full table scan: every row is read.' : 'Index search: only the matching part of the B-tree is read.'}</p>
              </div>
            ))}
          </div>
          <p className="muted small">
            {resOut.after.matches.toLocaleString("en-IN")} matching rows. Building the index took {resOut.indexBuildMs} ms: indexes cost time on writes and space on disk, so we only add them for queries we run often.
            {resOut.fill.created ? ` Filling the table took ${resOut.fill.ms} ms.` : ''} Database: {resOut.engine === 'mysql' ? 'MySQL' : 'SQLite'}.
          </p>
        </section>
      )}
    </>
  );
}

// ------------------------------------------------------------------ Banker's on the live fleet

export function ResLiveBankerTab() {
  const { resData } = resUseLive('/banker/live', ['banker', 'missions', 'stock', 'queue']);
  const [resTry, resSetTry] = useState({ zone: 'Zone A', pid: '', amount: 1 });
  const [resTryOut, resSetTryOut] = useState(null);

  async function resCheck(resE) {
    resE.preventDefault();
    try {
      resSetTryOut(await resApi('/banker/try', { method: 'POST', body: resTry }));
    } catch (resX) {
      resSetTryOut({ granted: false, reason: resX.message });
    }
  }
  if (!resData) return <div className="panel muted">Loading the fleet…</div>;
  const resZoneProcs = resData.zones.find((resZ) => resZ.zone === resTry.zone)?.processes || [];

  return (
    <>
      <section className="panel">
        <h2>Banker&apos;s algorithm on the real vehicle fleet</h2>
        <p className="muted measure">
          Vehicles are reusable: they come back to the depot when a mission is completed. Before a worker thread hands out vehicles it runs the
          Banker&apos;s safety check on the live numbers below. If no safe order would be left, the vehicles are held back (the other supplies still go out)
          and the case waits until vehicles return. Need = min(still needed, fleet − on the road for it).
        </p>
        <div className="fleet-grid">
          {resData.zones.map((resZ) => (
            <div key={resZ.zone} className={`fleet-zone ${resZ.safe ? 'is-safe' : 'is-unsafe'}`}>
              <div className="fleet-head">
                <h3>{resZ.zone}</h3>
                <span className={`state-pill ${resZ.safe ? 'ok' : 'bad'}`}>{resZ.safe ? 'Safe' : 'Unsafe'}</span>
              </div>
              <p className="small"><span className="num">{resZ.available}</span> at the depot, <span className="num">{resZ.onRoad}</span> on the road, fleet {resZ.fleet}</p>
              {!resZ.processes.length ? <p className="muted small">No case needs vehicles.</p> : (
                <table className="table compact">
                  <thead><tr><th>Process</th><th className="r">Holds</th><th className="r">Still needs</th></tr></thead>
                  <tbody>
                    {resZ.processes.map((resP) => (
                      <tr key={resP.pid}><td>{resP.pid}</td><td className="r num">{resP.alloc}</td><td className="r num">{resP.need}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
              {resZ.sequence.length > 0 && <p className="small muted">Safe order: {resZ.sequence.join(' → ')}</p>}
            </div>
          ))}
        </div>
      </section>

      <div className="split">
        <form className="panel form" onSubmit={resCheck}>
          <h2>What if…</h2>
          <p className="muted small">Ask for vehicles on behalf of a live case. Nothing changes; it only runs the check.</p>
          <label>Zone<select value={resTry.zone} onChange={(resE) => resSetTry({ ...resTry, zone: resE.target.value, pid: '' })}>{RES_ZONES.map((resZ) => <option key={resZ}>{resZ}</option>)}</select></label>
          <label>Case
            <select value={resTry.pid} onChange={(resE) => resSetTry({ ...resTry, pid: resE.target.value })} required>
              <option value="">Pick a case</option>
              {resZoneProcs.map((resP) => <option key={resP.pid} value={resP.pid}>{resP.pid} (needs {resP.remaining})</option>)}
            </select>
          </label>
          <label>Vehicles<input type="number" min="1" value={resTry.amount} onChange={(resE) => resSetTry({ ...resTry, amount: resE.target.value })} /></label>
          <button className="btn primary">Check</button>
          {resTryOut && <p className={resTryOut.granted ? 'ok' : 'error'}>{resTryOut.granted ? 'Granted. ' : 'Refused. '}{resTryOut.reason}</p>}
        </form>
        <section className="panel">
          <h2>Decisions the worker threads made <span className="count">{resData.decisions.length}</span></h2>
          {!resData.decisions.length ? <ResEmpty>No vehicle decisions yet. Run the allocation from the Emergency queue.</ResEmpty> : (
            <ul className="plain decisions">
              {resData.decisions.map((resD) => (
                <li key={`${resD.at}-${resD.pid}`} className={resD.safe ? '' : 'unsafe'}>
                  <span><strong>{resD.pid}</strong> asked for {resD.request} vehicle(s) in {resD.zone} ({resD.available} at the depot)</span>
                  <span className={resD.safe ? 'ok small' : 'error small'}>
                    {resD.safe ? `Granted: safe order ${resD.sequence.join(' → ')}` : 'Held back: the state would be unsafe'}
                  </span>
                  <span className="muted small">{resD.worker}, {new Date(resD.at).toLocaleTimeString()}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
