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
    <ResPage title="Stock" intro="Adding stock signals the zone's condition variable, so cases blocked there are allocated straight away.">
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
      <ResLedger />
    </ResPage>
  );
}
