import { useEffect, useMemo, useRef, useState } from 'react';
import { resApi, resUseLive, RES_ZONES, RES_PRIORITY } from '../resApi.jsx';
import { ResPage, ResNote, ResPriority } from '../components/ResShared.jsx';

// one colour per scheduler (checked for colour-blind separation)
const RES_POLICY_COLOR = { fcfs: '#6b5bb5', priority: '#1a9a8a', resqsync: '#e2540c' };
const RES_POLICY_SHORT = { fcfs: 'FCFS', priority: 'Priority + aging', resqsync: 'ResQSync' };
const RES_SCENARIOS = [['earthquake', 'Earthquake'], ['flood', 'Flood'], ['fire', 'Industrial fire']];
const RES_PCOLOR = { 1: 'var(--p1)', 2: 'var(--p2)', 3: 'var(--p3)', 4: 'var(--p4)' };
const RES_DEPOT = { 'Zone A': [5, 5], 'Zone B': [15, 5], 'Zone C': [5, 15], 'Zone D': [15, 15] };
const RES_PX = 20; // px per km on the drill map

const resMin = (resV) => `${Math.round(resV)} min`;

/** state of one incident at clock t under one scheduler */
function resStateAt(resInc, resServed, resT) {
  if (resT < resInc.arrival) return 'hidden';
  if (!resServed || resT < resServed.start) return 'waiting';
  if (resT < resServed.reach) return 'driving';
  if (resT < resServed.end) return 'onsite';
  return resServed.onTime ? 'done' : 'late';
}

function ResDrillMap({ drill: resD, run: resRun, t: resT, layout: resLayout }) {
  const resServedBy = useMemo(() => new Map(resRun.served.map((resS) => [resS.id, resS])), [resRun]);
  const resStates = resD.incidents.map((resI) => ({ resI, resS: resServedBy.get(resI.id), resState: resStateAt(resI, resServedBy.get(resI.id), resT) }));
  const resWaiting = resStates.filter((resX) => resX.resState === 'waiting');
  const resP1Wait = resWaiting.filter((resX) => resX.resI.priority === 1);
  const resDone = resStates.filter((resX) => resX.resState === 'done').length;
  const resLate = resStates.filter((resX) => resX.resState === 'late').length;
  const resBusy = resStates.filter((resX) => resX.resState === 'driving' || resX.resState === 'onsite').length;
  const resRiver = resLayout?.river?.map(([resX, resY]) => `${resX * RES_PX},${resY * RES_PX}`).join(' ');
  const resEx = resD.epicentre.x * RES_PX;
  const resEy = resD.epicentre.y * RES_PX;

  return (
    <figure className="drill-map">
      <figcaption>
        <span className="policy-key" style={{ background: RES_POLICY_COLOR[resRun.policy] }} aria-hidden="true" />
        <strong>{RES_POLICY_SHORT[resRun.policy]}</strong>
      </figcaption>
      <svg viewBox="0 0 400 400" role="img" aria-label={`${RES_POLICY_SHORT[resRun.policy]} at minute ${Math.round(resT)}: ${resWaiting.length} waiting, ${resDone} reached in time`}>
        <rect width="400" height="400" className="dm-ground" />
        <path d="M200 0V400M0 200H400" className="dm-zone" />
        {RES_ZONES.map((resZ) => <text key={resZ} x={RES_DEPOT[resZ][0] * RES_PX - 95} y={RES_DEPOT[resZ][1] * RES_PX - 82} className="dm-zlabel">{resZ}</text>)}
        {resRiver && <polyline points={resRiver} className="dm-river" />}
        <circle cx={resEx} cy={resEy} r="70" className="dm-quake" />
        <circle cx={resEx} cy={resEy} r="34" className="dm-quake" />
        {Object.entries(RES_DEPOT).map(([resZ, [resX, resY]]) => (
          <rect key={resZ} x={resX * RES_PX - 6} y={resY * RES_PX - 6} width="12" height="12" rx="2" className="dm-depot" />
        ))}
        {resStates.map(({ resI, resState }) => {
          if (resState !== 'driving') return null;
          const [resDx, resDy] = RES_DEPOT[resI.zone];
          return <line key={`l${resI.id}`} x1={resDx * RES_PX} y1={resDy * RES_PX} x2={resI.x * RES_PX} y2={resI.y * RES_PX} className="dm-drive" style={{ stroke: RES_POLICY_COLOR[resRun.policy] }} />;
        })}
        {resStates.map(({ resI, resS, resState }) => {
          if (resState === 'hidden') return null;
          const resCx = resI.x * RES_PX;
          const resCy = resI.y * RES_PX;
          const resTip = `${resI.pid} ${RES_PRIORITY[resI.priority]}, ${resI.people} people, ${resI.type}` +
            (resS ? `. Help arrived after ${resMin(resS.response)} (target ${resD.sla[resI.priority]} min)` : '');
          if (resState === 'waiting') {
            const resWait = resT - resI.arrival;
            const resOver = resWait > resD.sla[resI.priority];
            return (
              <g key={resI.id}>
                <circle cx={resCx} cy={resCy} r={5 + Math.min(9, resWait / 8)} className={`dm-wait${resOver ? ' is-over' : ''}`} style={{ stroke: RES_PCOLOR[resI.priority] }} />
                <circle cx={resCx} cy={resCy} r="3" style={{ fill: RES_PCOLOR[resI.priority] }}><title>{resTip}</title></circle>
              </g>
            );
          }
          if (resState === 'driving' || resState === 'onsite') {
            return <circle key={resI.id} cx={resCx} cy={resCy} r="6" className="dm-help" style={{ fill: RES_PCOLOR[resI.priority] }}><title>{resTip}</title></circle>;
          }
          return <circle key={resI.id} cx={resCx} cy={resCy} r="4" className={resState === 'done' ? 'dm-done' : 'dm-late'}><title>{resTip}</title></circle>;
        })}
      </svg>
      <dl className="dm-stats">
        <div><dt>Waiting</dt><dd className="num">{resWaiting.length}</dd></div>
        <div className={resP1Wait.length ? 'is-alarm' : ''}><dt>P1 waiting</dt><dd className="num">{resP1Wait.length}</dd></div>
        <div><dt>Teams out</dt><dd className="num">{resBusy}/{resD.teams}</dd></div>
        <div><dt>Reached in time</dt><dd className="num">{resDone}</dd></div>
        <div><dt>Late</dt><dd className="num">{resLate}</dd></div>
      </dl>
    </figure>
  );
}

function ResP1Bars({ drill: resD }) {
  const resMax = Math.max(resD.sla[1] * 1.2, ...resD.runs.map((resR) => resR.metrics.p1AvgResponse)) * 1.1;
  const resW = 520;
  const resX = (resV) => 150 + (resV / resMax) * (resW - 200);
  return (
    <svg viewBox={`0 0 ${resW} 150`} className="p1-bars" role="img" aria-label="Average time until help reached P1 incidents, per scheduler">
      {resD.runs.map((resR, resI) => (
        <g key={resR.policy} transform={`translate(0 ${18 + resI * 40})`}>
          <text x="140" y="15" textAnchor="end" className="pb-label">{RES_POLICY_SHORT[resR.policy]}</text>
          <rect x="150" y="2" height="20" rx="4" width={Math.max(3, resX(resR.metrics.p1AvgResponse) - 150)} style={{ fill: RES_POLICY_COLOR[resR.policy] }}>
            <title>{`${RES_POLICY_SHORT[resR.policy]}: P1 help after ${resR.metrics.p1AvgResponse} min on average (worst ${resR.metrics.p1Worst} min)`}</title>
          </rect>
          <text x={resX(resR.metrics.p1AvgResponse) + 8} y="17" className="pb-value">{resMin(resR.metrics.p1AvgResponse)}</text>
        </g>
      ))}
      <line x1={resX(resD.sla[1])} x2={resX(resD.sla[1])} y1="8" y2="138" className="pb-sla" />
      <text x={resX(resD.sla[1]) + 4} y="146" className="pb-sla-label">P1 target {resD.sla[1]} min</text>
    </svg>
  );
}

function ResGantt({ drill: resD, run: resRun, t: resT }) {
  const resEnd = Math.max(...resD.runs.map((resR) => resR.metrics.finishedAt), 1);
  const resW = 900;
  const resRowH = 26;
  const resX = (resV) => 60 + (resV / resEnd) * (resW - 70);
  const resById = new Map(resD.incidents.map((resI) => [resI.id, resI]));
  const resTicks = [];
  for (let resM = 0; resM <= resEnd; resM += resEnd > 150 ? 30 : 15) resTicks.push(resM);
  return (
    <div className="table-wrap">
      <svg viewBox={`0 0 ${resW} ${resD.teams * resRowH + 30}`} className="gantt-svg" role="img" aria-label={`Which team served which incident, ${RES_POLICY_SHORT[resRun.policy]}`}>
        {resTicks.map((resM) => (
          <g key={resM}>
            <line x1={resX(resM)} x2={resX(resM)} y1="0" y2={resD.teams * resRowH} className="g-grid" />
            <text x={resX(resM)} y={resD.teams * resRowH + 16} className="g-tick" textAnchor="middle">{resM}</text>
          </g>
        ))}
        {Array.from({ length: resD.teams }, (_, resI) => (
          <text key={resI} x="0" y={resI * resRowH + 17} className="g-team">Team {resI + 1}</text>
        ))}
        {resRun.served.map((resS) => {
          const resI = resById.get(resS.id);
          const resBw = resX(resS.end) - resX(resS.start) - 2;
          return (
            <g key={resS.id}>
              <rect x={resX(resS.start) + 1} y={(resS.team - 1) * resRowH + 3} width={Math.max(2, resBw)} height={resRowH - 6} rx="3"
                style={{ fill: RES_PCOLOR[resI.priority], opacity: resT >= resS.start ? 1 : 0.3 }}>
                <title>{`${resI.pid} (${RES_PRIORITY[resI.priority]}): waited ${resMin(resS.wait)}, team busy ${resS.start}–${resS.end} min`}</title>
              </rect>
              {resBw > 34 && <text x={resX(resS.start) + 5} y={(resS.team - 1) * resRowH + 17} className="g-pid">{resI.pid}</text>}
            </g>
          );
        })}
        <line x1={resX(resT)} x2={resX(resT)} y1="0" y2={resD.teams * resRowH} className="g-now" />
      </svg>
    </div>
  );
}

function ResLiveDrill({ form: resForm }) {
  const [resMsg, resSetMsg] = useState(null);
  const [resBusy, resSetBusy] = useState(false);
  async function resGo() {
    resSetBusy(true);
    try {
      const resOut = await resApi('/drill/live', { method: 'POST', body: { scenario: resForm.scenario, zone: resForm.zone, count: 8 } });
      resSetMsg({ ok: true, text: `${resOut.created.length} drill cases (${resOut.created.map((resC) => resC.process_id).join(', ')}) were reported and released to the worker threads. Open Sync monitor or Emergency queue to watch them.` });
    } catch (resErr) {
      resSetMsg({ ok: false, text: resErr.message });
    } finally {
      resSetBusy(false);
    }
  }
  return (
    <section className="panel live-drill">
      <div>
        <h2>Run it on the real system</h2>
        <p className="muted small">
          The replay above is a simulation. This button turns 8 incidents of the same disaster into real cases in the database.
          The real allocator then serves them with its semaphores, zone locks, ACID transactions and the Banker&apos;s check on vehicles.
        </p>
      </div>
      <div className="live-drill-act">
        <button className="btn" disabled={resBusy} onClick={resGo}>Report 8 real drill cases</button>
        <ResNote msg={resMsg} />
      </div>
    </section>
  );
}

export default function ResDrill() {
  const [resForm, resSetForm] = useState({ scenario: 'earthquake', zone: 'Zone C', count: 30, teams: 4, seed: 7 });
  const [resD, resSetD] = useState(null);
  const [resErr, resSetErr] = useState(null);
  const [resT, resSetT] = useState(0);
  const [resPlaying, resSetPlaying] = useState(false);
  const [resSpeed, resSetSpeed] = useState(2);
  const [resGanttPolicy, resSetGanttPolicy] = useState('resqsync');
  const { resData: resLayout } = resUseLive('/city/layout', ['roads']);
  const resFrame = useRef(null);
  const resEnd = resD ? Math.max(...resD.runs.map((resR) => resR.metrics.finishedAt)) : 0;

  async function resRun(resPatch = {}) {
    const resBody = { ...resForm, ...resPatch };
    resSetForm(resBody);
    try {
      const resOut = await resApi('/drill/run', { method: 'POST', body: resBody });
      resSetD(resOut);
      resSetErr(null);
      resSetT(0);
      resSetPlaying(true);
    } catch (resE) {
      resSetErr({ ok: false, text: resE.message });
    }
  }

  // the replay clock: resSpeed simulated minutes per real second x 4
  useEffect(() => {
    if (!resPlaying || !resD) return undefined;
    let resLast = performance.now();
    const resTick = (resNow) => {
      const resDt = (resNow - resLast) / 1000;
      resLast = resNow;
      resSetT((resOld) => {
        const resNext = resOld + resDt * resSpeed * 4;
        if (resNext >= resEnd) {
          resSetPlaying(false);
          return resEnd;
        }
        return resNext;
      });
      resFrame.current = requestAnimationFrame(resTick);
    };
    resFrame.current = requestAnimationFrame(resTick);
    return () => cancelAnimationFrame(resFrame.current);
  }, [resPlaying, resD, resSpeed, resEnd]);

  const resSet = (resK) => (resE) => resSetForm({ ...resForm, [resK]: resE.target.value });
  const resFcfs = resD?.runs.find((resR) => resR.policy === 'fcfs');
  const resOurs = resD?.runs.find((resR) => resR.policy === 'resqsync');
  const resBest = (resKey, resLow) => {
    const resVals = resD.runs.map((resR) => resR.metrics[resKey]);
    return resLow ? Math.min(...resVals) : Math.max(...resVals);
  };

  const resRows = resD && [
    ['P1: average time until help arrives', 'p1AvgResponse', true, (resV) => resMin(resV)],
    ['P1: worst wait for help', 'p1Worst', true, (resV) => resMin(resV)],
    ['Incidents reached within target', 'onTime', false, (resV) => `${resV} of ${resD.incidents.length}`],
    ['People reached within target', 'peoplePct', false, (resV) => `${resV}%`],
    ['All incidents: average time until help', 'avgResponse', true, (resV) => resMin(resV)],
    ['Last team back at base', 'finishedAt', true, (resV) => `minute ${Math.round(resV)}`],
  ];

  return (
    <ResPage
      title="Disaster drill"
      intro="One disaster, replayed three times. The incidents, the rescue teams and the roads are identical; only the rule that picks the next incident changes. Rescue teams are the CPUs, incidents are the processes."
    >
      <section className="panel drill-controls">
        <div className="seg" role="radiogroup" aria-label="Disaster">
          {RES_SCENARIOS.map(([resK, resL]) => (
            <button key={resK} role="radio" aria-checked={resForm.scenario === resK} className={resForm.scenario === resK ? 'on' : ''}
              onClick={() => resSetForm({ ...resForm, scenario: resK })}>{resL}</button>
          ))}
        </div>
        <label>Where it hits
          <select value={resForm.zone} onChange={resSet('zone')}>{RES_ZONES.map((resZ) => <option key={resZ}>{resZ}</option>)}</select>
        </label>
        <label>Incidents in the first hour
          <input type="number" min="10" max="80" value={resForm.count} onChange={resSet('count')} />
        </label>
        <label>Rescue teams
          <input type="number" min="1" max="10" value={resForm.teams} onChange={resSet('teams')} />
        </label>
        <div className="drill-go">
          <button className="btn signal" onClick={() => resRun()}>Start drill</button>
          <button className="btn" onClick={() => resRun({ seed: Math.floor(Math.random() * 100000) })} title="Same settings, different random disaster">New random disaster</button>
        </div>
      </section>
      <ResNote msg={resErr} />

      {!resD ? (
        <section className="panel drill-empty">
          <p>Pick a disaster and press <strong>Start drill</strong>. Thirty incidents arrive in the first hour; four teams can only be in one place at a time.</p>
        </section>
      ) : (
        <>
          <p className="drill-headline">
            {resD.headline.p1Faster > 0
              ? <>With ResQSync, help reached the critical (P1) incidents <strong>{resMin(resD.headline.p1Faster)} sooner</strong> on average than first come, first served.</>
              : <>In this disaster first come, first served was as fast for P1 incidents as ResQSync.</>}
            {' '}{resD.headline.moreOnTime > 0 ? `${resD.headline.moreOnTime} more incidents were reached within their target time.` : ''}
          </p>

          <section className="panel replay">
            <div className="replay-bar">
              <button className="btn primary" onClick={() => { if (resT >= resEnd) resSetT(0); resSetPlaying(!resPlaying); }}>
                {resPlaying ? 'Pause' : resT >= resEnd ? 'Replay' : 'Play'}
              </button>
              <input type="range" min="0" max={resEnd} step="0.5" value={resT} aria-label="Drill clock"
                onChange={(resE) => { resSetPlaying(false); resSetT(Number(resE.target.value)); }} />
              <span className="clock num">minute {Math.floor(resT)}</span>
              <div className="seg small-seg" role="radiogroup" aria-label="Replay speed">
                {[1, 2, 4].map((resS) => (
                  <button key={resS} role="radio" aria-checked={resSpeed === resS} className={resSpeed === resS ? 'on' : ''} onClick={() => resSetSpeed(resS)}>{resS}x</button>
                ))}
              </div>
            </div>
            <div className="drill-maps">
              <ResDrillMap drill={resD} run={resFcfs} t={resT} layout={resLayout} />
              <ResDrillMap drill={resD} run={resOurs} t={resT} layout={resLayout} />
            </div>
            <p className="muted small dm-legend">
              Ring: still waiting (it grows with the wait and turns dashed once past its target). Filled dot: a team is on the way or on site. Green: reached in time. Grey with a red edge: reached late. Squares are depots; the big circles mark the {resD.scenario.toLowerCase()} epicentre.
            </p>
          </section>

          <div className="split even drill-results">
            <section className="panel">
              <h2>Scoreboard</h2>
              <div className="table-wrap">
                <table className="table score">
                  <thead>
                    <tr><th /><th className="r">{RES_POLICY_SHORT.fcfs}</th><th className="r">{RES_POLICY_SHORT.priority}</th><th className="r">{RES_POLICY_SHORT.resqsync}</th></tr>
                  </thead>
                  <tbody>
                    {resRows.map(([resLabel, resKey, resLow, resFmt]) => {
                      const resB = resBest(resKey, resLow);
                      return (
                        <tr key={resKey}>
                          <td>{resLabel}</td>
                          {resD.runs.map((resR) => (
                            <td key={resR.policy} className={`r num${resR.metrics[resKey] === resB ? ' best' : ''}`}>
                              {resFmt(resR.metrics[resKey])}{resR.metrics[resKey] === resB ? <span className="best-mark"> best</span> : ''}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="muted small">Targets: P1 {resD.sla[1]} min, P2 {resD.sla[2]}, P3 {resD.sla[3]}, P4 {resD.sla[4]} until help arrives. Simulated in {resD.simulatedIn} ms (discrete-event simulation, seed {resD.seed}).</p>
            </section>
            <section className="panel">
              <h2>Critical incidents: time until help arrives</h2>
              <ResP1Bars drill={resD} />
              <table className="table compact">
                <thead><tr><th>Priority</th>{resD.runs.map((resR) => <th key={resR.policy} className="r">{RES_POLICY_SHORT[resR.policy]}</th>)}</tr></thead>
                <tbody>
                  {[1, 2, 3, 4].map((resP) => (
                    <tr key={resP}>
                      <td><ResPriority value={resP} /> <span className="muted small">{resD.runs[0].metrics.byPriority[resP - 1].count}</span></td>
                      {resD.runs.map((resR) => <td key={resR.policy} className="r num">{resMin(resR.metrics.byPriority[resP - 1].avgResponse)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>

          <section className="panel">
            <div className="report-head">
              <h2>Who did what: teams as CPUs</h2>
              <div className="seg small-seg" role="radiogroup" aria-label="Scheduler">
                {resD.runs.map((resR) => (
                  <button key={resR.policy} role="radio" aria-checked={resGanttPolicy === resR.policy} className={resGanttPolicy === resR.policy ? 'on' : ''}
                    onClick={() => resSetGanttPolicy(resR.policy)}>{RES_POLICY_SHORT[resR.policy]}</button>
                ))}
              </div>
            </div>
            <p className="muted small">A Gantt chart, like CPU scheduling: each bar is one incident (drive there, work, drive back), coloured by priority. Minutes on the axis.</p>
            <ResGantt drill={resD} run={resD.runs.find((resR) => resR.policy === resGanttPolicy)} t={resT} />
          </section>
        </>
      )}

      <ResLiveDrill form={resForm} />
    </ResPage>
  );
}
