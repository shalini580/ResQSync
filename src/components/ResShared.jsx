import { useEffect, useRef, useState } from 'react';
import {
  resApi, resUseLive, resTimeAgo, resOrdinal, RES_ZONES, RES_TYPES, RES_LABEL, RES_UNIT, RES_PRIORITY, RES_CASE_TYPES,
} from '../resApi.jsx';

export function ResPage({ title: resTitle, intro: resIntro, actions: resActions, children: resChildren }) {
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>{resTitle}</h1>
          {resIntro && <p className="intro">{resIntro}</p>}
        </div>
        {resActions && <div className="page-actions">{resActions}</div>}
      </header>
      {resChildren}
    </div>
  );
}

export function ResPriority({ value: resValue }) {
  return <span className={`prio p${resValue}`}>{RES_PRIORITY[resValue] || `P${resValue}`}</span>;
}

export function ResEmpty({ children: resChildren }) {
  return <p className="empty">{resChildren}</p>;
}

export function ResNote({ msg: resMsg }) {
  if (!resMsg) return null;
  return <p className={resMsg.ok ? 'ok' : 'error'}>{resMsg.text}</p>;
}

/** zones side by side, one bar per resource (how much of the zone's stock is left) */
export function ResStockBoard({ only: resOnly }) {
  const { resData } = resUseLive('/resources', ['stock', 'ledger']);
  if (!resData) return <div className="panel muted">Loading stock…</div>;
  const resTypes = resOnly ? [resOnly] : RES_TYPES;
  return (
    <div className="stock-board">
      {RES_ZONES.map((resZone) => (
        <div className="zone-col" key={resZone}>
          <h3>{resZone}</h3>
          {resTypes.map((resT) => {
            const resR = resData.find((resX) => resX.zone === resZone && resX.resource_type === resT) || { available: 0, allocated: 0 };
            const resTotal = resR.available + resR.allocated;
            const resPct = resTotal ? Math.round((resR.available / resTotal) * 100) : 0;
            return (
              <div className={`stock-line${resR.available === 0 ? ' is-out' : ''}`} key={resT}>
                <div className="stock-label">
                  <span>{RES_LABEL[resT]}</span>
                  <span className="num">{resR.available}</span>
                </div>
                <div className="bar" aria-hidden="true">
                  <span style={{ width: `${resPct}%` }} />
                </div>
                <div className="stock-sub">{resR.available === 0 ? 'Out of stock' : `${resR.allocated} ${RES_UNIT[resT]} given out`}</div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

const RES_STAGE_TEXT = { pending: 'Pending allocation', scheduled: 'Being allocated', waiting: 'Waiting for stock' };

/**
 * Open cases/requests as triage cards. Numbers count down live; at zero the
 * card turns green and slides out of the list.
 */
export function ResQueueCards({ rows: resRows, showOwner: resShowOwner = true }) {
  const resPrev = useRef(new Map());
  const [resLeaving, resSetLeaving] = useState([]);

  useEffect(() => {
    if (!resRows) return;
    const resNow = new Map(resRows.map((resR) => [`${resR.kind}:${resR.id}`, resR]));
    const resGone = [...resPrev.current.entries()].filter(([resK]) => !resNow.has(resK)).map(([, resR]) => resR);
    resPrev.current = resNow;
    if (!resGone.length) return;
    resSetLeaving((resL) => [...resL, ...resGone]);
    const resKeys = new Set(resGone.map((resG) => `${resG.kind}:${resG.id}`));
    setTimeout(() => resSetLeaving((resL) => resL.filter((resX) => !resKeys.has(`${resX.kind}:${resX.id}`))), 1600);
  }, [resRows]);

  if (!resRows) return <div className="panel muted">Loading…</div>;
  let resPos = 0;
  const resList = [
    ...resRows.map((resR) => ({ ...resR, resGoing: false, resPos: resR.stage === 'pending' ? ++resPos : null })),
    ...resLeaving.map((resR) => ({ ...resR, resGoing: true })),
  ];
  if (!resList.length) return <ResEmpty>Nothing open. Every case and request has been served.</ResEmpty>;

  return (
    <ul className="tags">
      {resList.map((resR) => (
        <li key={`${resR.kind}${resR.id}${resR.resGoing ? 'x' : ''}`} className={`tag p${resR.priority}${resR.resGoing ? ' is-done' : ''}`}>
          <div className="tag-head">
            <span className="tag-id">{resR.process_id}</span>
            <ResPriority value={resR.priority} />
            {resR.effective < resR.priority && <span className="aged">aged to P{resR.effective}</span>}
            <span className="tag-zone">{resR.zone}</span>
            <span className={`kind kind-${resR.kind}`}>{resR.kind === 'case' ? 'Emergency case' : 'NGO request'}</span>
            <span className={`tag-state s-${resR.resGoing ? 'fulfilled' : resR.stage}`}>
              {resR.resGoing ? 'Fulfilled' : RES_STAGE_TEXT[resR.stage] || 'Pending'}
              {resR.resPos && <span className="queue-pos">, {resOrdinal(resR.resPos)} in line</span>}
            </span>
          </div>
          <h4>{resR.title}</h4>
          {resShowOwner && (
            <p className="muted small">
              {resR.owner}, {resTimeAgo(resR.created_at)}
            </p>
          )}
          <div className="needs">
            {RES_TYPES.map((resK) => {
              const resGot = Number(resR[`got_${resK}`] || 0);
              const resAsked = Number(resR[resK]) + resGot;
              const resLeft = resR.resGoing ? 0 : Number(resR[resK]);
              if (!resAsked) return null;
              return (
                <div key={resK} className={`need${resLeft === 0 ? ' is-zero' : ''}`}>
                  <span className="need-num">{resLeft}</span>
                  <span className="need-label">
                    {RES_LABEL[resK]} needed
                    {resLeft < resAsked && <em> of {resAsked}</em>}
                  </span>
                </div>
              );
            })}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** admin logs an emergency case, NGO raises a request - same form */
export function ResCaseForm({ user: resUser, onCreated: resOnCreated }) {
  const resIsAdmin = resUser.role === 'admin';
  const resBlank = { title: '', case_type: 'flood', location: '', zone: resUser.zone, priority: 2, burst_time: 30, food: '', water: '', medicine: '', cots: '', vehicles: '' };
  const [resF, resSetF] = useState(resBlank);
  const [resMsg, resSetMsg] = useState(null);
  const [resBusy, resSetBusy] = useState(false);
  const resSet = (resK) => (resE) => resSetF({ ...resF, [resK]: resE.target.value });

  async function resSubmit(resE) {
    resE.preventDefault();
    resSetBusy(true);
    resSetMsg(null);
    try {
      const resOut = await resApi(resIsAdmin ? '/cases' : '/requests', { method: 'POST', body: resF });
      resSetF(resBlank);
      resSetMsg({ ok: true, text: `${resOut.process_id} added to the priority queue.` });
      resOnCreated?.();
    } catch (resErr) {
      resSetMsg({ ok: false, text: resErr.message });
    } finally {
      resSetBusy(false);
    }
  }

  return (
    <form className="panel form" onSubmit={resSubmit}>
      <h2>{resIsAdmin ? 'Log an emergency case' : 'Request supplies'}</h2>
      <label>
        {resIsAdmin ? 'What happened' : 'What is it for'}
        <input value={resF.title} onChange={resSet('title')} placeholder={resIsAdmin ? 'e.g. Bridge flooded near Sector 9' : 'e.g. 40 families at the Riverside camp'} required />
      </label>
      {resIsAdmin && (
        <div className="row2">
          <label>
            Type
            <select value={resF.case_type} onChange={resSet('case_type')}>
              {RES_CASE_TYPES.map((resT) => <option key={resT} value={resT}>{resT[0].toUpperCase() + resT.slice(1)}</option>)}
            </select>
          </label>
          <label>
            Location
            <input value={resF.location} onChange={resSet('location')} placeholder="Street or landmark" />
          </label>
        </div>
      )}
      <div className="row2">
        <label>
          Zone
          <select value={resF.zone} onChange={resSet('zone')}>
            {RES_ZONES.map((resZ) => <option key={resZ}>{resZ}</option>)}
          </select>
        </label>
        <label>
          Priority
          <select value={resF.priority} onChange={resSet('priority')}>
            {[1, 2, 3, 4].map((resP) => <option key={resP} value={resP}>{RES_PRIORITY[resP]}</option>)}
          </select>
        </label>
      </div>
      <div className="row5">
        {RES_TYPES.map((resK) => (
          <label key={resK}>
            {RES_LABEL[resK]}
            <input type="number" min="0" inputMode="numeric" value={resF[resK]} onChange={resSet(resK)} placeholder="0" />
          </label>
        ))}
      </div>
      {resIsAdmin && (
        <label className="narrow">
          Burst time (minutes, used in the OS lab)
          <input type="number" min="1" value={resF.burst_time} onChange={resSet('burst_time')} />
        </label>
      )}
      <ResNote msg={resMsg} />
      <button className="btn primary" disabled={resBusy}>{resIsAdmin ? 'Log case' : 'Send request'}</button>
    </form>
  );
}

/** admin: release pending cases in priority order, or turn on auto mode */
export function ResAllocatorControls({ isAdmin: resIsAdmin }) {
  const { resData, resReload } = resUseLive('/allocator', ['queue', 'sync']);
  const [resMsg, resSetMsg] = useState(null);
  const [resBusy, resSetBusy] = useState(false);

  async function resRun(resPath, resBody) {
    resSetBusy(true);
    resSetMsg(null);
    try {
      const resOut = await resApi(resPath, { method: 'POST', body: resBody });
      if (resPath === '/admin/allocate') {
        resSetMsg(resOut.count ? `${resOut.count} sent to the workers, highest priority first.` : 'Nothing pending right now.');
      }
      resReload();
    } catch (resErr) {
      resSetMsg(resErr.message);
    } finally {
      resSetBusy(false);
    }
  }

  if (!resData) return null;
  if (!resIsAdmin) {
    return (
      <p className="alloc-note">
        {resData.auto
          ? 'Automatic allocation is on: requests are served as soon as they arrive, highest priority first.'
          : 'Requests wait in the priority queue until the city controller runs the allocation. P1 Critical is served first.'}
      </p>
    );
  }
  return (
    <div className="panel alloc-bar">
      <div className="alloc-count">
        <span className="num">{resData.pending}</span>
        <span>
          waiting for allocation
          <br />
          <span className="muted small">served P1 → P4, oldest first, then smaller id</span>
        </span>
      </div>
      <button className="btn primary" disabled={resBusy || resData.pending === 0} onClick={() => resRun('/admin/allocate')}>
        Allocate by priority
      </button>
      <label className="switch">
        <input type="checkbox" checked={resData.auto} disabled={resBusy} onChange={(resE) => resRun('/admin/auto', { auto: resE.target.checked })} />
        <span>Allocate new cases automatically</span>
      </label>
      {resMsg && <p className="ok alloc-msg">{resMsg}</p>}
    </div>
  );
}

/** simple horizontal bars - enough for the analytics page */
export function ResBars({ items: resItems, max: resMax, unit: resUnit = '' }) {
  const resTop = resMax || Math.max(1, ...resItems.map((resI) => resI.value));
  return (
    <div className="bars">
      {resItems.map((resI) => (
        <div className="bars-row" key={resI.label}>
          <span className="bars-label">{resI.label}</span>
          <span className="bars-track">
            <span className={`bars-fill ${resI.tone || ''}`} style={{ width: `${(100 * resI.value) / resTop}%` }} />
          </span>
          <span className="bars-value num">
            {resI.value}
            {resUnit}
          </span>
        </div>
      ))}
    </div>
  );
}
