import { useState } from 'react';
import { resApi, resUseLive, RES_ZONES, RES_PRIORITY, RES_CASE_TYPES } from '../resApi.jsx';
import { ResPage, ResPriority, ResNote } from '../components/ResShared.jsx';
import { ResLocationPicker } from '../components/ResGeo.jsx';

const resPct = (resV) => `${Math.round(Number(resV) * 100)}%`;

function ResMetricTable({ model: resM }) {
  const resRows = [
    ['Accuracy', 'accuracy', 'Right answers out of all test cases'],
    ['Precision', 'precision', 'Of the cases it called critical, how many were'],
    ['Recall', 'recall', 'Of the really critical cases, how many it caught'],
    ['F1', 'f1', 'Balance of precision and recall'],
    ['AUC', 'auc', 'How well it ranks critical above non-critical'],
  ];
  return (
    <table className="table">
      <thead>
        <tr><th>Test set ({resM.testRows} cases)</th><th className="r">ML model</th><th className="r">Priority only</th></tr>
      </thead>
      <tbody>
        {resRows.map(([resName, resKey, resHelp]) => {
          const resBetter = resM.test[resKey] >= resM.baseline[resKey];
          return (
            <tr key={resKey}>
              <td>{resName}<div className="muted small">{resHelp}</div></td>
              <td className={`r num ${resBetter ? 'win' : ''}`}>{resM.test[resKey]}%</td>
              <td className="r num">{resM.baseline[resKey]}%</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ResConfusion({ c: resC, title: resTitle }) {
  return (
    <div className="confusion">
      <h3>{resTitle}</h3>
      <table>
        <thead><tr><th /><th>Said critical</th><th>Said not</th></tr></thead>
        <tbody>
          <tr><th>Was critical</th><td className="good">{resC.tp}</td><td className="bad">{resC.fn}</td></tr>
          <tr><th>Was not</th><td className="bad">{resC.fp}</td><td className="good">{resC.tn}</td></tr>
        </tbody>
      </table>
    </div>
  );
}

function ResLossCurve({ points: resPts }) {
  const resW = 320;
  const resH = 140;
  const resMaxE = resPts[resPts.length - 1].epoch || 1;
  const resLo = Math.min(...resPts.map((resP) => resP.loss));
  const resHi = Math.max(...resPts.map((resP) => resP.loss));
  const resX = (resE) => 34 + (resE / resMaxE) * (resW - 44);
  const resY = (resL) => 10 + ((resHi - resL) / (resHi - resLo || 1)) * (resH - 34);
  const resPath = resPts.map((resP, resI) => `${resI ? 'L' : 'M'}${resX(resP.epoch).toFixed(1)},${resY(resP.loss).toFixed(1)}`).join('');
  return (
    <svg viewBox={`0 0 ${resW} ${resH}`} className="loss" role="img" aria-label={`Training loss fell from ${resHi} to ${resLo}`}>
      <line x1="34" y1={resH - 24} x2={resW - 10} y2={resH - 24} className="axis" />
      <line x1="34" y1="10" x2="34" y2={resH - 24} className="axis" />
      <text x="30" y="16" className="tick" textAnchor="end">{resHi.toFixed(2)}</text>
      <text x="30" y={resH - 24} className="tick" textAnchor="end">{resLo.toFixed(2)}</text>
      <text x="34" y={resH - 8} className="tick">0</text>
      <text x={resW - 10} y={resH - 8} className="tick" textAnchor="end">{resMaxE} epochs</text>
      <path d={resPath} className="loss-line" />
    </svg>
  );
}

function ResWhatIf() {
  const [resF, resSetF] = useState({ zone: 'Zone A', priority: 2, case_type: 'fire', people_affected: 200, wait_min: 0, loc_x: '', loc_y: '', medicine: 20, food: 50 });
  const [resOut, resSetOut] = useState(null);
  const [resErr, resSetErr] = useState(null);
  const resSet = (resK) => (resE) => resSetF({ ...resF, [resK]: resE.target.value });

  async function resRun(resE) {
    resE.preventDefault();
    try {
      resSetOut(await resApi('/ml/predict', { method: 'POST', body: resF }));
      resSetErr(null);
    } catch (resX) {
      resSetErr({ ok: false, text: resX.message });
    }
  }
  const resTop = resOut ? [...resOut.contributions].sort((resA, resB) => Math.abs(resB.impact) - Math.abs(resA.impact)).slice(0, 6) : [];
  const resMax = Math.max(0.01, ...resTop.map((resC) => Math.abs(resC.impact)));

  return (
    <form className="panel form" onSubmit={resRun}>
      <h2>What if…</h2>
      <p className="muted small">Try an imaginary incident and see the risk the model predicts and where the scheduler would put it.</p>
      <div className="row2">
        <label>Zone<select value={resF.zone} onChange={(resE) => resSetF({ ...resF, zone: resE.target.value, loc_x: '', loc_y: '' })}>{RES_ZONES.map((resZ) => <option key={resZ}>{resZ}</option>)}</select></label>
        <label>Priority<select value={resF.priority} onChange={resSet('priority')}>{[1, 2, 3, 4].map((resP) => <option key={resP} value={resP}>{RES_PRIORITY[resP]}</option>)}</select></label>
      </div>
      <div className="row2">
        <label>Type<select value={resF.case_type} onChange={resSet('case_type')}>{RES_CASE_TYPES.map((resT) => <option key={resT}>{resT}</option>)}</select></label>
        <label>People affected<input type="number" min="1" value={resF.people_affected} onChange={resSet('people_affected')} /></label>
      </div>
      <div className="row2">
        <label>Already waited (min)<input type="number" min="0" value={resF.wait_min} onChange={resSet('wait_min')} /></label>
        <label>Medicine kits<input type="number" min="0" value={resF.medicine} onChange={resSet('medicine')} /></label>
      </div>
      <ResLocationPicker zone={resF.zone} x={resF.loc_x} y={resF.loc_y} onPick={(resX, resY) => resSetF({ ...resF, loc_x: resX, loc_y: resY })} />
      <ResNote msg={resErr} />
      <button className="btn primary">Predict</button>
      {resOut && (
        <div className="whatif-out">
          <div className="tiles three">
            <div className="tile"><span className="tile-num">{resPct(resOut.risk)}</span><span>risk</span></div>
            <div className="tile"><span className="tile-num">{resOut.distance.toFixed(1)}</span><span>km to depot</span></div>
            <div className="tile"><span className="tile-num">{resOut.score.toFixed(2)}</span><span>queue score</span></div>
          </div>
          <p>
            Served as <ResPriority value={resOut.effective} />
            {resOut.promoted ? ' (moved up one level by the ML model).' : '.'}
          </p>
          <h3>Why: biggest pushes on the risk</h3>
          <div className="contrib">
            {resTop.map((resC) => (
              <div key={resC.key} className="contrib-row">
                <span>{resC.label}</span>
                <span className="contrib-track">
                  <span className={resC.impact >= 0 ? 'up' : 'down'} style={{ width: `${(50 * Math.abs(resC.impact)) / resMax}%`, [resC.impact >= 0 ? 'left' : 'right']: '50%' }} />
                </span>
                <span className="num">{resC.impact >= 0 ? '+' : ''}{resC.impact.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}

export default function ResMlModel() {
  const { resData, resReload } = resUseLive('/ml/model', ['queue', 'ml']);
  const [resBusy, resSetBusy] = useState(false);
  const [resMsg, resSetMsg] = useState(null);

  async function resRetrain() {
    resSetBusy(true);
    try {
      const resOut = await resApi('/ml/retrain', { method: 'POST', body: {} });
      resSetMsg({ ok: true, text: `Retrained on a new random sample (seed ${resOut.seed}): test accuracy ${resOut.test.accuracy}%.` });
      resReload();
    } catch (resE) {
      resSetMsg({ ok: false, text: resE.message });
    } finally {
      resSetBusy(false);
    }
  }

  if (!resData) return <ResPage title="ML risk model"><div className="panel muted">Loading…</div></ResPage>;
  const { model: resM, scheduler: resS, queue: resQ } = resData;
  const resMaxW = Math.max(...resM.features.map((resF) => Math.abs(resF.weight)));

  return (
    <ResPage
      title="ML risk model"
      intro="A logistic regression model, written from scratch, predicts the chance that a case becomes critical if it waits. The scheduler uses it in two ways: a risk above the threshold lifts a case one priority level, and inside the same level the queue is ordered by 0.6 x risk + 0.4 x nearness to the depot."
      actions={<button className="btn" disabled={resBusy} onClick={resRetrain}>Retrain model</button>}
    >
      <ResNote msg={resMsg} />
      <div className="tiles">
        <div className="tile"><span className="tile-num">{resM.test.accuracy}%</span><span>test accuracy</span></div>
        <div className="tile"><span className="tile-num">{resM.baseline.accuracy}%</span><span>priority-only rule</span></div>
        <div className="tile"><span className="tile-num">{resM.test.auc}%</span><span>AUC</span></div>
        <div className="tile"><span className="tile-num">{resM.samples}</span><span>training incidents</span></div>
      </div>

      <div className="split ml-split">
        <section className="panel">
          <h2>How it decides</h2>
          <ol className="steps small">
            <li><strong>Emergency first.</strong> Effective priority = P − aging − ML boost. ML boost is 1 when risk ≥ {resS.promoteAt} (never above P1).</li>
            <li><strong>Same level?</strong> score = {resS.riskWeight} × risk + {resS.distanceWeight} × nearness, where nearness = 1 − distance / 7.07 km. Higher score first.</li>
            <li><strong>Still tied?</strong> older first, then case before request, then smaller id.</li>
          </ol>
          <p className="muted small">So a far P1 is always served before a near P3 (location never beats emergency), but two P2 cases are ordered by how risky and how close they are.</p>
          <h3>Learned weights</h3>
          <div className="weights">
            {resM.features.map((resF) => (
              <div key={resF.key} className="weight-row">
                <span>{resF.label}</span>
                <span className="bars-track"><span className="bars-fill" style={{ width: `${(100 * Math.abs(resF.weight)) / resMaxW}%` }} /></span>
                <span className="num">{resF.weight.toFixed(2)}</span>
              </div>
            ))}
            <p className="muted small">Bias {resM.bias}. Bigger weight = pushes the risk up more.</p>
          </div>
        </section>
        <section className="panel">
          <h2>Is it better than the plain rule?</h2>
          <p className="muted small">
            Trained on {resM.trainRows} simulated incidents, tested on {resM.testRows} it never saw (80/20 split, seed {resM.seed}).
            The baseline says &quot;critical&quot; only for P1.
          </p>
          <ResMetricTable model={resM} />
          <div className="confusions">
            <ResConfusion c={resM.test.confusion} title="ML model" />
            <ResConfusion c={resM.baseline.confusion} title="Priority only" />
          </div>
          <h3>Training loss</h3>
          <ResLossCurve points={resM.lossCurve} />
          <p className="muted small">{resM.algorithm}. Trained in {resM.trainMs} ms.</p>
        </section>
      </div>

      <div className="split ml-split">
        <ResWhatIf />
        <section className="panel">
          <h2>Queue as the scheduler sees it <span className="count">{resQ.length}</span></h2>
          {!resQ.length ? <p className="muted">Queue is empty.</p> : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>#</th><th>Process</th><th>Given</th><th>Served as</th><th className="r">Risk</th><th className="r">Km</th><th className="r">Score</th></tr>
                </thead>
                <tbody>
                  {resQ.map((resR) => (
                    <tr key={`${resR.kind}${resR.id}`}>
                      <td className="num">{resR.rank}</td>
                      <td><strong>{resR.process_id}</strong><div className="muted small">{resR.title}</div><div className="muted small">{resR.zone}, {resR.people_affected} people, {resR.case_type}</div></td>
                      <td><ResPriority value={resR.priority} /></td>
                      <td>
                        <ResPriority value={resR.effective} />
                        {resR.mlBoost > 0 && <div className="ml-up small">ML ↑</div>}
                        {resR.agingBoost > 0 && <div className="aged">aged</div>}
                      </td>
                      <td className="r num">{resPct(resR.risk)}</td>
                      <td className="r num">{resR.distance === null ? '-' : Number(resR.distance).toFixed(1)}</td>
                      <td className="r num">{resR.score.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </ResPage>
  );
}

