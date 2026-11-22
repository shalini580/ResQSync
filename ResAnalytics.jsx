import { resUseLive, RES_LABEL, RES_PRIORITY } from '../resApi.jsx';
import { ResPage, ResBars } from '../components/ResShared.jsx';

const RES_MISSION_NAME = { open: 'Waiting for volunteer', assigned: 'Assigned', pickup: 'At pickup', in_transit: 'In transit', delivered: 'Delivered', completed: 'Completed' };

export default function ResAnalytics() {
  const { resData: resA } = resUseLive('/analytics', ['queue', 'stock', 'missions', 'surplus']);
  if (!resA) return <ResPage title="Analytics"><div className="panel muted">Loading…</div></ResPage>;

  return (
    <ResPage title="Analytics" intro="How the relief effort is going. Everything here is calculated from the database each time something changes.">
      <div className="tiles">
        <div className="tile"><span className="tile-num">{resA.health.score}</span><span>City Health Score, {resA.health.label.toLowerCase()}</span></div>
        <div className="tile"><span className="tile-num">{resA.totals.fulfilled}</span><span>Cases and requests fulfilled</span></div>
        <div className="tile"><span className="tile-num">{resA.totals.missionsCompleted}</span><span>Missions completed</span></div>
        <div className="tile"><span className="tile-num">{resA.totals.surplusRescued}</span><span>Surplus servings rescued</span></div>
      </div>

      <div className="grid2">
        <section className="panel">
          <h2>Open vs fulfilled, by priority</h2>
          <ResBars items={resA.byPriority.flatMap((resP) => [
            { label: `${RES_PRIORITY[resP.priority]} open`, value: resP.open, tone: `t-p${resP.priority}` },
            { label: `${RES_PRIORITY[resP.priority]} done`, value: resP.fulfilled, tone: 't-ok' },
          ])} />
        </section>
        <section className="panel">
          <h2>Average wait before first allocation</h2>
          <p className="muted small">Minutes from logging a case to the first worker serving it. Lower is better, and P1 should be lowest.</p>
          <ResBars unit=" min" items={resA.waitByPriority.map((resW) => ({ label: `${RES_PRIORITY[resW.priority]} (${resW.count})`, value: resW.minutes, tone: `t-p${resW.priority}` }))} />
        </section>
      </div>

      <div className="grid2">
        <section className="panel">
          <h2>Stock left by zone</h2>
          <ResBars max={100} unit="%" items={resA.zones.map((resZ) => ({ label: resZ.zone, value: resZ.percent, tone: resZ.percent < 25 ? 't-p1' : '' }))} />
          <div className="table-wrap">
            <table className="table small-table">
              <thead><tr><th>Zone</th>{resA.zones[0].items.map((resI) => <th key={resI.type} className="r">{RES_LABEL[resI.type]}</th>)}</tr></thead>
              <tbody>
                {resA.zones.map((resZ) => (
                  <tr key={resZ.zone}><td>{resZ.zone}</td>{resZ.items.map((resI) => <td key={resI.type} className="r num">{resI.available}<span className="muted"> / {resI.available + resI.allocated}</span></td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <h2>Rescue missions by stage</h2>
          <ResBars items={resA.missionStatus.map((resM) => ({ label: RES_MISSION_NAME[resM.status], value: resM.count, tone: resM.status === 'completed' ? 't-ok' : '' }))} />
          <h3 className="sub">City Health Score</h3>
          <ResBars max={100} items={resA.health.parts.map((resP) => ({ label: `${resP.name} (${resP.weight}%)`, value: resP.value }))} />
        </section>
      </div>
    </ResPage>
  );
}
