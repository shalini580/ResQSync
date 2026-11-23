import { useState } from 'react';
import { resUseLive, resTimeAgo } from '../resApi.jsx';
import { ResPage, ResEmpty } from '../components/ResShared.jsx';

const RES_ACTIONS = ['', 'STOCK_ALLOCATED', 'STOCK_ADDED', 'CASE_STATUS', 'VOLUNTEER_REWARD'];

export default function ResAuditLog() {
  const [resAction, resSetAction] = useState('');
  const { resData: resRows } = resUseLive(`/audit?limit=150${resAction ? `&action=${resAction}` : ''}`, ['stock', 'ledger', 'queue', 'missions']);
  return (
    <ResPage
      title="Audit log"
      intro="Every row here was written by a database trigger. The OS and DBMS columns say which concept the event belongs to."
      actions={
        <label className="inline-label">Show
          <select value={resAction} onChange={(resE) => resSetAction(resE.target.value)}>
            {RES_ACTIONS.map((resA) => <option key={resA} value={resA}>{resA || 'Everything'}</option>)}
          </select>
        </label>
      }
    >
      <section className="panel">
        {!resRows ? <p className="muted">Loading…</p> : !resRows.length ? <ResEmpty>Nothing logged yet.</ResEmpty> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th className="r">Txn</th><th>Action</th><th>Details</th><th>By</th><th>OS concept</th><th>DBMS concept</th><th>When</th></tr></thead>
              <tbody>
                {resRows.map((resR) => (
                  <tr key={resR.id}>
                    <td className="r num">{resR.txn_id ? `#${resR.txn_id}` : '–'}</td>
                    <td><code>{resR.action}</code></td>
                    <td>{resR.details}</td>
                    <td>{resR.actor}</td>
                    <td className="muted">{resR.os_concept}</td>
                    <td className="muted">{resR.dbms_concept}</td>
                    <td className="muted nowrap">{resTimeAgo(resR.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </ResPage>
  );
}
