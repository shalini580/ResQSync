import { resUseLive, resOrdinal, RES_LABEL } from '../resApi.jsx';
import { ResPriority, ResEmpty } from './ResShared.jsx';

function ResState({ it: resIt }) {
  const resLast = resIt.rounds[resIt.rounds.length - 1];
  switch (resIt.state) {
    case 'ready':
      return <span className="st st-ready">Ready, waiting for a worker</span>;
    case 'locking':
      return <span className="st st-lock">{resIt.worker} waiting for the {resIt.zone} lock</span>;
    case 'running':
      return (
        <span className="st st-run">
          Running on {resIt.worker}
          <span className="runbar" aria-hidden="true">
            <span key={resIt.runningSince} style={{ animationDuration: `${resIt.runFor}ms` }} />
          </span>
        </span>
      );
    case 'done':
      return <span className="st st-done">Executed {resOrdinal(resLast.order)}, fulfilled</span>;
    case 'partial':
      return <span className="st st-part">Executed {resOrdinal(resLast.order)}, partly given, waiting for more</span>;
    case 'woken':
      return <span className="st st-ready">Stock added, back in the queue</span>;
    default:
      return <span className="st st-wait">Waiting for stock{resLast ? ` (ran ${resOrdinal(resLast.order)})` : ''}</span>;
  }
}

function ResDeductions({ rounds: resRounds }) {
  const resLines = resRounds.flatMap((resR) => resR.ledger);
  if (!resLines.length) return <span className="muted">–</span>;
  return (
    <ul className="deduct">
      {resLines.map((resL, resI) => (
        <li key={resI}>
          <span className="deduct-res">{RES_LABEL[resL.type]}</span>
          <span className="num">{resL.before}</span>
          <span className="minus">− {-resL.change}</span>
          <span>=</span>
          <span className="num after">{resL.after}</span>
        </li>
      ))}
    </ul>
  );
}

/** every case/request of the current allocation run, in the order it was scheduled */
export default function ResReadyQueue() {
  const { resData } = resUseLive('/sync', ['sync', 'queue']);
  const { resData: resQueue } = resUseLive('/queue', ['queue']);
  const resRun = resData?.run;
  const resPending = (resQueue || []).filter((resR) => resR.stage === 'pending');

  return (
    <section className="panel rq">
      <div className="exec-head">
        <div>
          <h2>Ready queue{resRun ? `, allocation run ${resRun.id}` : ''}</h2>
          <p className="muted small">
            In the order the scheduler picked them (P1 first). Each one runs as a single ACID transaction: stock is taken and
            the case counts down together, or not at all.
          </p>
        </div>
        {resData && (
          <span className="muted small">
            {resData.config.workers} workers, {(resData.config.workDelayMs / 1000).toFixed(1)}s each
          </span>
        )}
      </div>

      {resPending.length > 0 && (
        <div className="next-run">
          <h3>Next in line, waiting for "Allocate by priority"</h3>
          <ol className="next-list">
            {resPending.map((resR) => (
              <li key={`${resR.kind}${resR.id}`}>
                <ResPriority value={resR.priority} />
                {resR.effective < resR.priority && <span className="aged">aged to P{resR.effective}</span>}
                <span>{resR.process_id} {resR.title}</span>
                <span className="muted small">{resR.zone}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {!resData ? (
        <p className="muted">Loading…</p>
      ) : !resRun || !resRun.items.length ? (
        !resPending.length && <ResEmpty>Nothing in the queue. Log a case, then click "Allocate by priority".</ResEmpty>
      ) : (
        <div className="table-wrap">
          <table className="table rq-table">
            <thead>
              <tr>
                <th>In line</th>
                <th>Process</th>
                <th>Priority</th>
                <th>Zone</th>
                <th>State</th>
                <th>Stock (before − given = after)</th>
                <th className="r">Txn</th>
              </tr>
            </thead>
            <tbody>
              {[...resRun.items].sort((resA, resB) => resA.slot - resB.slot).map((resIt) => (
                <tr key={resIt.key} className={`rq-row s-${resIt.state}`}>
                  <td className="num order">{resOrdinal(resIt.slot)}</td>
                  <td>
                    <strong>{resIt.pid}</strong> {resIt.title}
                  </td>
                  <td>
                    <ResPriority value={resIt.priority} />
                    {resIt.effective < resIt.priority && <div className="aged">aged to P{resIt.effective}</div>}
                  </td>
                  <td>{resIt.zone}</td>
                  <td><ResState it={resIt} /></td>
                  <td><ResDeductions rounds={resIt.rounds} /></td>
                  <td className="r num">{resIt.rounds.map((resR) => `#${resR.txnId}`).join(', ') || '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
