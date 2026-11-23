import { useRef, useState } from 'react';
import { resApi, resGetToken, resUseLive, resTimeAgo, RES_LABEL, RES_PRIORITY } from '../resApi.jsx';
import { ResPage, ResNote, ResEmpty } from '../components/ResShared.jsx';
import { ResStars } from '../components/ResRate.jsx';

const resDay = (resD) => resD.toISOString().slice(0, 10);
const resKb = (resB) => (resB > 1048576 ? `${(resB / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(resB / 1024))} KB`);
const resOr = (resV, resSuffix = '') => (resV === null || resV === undefined ? '–' : `${resV}${resSuffix}`);

function ResCompliance() {
  const [resFrom, resSetFrom] = useState(resDay(new Date(Date.now() - 6 * 86400000)));
  const [resTo, resSetTo] = useState(resDay(new Date()));
  const resQs = `from=${resFrom}&to=${resTo}`;
  const { resData: resR, resError } = resUseLive(`/reports/compliance?${resQs}`, ['queue', 'missions', 'feedback', 'surplus', 'backups', 'ledger']);
  const resCsv = `/api/reports/compliance.csv?${resQs}&token=${encodeURIComponent(resGetToken() || '')}`;

  return (
    <section className="panel report">
      <div className="report-head">
        <h2>Compliance report</h2>
        <div className="report-range no-print">
          <label>From<input type="date" value={resFrom} max={resTo} onChange={(resE) => resSetFrom(resE.target.value)} /></label>
          <label>To<input type="date" value={resTo} min={resFrom} onChange={(resE) => resSetTo(resE.target.value)} /></label>
          <a className="btn" href={resCsv} download>Download CSV</a>
          <button className="btn" onClick={() => window.print()}>Print</button>
        </div>
      </div>
      {resError && <p className="error">{resError}</p>}
      {!resR ? <p className="muted">Loading…</p> : (
        <>
          <p className="muted small">
            {resR.period.from} to {resR.period.to}. Service targets (SLA) are measured from when a case is logged to its first allocation. Generated {resTimeAgo(resR.generatedAt)} from {resR.engine === 'mysql' ? 'MySQL' : 'SQLite'}.
          </p>
          <div className="tiles">
            <div className="tile"><span className="tile-num">{resR.summary.logged}</span><span>cases and requests logged</span></div>
            <div className="tile"><span className="tile-num">{resR.summary.fulfilled}</span><span>fulfilled</span></div>
            <div className="tile"><span className="tile-num">{resOr(resR.summary.slaMetPct, '%')}</span><span>within SLA</span></div>
            <div className="tile"><span className="tile-num">{resOr(resR.summary.avgRating)}</span><span>average rating ({resR.summary.ratings})</span></div>
          </div>

          <h3>Checks</h3>
          <ul className="checks">
            {resR.checks.map((resC) => (
              <li key={resC.name} className={resC.ok ? 'pass' : 'fail'}>
                <span className="check-mark" aria-hidden="true">{resC.ok ? '✓' : '!'}</span>
                <span><strong>{resC.name}</strong><span className="muted small"> – {resC.detail}</span></span>
              </li>
            ))}
          </ul>

          <h3>Response time by priority</h3>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Priority</th><th className="r">Logged</th><th className="r">Served</th><th className="r">Fulfilled</th><th className="r">Open</th><th className="r">Target</th><th className="r">Avg to first allocation</th><th className="r">Within target</th></tr>
              </thead>
              <tbody>
                {resR.byPriority.map((resP) => (
                  <tr key={resP.priority}>
                    <td>{RES_PRIORITY[resP.priority]}</td>
                    <td className="r num">{resP.logged}</td>
                    <td className="r num">{resP.served}</td>
                    <td className="r num">{resP.fulfilled}</td>
                    <td className="r num">{resP.open}</td>
                    <td className="r num">{resP.slaMinutes} min</td>
                    <td className="r num">{resOr(resP.avgFirstAllocation, ' min')}</td>
                    <td className={`r num ${resP.slaMetPct !== null && resP.slaMetPct < 90 ? 'miss' : ''}`}>{resOr(resP.slaMetPct, '%')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3>Resources by zone</h3>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Zone</th><th className="r">Open</th>{resR.byZone[0]?.resources.map((resX) => <th key={resX.type} className="r">{RES_LABEL[resX.type]} given / left</th>)}</tr>
              </thead>
              <tbody>
                {resR.byZone.map((resZ) => (
                  <tr key={resZ.zone}>
                    <td>{resZ.zone}</td>
                    <td className="r num">{resZ.open}</td>
                    {resZ.resources.map((resX) => <td key={resX.type} className="r num">{resX.given} / {resX.available}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="split even">
            <div>
              <h3>Surplus food</h3>
              <ul className="plain">
                <li><span>Donations posted</span><span className="num">{resR.surplus.posted}</span></li>
                <li><span>Servings posted</span><span className="num">{resR.surplus.servings}</span></li>
                <li><span>Servings rescued</span><span className="num">{resR.surplus.rescued}</span></li>
                <li><span>Servings in progress</span><span className="num">{resR.surplus.inProgress}</span></li>
                <li><span>Servings expired</span><span className="num">{resR.surplus.expired}</span></li>
              </ul>
              <h3>Audit trail</h3>
              {!resR.audit.length ? <ResEmpty>No audit rows in this period.</ResEmpty> : (
                <ul className="plain">
                  {resR.audit.map((resA) => <li key={resA.action}><span>{resA.action}</span><span className="num">{resA.count}</span></li>)}
                  <li><span>Transactions</span><span className="num">{resR.summary.transactions}</span></li>
                </ul>
              )}
            </div>
            <div>
              <h3>Volunteers</h3>
              {!resR.volunteers.length ? <ResEmpty>No missions in this period.</ResEmpty> : (
                <table className="table">
                  <thead><tr><th>Volunteer</th><th className="r">Missions</th><th className="r">Completed</th><th>Rating</th></tr></thead>
                  <tbody>
                    {resR.volunteers.map((resV) => (
                      <tr key={resV.name}><td>{resV.name}</td><td className="r num">{resV.missions}</td><td className="r num">{resV.completed}</td><td><ResStars value={resV.avgRating} /></td></tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="muted small">{resR.summary.lowRatings} low rating(s) (1–2 stars) in this period; each one raised an admin alert through trigger trg_low_rating_alert.</p>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function ResBackups() {
  const { resData, resReload } = resUseLive('/admin/backups', ['backups']);
  const [resMsg, resSetMsg] = useState(null);
  const [resBusy, resSetBusy] = useState(false);
  const [resConfirm, resSetConfirm] = useState(null);
  const resFileInput = useRef(null);
  const resToken = encodeURIComponent(resGetToken() || '');

  async function resDo(resFn, resOk) {
    resSetBusy(true);
    resSetMsg(null);
    try {
      const resOut = await resFn();
      resSetMsg({ ok: true, text: resOk(resOut) });
      resReload();
    } catch (resErr) {
      resSetMsg({ ok: false, text: resErr.message });
    } finally {
      resSetBusy(false);
      resSetConfirm(null);
    }
  }

  async function resUpload(resE) {
    const resFile = resE.target.files?.[0];
    resE.target.value = '';
    if (!resFile) return;
    let resBody;
    try {
      resBody = JSON.parse(await resFile.text());
    } catch {
      resSetMsg({ ok: false, text: 'That file is not valid JSON.' });
      return;
    }
    resDo(() => resApi('/admin/backups/upload', { method: 'POST', body: resBody }), (resOut) => `Uploaded as ${resOut.file}. Restore it from the list.`);
  }

  return (
    <section className="panel">
      <div className="report-head">
        <h2>Backup and recovery</h2>
        <div className="report-range">
          <button className="btn primary" disabled={resBusy} onClick={() => resDo(() => resApi('/admin/backups', { method: 'POST' }), (resOut) => `Backup ${resOut.file} saved.`)}>Back up now</button>
          <button className="btn" disabled={resBusy} onClick={() => resFileInput.current?.click()}>Upload backup</button>
          <input ref={resFileInput} type="file" accept="application/json,.json" hidden onChange={resUpload} />
        </div>
      </div>
      <p className="muted small">
        A backup is a logical dump of all 12 tables into one JSON file. Restore deletes and re-inserts every row inside ONE transaction, so it either fully works or changes nothing.
        A safety copy of the current data is taken before every restore.
        {resData && (resData.everyHours ? ` Automatic backup every ${resData.everyHours} h, newest ${resData.keep} kept in ${resData.folder}.` : ' Automatic backups are off.')}
      </p>
      <ResNote msg={resMsg} />
      {!resData ? <p className="muted">Loading…</p> : !resData.backups.length ? <ResEmpty>No backups yet.</ResEmpty> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>File</th><th>Made by</th><th className="r">Rows</th><th className="r">Size</th><th /></tr></thead>
            <tbody>
              {resData.backups.map((resB) => {
                const resRows = resB.counts ? Object.values(resB.counts).reduce((resA, resN) => resA + resN, 0) : null;
                return (
                  <tr key={resB.file}>
                    <td><strong className="mono">{resB.file}</strong><div className="muted small">{resTimeAgo(resB.createdAt)}{resB.engine ? `, from ${resB.engine}` : ''}</div></td>
                    <td>{resB.createdBy || '–'}</td>
                    <td className="r num">{resOr(resRows)}</td>
                    <td className="r num">{resKb(resB.size)}</td>
                    <td className="r nowrap">
                      <a className="btn small-btn" href={`/api/admin/backups/${resB.file}?token=${resToken}`} download>Download</a>{' '}
                      {resConfirm === resB.file ? (
                        <>
                          <button className="btn small-btn danger" disabled={resBusy}
                            onClick={() => resDo(() => resApi(`/admin/backups/${resB.file}/restore`, { method: 'POST' }), (resOut) => `Restored in transaction #${resOut.txnId}. Safety copy: ${resOut.safetyCopy}.`)}>
                            Yes, restore
                          </button>{' '}
                          <button className="btn small-btn" onClick={() => resSetConfirm(null)}>Cancel</button>
                        </>
                      ) : (
                        <button className="btn small-btn" disabled={resBusy || resB.broken} onClick={() => resSetConfirm(resB.file)}>Restore</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small">Restore is refused while the allocator workers are busy, so no allocation is half-way through.</p>
    </section>
  );
}

function ResFeedbackLog() {
  const { resData } = resUseLive('/feedback', ['feedback']);
  return (
    <section className="panel">
      <h2>Latest ratings <span className="count">{resData?.length ?? ''}</span></h2>
      {!resData ? <p className="muted">Loading…</p> : !resData.length ? <ResEmpty>No ratings yet.</ResEmpty> : (
        <ul className="plain feedback-list">
          {resData.slice(0, 15).map((resF) => (
            <li key={resF.id} className={resF.rating <= 2 ? 'low' : ''}>
              <span><span className="stars-read">{'★'.repeat(resF.rating)}</span> {resF.from_name} → <strong>{resF.to_name}</strong> <span className="muted small">({resF.to_role})</span></span>
              <span className="muted small">{resF.context === 'mission' ? 'Delivery' : 'Surplus'} #{resF.context_id}, {resTimeAgo(resF.created_at)}</span>
              {resF.comment && <span className="small">&ldquo;{resF.comment}&rdquo;</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function ResReports() {
  return (
    <ResPage title="Reports and backups" intro="Compliance report for any date range, ratings from the field, and database backup and recovery.">
      <ResCompliance />
      <div className="split rev no-print">
        <ResBackups />
        <ResFeedbackLog />
      </div>
    </ResPage>
  );
}
