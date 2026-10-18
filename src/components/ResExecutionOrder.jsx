import { resApi, resUseLive, resOrdinal } from '../resApi.jsx';
import { ResPriority, ResEmpty } from './ResShared.jsx';

const RES_RESULT = { fulfilled: 'Fulfilled', partial: 'Partly given, rest waiting', waiting: 'No stock, waiting' };
const resSecs = (resMs) => `${(resMs / 1000).toFixed(1)}s`;

// one lane per worker; hatched = waiting for a zone lock, colour = priority
function ResGantt({ rows: resRows }) {
  const resT0 = Math.min(...resRows.map((resR) => resR.pickedAt));
  const resT1 = Math.max(...resRows.map((resR) => resR.finishedAt));
  const resSpan = Math.max(resT1 - resT0, 1);
  const resPct = (resT) => ((resT - resT0) / resSpan) * 100;
  const resWorkers = [...new Set(resRows.map((resR) => resR.worker))].sort();

  return (
    <div className="gantt" role="img" aria-label="Which worker ran which case, over time">
      {resWorkers.map((resW) => (
        <div className="gantt-row" key={resW}>
          <span className="gantt-label">{resW}</span>
          <div className="gantt-track">
            {resRows.filter((resR) => resR.worker === resW).map((resR) => (
              <div key={resR.id}>
                {resR.startedAt - resR.pickedAt > 30 && (
                  <span className="gantt-wait" style={{ left: `${resPct(resR.pickedAt)}%`, width: `${resPct(resR.startedAt) - resPct(resR.pickedAt)}%` }} />
                )}
                <span className={`gantt-bar p${resR.priority}`}
                  style={{ left: `${resPct(resR.startedAt)}%`, width: `${Math.max(resPct(resR.finishedAt) - resPct(resR.startedAt), 3)}%` }}
                  title={`${resR.pid}, P${resR.priority}, ${resR.zone}`}>
                  {resR.pid}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="gantt-axis">
        <span>0s</span>
        <span>{resSecs(resSpan)}</span>
      </div>
    </div>
  );
}

export default function ResExecutionOrder() {
  const { resData, resReload } = resUseLive('/trace', ['sync']);

  async function resClear() {
    await resApi('/trace/clear', { method: 'POST' });
    resReload();
  }

  const resRuns = [];
  for (const resRow of resData || []) {
    const resLast = resRuns[resRuns.length - 1];
    if (!resLast || resLast.id !== resRow.run) resRuns.push({ id: resRow.run, rows: [resRow] });
    else resLast.rows.push(resRow);
  }

  return (
    <section className="panel exec">
      <div className="exec-head">
        <div>
          <h2>Execution order</h2>
          <p className="muted small">Which process the workers actually ran first. Hatched bars are time spent waiting for a zone lock.</p>
        </div>
        {resData?.length > 0 && <button className="link-btn dark" onClick={resClear}>Clear history</button>}
      </div>
      {!resData ? (
        <p className="muted">Loading…</p>
      ) : !resRuns.length ? (
        <ResEmpty>Nothing has run yet.</ResEmpty>
      ) : (
        resRuns.reverse().map((resRun) => (
          <div className="exec-run" key={resRun.id}>
            <h3>
              Allocation run {resRun.id} <span className="muted small">({resRun.rows.length} executions)</span>
            </h3>
            <ResGantt rows={resRun.rows} />
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Order</th><th>Process</th><th>Priority</th><th>Zone</th><th>Worker</th>
                    <th className="r">Waited for lock</th><th className="r">Ran for</th><th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {resRun.rows.map((resR, resI) => (
                    <tr key={resR.id}>
                      <td className="num order">{resOrdinal(resI + 1)}</td>
                      <td><strong>{resR.pid}</strong> {resR.title}</td>
                      <td><ResPriority value={resR.priority} /></td>
                      <td>{resR.zone}</td>
                      <td>{resR.worker}</td>
                      <td className="r num">{resR.startedAt - resR.pickedAt > 30 ? resSecs(resR.startedAt - resR.pickedAt) : '–'}</td>
                      <td className="r num">{resSecs(resR.finishedAt - resR.startedAt)}</td>
                      <td>
                        <span className={`res res-${resR.result}`}>{RES_RESULT[resR.result]}</span>
                        {resR.given && <div className="muted small">{resR.given}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </section>
  );
}
