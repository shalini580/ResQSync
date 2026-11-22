import { resUseLive } from '../resApi.jsx';
import { ResPage, ResStockBoard, ResQueueCards } from '../components/ResShared.jsx';

function ResHealth({ health: resHealth }) {
  const resTone = resHealth.score >= 80 ? 'good' : resHealth.score >= 60 ? 'warn' : 'bad';
  return (
    <section className={`panel health health-${resTone}`}>
      <div className="health-score">
        <span className="health-num">{resHealth.score}</span>
        <span className="health-label">
          City Health Score
          <strong>{resHealth.label}</strong>
        </span>
      </div>
      <ul className="health-parts">
        {resHealth.parts.map((resP) => (
          <li key={resP.name}>
            <span>{resP.name} <em className="muted">({resP.weight}%)</em></span>
            <span className="bar"><span style={{ width: `${resP.value}%` }} /></span>
            <span className="num">{resP.value}{resP.note ? <em className="muted small"> {resP.note}</em> : null}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ResOverview({ go: resGo }) {
  const { resData: resStats } = resUseLive('/analytics', ['queue', 'stock', 'missions', 'surplus']);
  const { resData: resRows } = resUseLive('/queue', ['queue']);
  const { resData: resSync } = resUseLive('/sync', ['sync']);

  const resTiles = [
    ['Open cases and requests', resStats?.totals.open, 'queue'],
    ['Fulfilled', resStats?.totals.fulfilled, 'queue'],
    ['Missions waiting for a volunteer', resStats?.totals.missionsOpen, 'missions'],
    ['Surplus servings rescued', resStats?.totals.surplusRescued, 'surplus'],
  ];

  return (
    <ResPage title="City overview" intro="How the city is doing right now, the stock in every zone, and what is being served next.">
      {resStats && <ResHealth health={resStats.health} />}

      <div className="tiles">
        {resTiles.map(([resLabel, resN, resTarget]) => (
          <button key={resLabel} className="tile" onClick={() => resGo(resTarget)}>
            <span className="tile-num">{resN ?? '–'}</span>
            <span>{resLabel}</span>
          </button>
        ))}
      </div>

      {resSync && (
        <button className="workers-strip" onClick={() => resGo('sync')}>
          {resSync.workers.map((resW) => (
            <span key={resW.name} className={`chip w-${resW.state}`}>
              {resW.name}: {resW.state === 'running' ? `serving ${resW.current?.pid}` : resW.state === 'locking' ? `waiting for ${resW.current?.zone}` : 'idle'}
            </span>
          ))}
          <span className="chip">Ready queue {resSync.readyQueue.length}/{resSync.config.bufferSize}</span>
        </button>
      )}

      <section>
        <h2 className="section-title">Stock by zone</h2>
        <ResStockBoard />
      </section>
      <section>
        <h2 className="section-title">Next in line</h2>
        <ResQueueCards rows={resRows ? resRows.slice(0, 5) : null} />
      </section>
    </ResPage>
  );
}
