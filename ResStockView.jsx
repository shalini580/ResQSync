import { useState } from 'react';
import { resApi, resUseLive, resTimeAgo, RES_ZONES, RES_TYPES, RES_LABEL } from '../resApi.jsx';
import { ResPage, ResStockBoard, ResEmpty, ResNote } from '../components/ResShared.jsx';

export function ResRollbackTest() {
  const [resF, resSetF] = useState({ zone: 'Zone A', type: 'food', amount: 50 });
  const [resR, resSetR] = useState(null);
  const [resErr, resSetErr] = useState('');
  const resSet = (resK) => (resE) => resSetF({ ...resF, [resK]: resE.target.value });

  async function resGo(resE) {
    resE.preventDefault();
    resSetErr('');
    try {
      resSetR(await resApi('/admin/rollback-test', { method: 'POST', body: resF }));
    } catch (resX) {
      resSetErr(resX.message);
    }
  }

  return (
    <form className="panel form" onSubmit={resGo}>
      <h2>ACID rollback test</h2>
      <p className="muted small">
        Starts a transaction, takes stock, then crashes on purpose before COMMIT. Atomicity means the stock comes back and the
        trigger's audit row disappears too.
      </p>
      <div className="row3">
        <label>Zone
          <select value={resF.zone} onChange={resSet('zone')}>{RES_ZONES.map((resZ) => <option key={resZ}>{resZ}</option>)}</select>
        </label>
        <label>Resource
          <select value={resF.type} onChange={resSet('type')}>{RES_TYPES.map((resT) => <option key={resT} value={resT}>{RES_LABEL[resT]}</option>)}</select>
        </label>
        <label>Amount
          <input type="number" min="1" value={resF.amount} onChange={resSet('amount')} />
        </label>
      </div>
      <button className="btn">Run rollback test</button>
      {resErr && <p className="error">{resErr}</p>}
      {resR && (
        <ol className={`acid-steps ${resR.ok ? 'is-ok' : 'is-bad'}`}>
          <li>Txn #{resR.txnId} BEGIN: {resR.zone} {resR.type} was <b>{resR.before}</b></li>
          <li>Inside the transaction it became <b>{resR.seenInside}</b></li>
          <li>Crash before COMMIT, so ROLLBACK</li>
          <li>After rollback: <b>{resR.after}</b>, audit rows kept: <b>{resR.auditRowsKept}</b></li>
          <li className="verdict">{resR.ok ? 'Atomicity holds: nothing was half saved.' : 'Mismatch: rollback did not restore the stock.'}</li>
        </ol>
      )}
    </form>
  );
}

export function ResLedger() {
  const { resData } = resUseLive('/ledger', ['ledger', 'stock']);
  return (
    <section className="panel">
      <h2>Stock ledger</h2>
      <p className="muted small ledger-intro">
        Written by the trigger <code>trg_resource_audit</code> into <code>audit_logs</code> every time stock changes. Rows with the
        same transaction number were committed together.
      </p>
      {!resData ? <p className="muted">Loading…</p> : !resData.length ? <ResEmpty>No stock has changed yet.</ResEmpty> : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th className="r">Txn</th><th>Zone</th><th>Resource</th><th className="r">Before</th><th className="r">Change</th><th className="r">After</th><th>Why</th><th>When</th></tr>
            </thead>
            <tbody>
              {resData.map((resL) => {
                const resChange = resL.new_value - resL.old_value;
                return (
                  <tr key={resL.id}>
                    <td className="r num">{resL.txn_id ? `#${resL.txn_id}` : '–'}</td>
                    <td>{resL.zone}</td>
                    <td>{RES_LABEL[resL.resource_type] || resL.resource_type}</td>
                    <td className="r num">{resL.old_value}</td>
                    <td className={`r num ${resChange < 0 ? 'neg' : 'pos'}`}>{resChange > 0 ? '+' : '−'}{Math.abs(resChange)}</td>
                    <td className="r num">{resL.new_value}</td>
                    <td>{resL.actor}{resL.details.includes('(') ? ` ${resL.details.slice(resL.details.indexOf('('))}` : ''}</td>
                    <td className="muted">{resTimeAgo(resL.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const RES_FORECAST_LABEL = { short: 'Short now', critical: 'Under 3 h', watch: 'Under 12 h', ok: 'OK' };
const RES_FORECAST_ORDER = { short: 0, critical: 1, watch: 2, ok: 3 };

function resHoursText(resH) {
  if (resH === null) return 'no recent use';
  if (resH < 1) return `${Math.max(1, Math.round(resH * 60))} min`;
  if (resH < 48) return `${resH.toFixed(1)} h`;
  return `${Math.round(resH / 24)} days`;
}

/** moving-average forecast: when does each zone run out, and what to restock */
function ResForecast({ onPick: resOnPick }) {
  const { resData: resF } = resUseLive('/forecast', ['stock', 'ledger', 'queue']);
  const [resAll, resSetAll] = useState(false);
  if (!resF) return <div className="panel muted">Loading forecast…</div>;
  const resRows = [...resF.rows].sort((resA, resB) => RES_FORECAST_ORDER[resA.status] - RES_FORECAST_ORDER[resB.status] || (resA.hoursLeft ?? 1e9) - (resB.hoursLeft ?? 1e9));
  const resShown = resAll ? resRows : resRows.filter((resR) => resR.status !== 'ok');
  return (
    <section className="panel">
      <div className="report-head">
        <h2>Forecast: when will it run out?</h2>
        <label className="switch"><input type="checkbox" checked={resAll} onChange={(resE) => resSetAll(resE.target.checked)} /> Show all {resRows.length} rows</label>
      </div>
      <p className="muted small measure">
        Use per hour = what was handed out in the last {resF.windowHours} hours (from the audit log) divided by {resF.windowHours}.
        Runs out in = left ÷ use per hour. Waiting = what open cases still ask for. The suggestion covers the waiting demand plus the next {resF.coverHours} hours.
      </p>
      {!resShown.length ? <ResEmpty>Nothing is running low. Every zone has enough for the next 12 hours.</ResEmpty> : (
        <div className="table-wrap">
          <table className="table forecast">
            <thead>
              <tr><th>Zone</th><th>Resource</th><th className="r">Left</th><th className="r">Use / hour</th><th className="r">Runs out in</th><th className="r">Waiting</th><th>Status</th><th className="r">Suggested</th></tr>
            </thead>
            <tbody>
              {resShown.map((resR) => (
                <tr key={`${resR.zone}${resR.type}`}>
                  <td>{resR.zone}</td>
                  <td>{RES_LABEL[resR.type]}</td>
                  <td className="r num">{resR.available}</td>
                  <td className="r num">{resR.type === 'vehicles' ? 'returns' : resR.ratePerHour}</td>
                  <td className="r num">{resR.type === 'vehicles' ? '–' : resHoursText(resR.hoursLeft)}</td>
                  <td className="r num">{resR.waiting}</td>
                  <td><span className={`fc fc-${resR.status}`}>{RES_FORECAST_LABEL[resR.status]}</span></td>
                  <td className="r">
                    {resR.suggest > 0
                      ? <button className="btn small-btn" onClick={() => resOnPick({ zone: resR.zone, type: resR.type, amount: resR.suggest })}>Add {resR.suggest}</button>
                      : <span className="muted small">none</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function ResStockView() {
  const [resF, resSetF] = useState({ zone: 'Zone D', type: 'food', amount: 100 });
  const [resMsg, resSetMsg] = useState(null);
  const { resData: resCheck } = resUseLive('/admin/integrity', ['stock', 'ledger']);
  const resSet = (resK) => (resE) => resSetF({ ...resF, [resK]: resE.target.value });

  async function resRestock(resE) {
    resE.preventDefault();
    resSetMsg(null);
    try {
      const resOut = await resApi('/resources/restock', { method: 'POST', body: resF });
      resSetMsg({ ok: true, text: `Txn #${resOut.txnId}: added ${resF.amount} ${resF.type} to ${resF.zone}. Cases waiting there were woken, P1 first.` });
    } catch (resErr) {
      resSetMsg({ ok: false, text: resErr.message });
    }
  }

  return (
    <ResPage title="Stock & forecast" intro="Adding stock signals the zone's condition variable, so cases blocked there are allocated straight away. The forecast below warns before a zone runs dry.">
      <div className="split">
        <div>
          <form className="panel form" onSubmit={resRestock}>
            <h2>Add stock</h2>
            <div className="row2">
              <label>Zone
                <select value={resF.zone} onChange={resSet('zone')}>{RES_ZONES.map((resZ) => <option key={resZ}>{resZ}</option>)}</select>
              </label>
              <label>Resource
                <select value={resF.type} onChange={resSet('type')}>{RES_TYPES.map((resT) => <option key={resT} value={resT}>{RES_LABEL[resT]}</option>)}</select>
              </label>
            </div>
            <label>Amount
              <input type="number" min="1" value={resF.amount} onChange={resSet('amount')} required />
            </label>
            <ResNote msg={resMsg} />
            <button className="btn primary">Add stock</button>
            {resCheck && (
              <div className={`ledger ${resCheck.ok ? 'is-ok' : 'is-bad'}`}>
                <strong>{resCheck.ok ? 'Ledger balanced' : 'Ledger mismatch'}</strong>
                <span>{resCheck.ok ? `All ${resCheck.checked} stock rows match the rescue missions. Nothing was given out twice.` : `${resCheck.mismatches.length} rows don't match.`}</span>
              </div>
            )}
          </form>
          <ResRollbackTest />
        </div>
        <section>
          <h2 className="section-title">Stock by zone</h2>
          <ResStockBoard />
        </section>
      </div>
      <ResForecast onPick={(resPick) => { resSetF(resPick); resSetMsg({ ok: true, text: `Filled in ${resPick.amount} ${resPick.type} for ${resPick.zone}. Press Add stock to confirm.` }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
      <ResLedger />
    </ResPage>
  );
}
