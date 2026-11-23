import { useState } from 'react';
import { resApi, resUseLive, RES_ZONES } from '../resApi.jsx';
import { ResPage, ResAllocatorControls } from '../components/ResShared.jsx';

const RES_STATE_TEXT = { idle: 'Idle, sleeping on full', locking: 'Waiting for zone lock', running: 'In critical section' };

function ResSem({ s: resS, label: resLabel }) {
  return (
    <div className="sem">
      <span className="sem-val">{resS.value}</span>
      <span>
        {resLabel}
        {resS.blocked > 0 && <em className="muted">, {resS.blocked} blocked</em>}
      </span>
    </div>
  );
}

export default function ResSyncMonitor() {
  const { resData: resS } = resUseLive('/sync', ['sync', 'queue', 'stock']);
  const [resCount, resSetCount] = useState(10);
  const [resZone, resSetZone] = useState('');
  const [resMsg, resSetMsg] = useState('');

  async function resStress() {
    resSetMsg('');
    try {
      await resApi('/admin/stress', { method: 'POST', body: { count: Number(resCount), zone: resZone || undefined } });
      resSetMsg(`${resCount} cases logged at once. Click "Allocate by priority" and watch the workers.`);
    } catch (resErr) {
      resSetMsg(resErr.message);
    }
  }

  if (!resS) return <ResPage title="Sync monitor"><div className="panel muted">Loading…</div></ResPage>;
  const resSlots = Array.from({ length: resS.config.bufferSize }, (_resX, resI) => resS.readyQueue[resI]);
  const [resEmpty, resFull] = resS.semaphores;

  return (
    <ResPage
      title="Sync monitor"
      intro="Live view of the allocator. Producers put cases into a bounded ready queue, workers take the highest priority first. Each zone's stock is a critical section guarded by a mutex; cases short of stock sleep on that zone's condition variable."
    >
      <ResAllocatorControls isAdmin />

      <section className="panel">
        <h2>Allocator workers (consumers)</h2>
        <div className="lanes">
          {resS.workers.map((resW) => (
            <div key={resW.name} className={`lane w-${resW.state}`}>
              <strong>{resW.name}</strong>
              <span className="lane-state">{RES_STATE_TEXT[resW.state]}</span>
              <span className="lane-job">{resW.current ? `${resW.current.pid}, ${resW.current.zone}, P${resW.current.priority}` : '—'}</span>
              <span className="muted small">{resW.handled} handled</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid2">
        <section className="panel">
          <h2>Ready queue (bounded buffer)</h2>
          <div className="slots">
            {resSlots.map((resIt, resI) => (
              <div key={resI} className={`slot${resIt ? ` filled p${resIt.priority}` : ''}`} title={resIt ? resIt.pid : 'Free slot'}>
                {resIt && (
                  <>
                    <b>{resIt.pid}</b>
                    <span>P{resIt.effective}{resIt.effective < resIt.priority ? '↑' : ''}</span>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="sems">
            <ResSem s={resEmpty} label="empty: free slots" />
            <ResSem s={resFull} label="full: cases ready" />
          </div>
          <p className="muted small">↑ = priority raised by aging, so a low priority case can't starve.</p>
        </section>

        <section className="panel">
          <h2>Locks and wait queues</h2>
          <table className="table locks">
            <thead><tr><th>Mutex</th><th>Held by</th><th>Waiting for lock</th><th>Blocked on stock</th></tr></thead>
            <tbody>
              {resS.mutexes.map((resM) => {
                const resB = resS.blocked.find((resX) => resX.zone === resM.name);
                return (
                  <tr key={resM.name}>
                    <td>{resM.name}</td>
                    <td>{resM.locked ? <span className="held">{resM.owner}</span> : <span className="muted">free</span>}</td>
                    <td>{resM.waiting.length ? resM.waiting.join(', ') : <span className="muted">none</span>}</td>
                    <td>{resB ? (resB.requests.length ? resB.requests.join(', ') : <span className="muted">none</span>) : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>

      <div className="grid2">
        <section className="panel form">
          <h2>Load test</h2>
          <p className="muted">Log many cases in the same instant, then allocate. Stock never goes negative and each case is served once.</p>
          <div className="row2">
            <label>Cases
              <input type="number" min="2" max="30" value={resCount} onChange={(resE) => resSetCount(resE.target.value)} />
            </label>
            <label>Zone
              <select value={resZone} onChange={(resE) => resSetZone(resE.target.value)}>
                <option value="">Random zones</option>
                {RES_ZONES.map((resZ) => <option key={resZ}>{resZ}</option>)}
              </select>
            </label>
          </div>
          <button className="btn primary" onClick={resStress}>Log {resCount} cases at once</button>
          {resMsg && <p className="ok">{resMsg}</p>}
        </section>
        <section className="panel">
          <h2>Event log</h2>
          <ol className="log">
            {resS.log.map((resE) => (
              <li key={resE.id} className={`ev ev-${resE.kind}`}>
                <time>{new Date(resE.at).toLocaleTimeString()}</time>
                <span>{resE.message}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </ResPage>
  );
}
