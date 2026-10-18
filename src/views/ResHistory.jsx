import { resUseLive, resTimeAgo } from '../resApi.jsx';
import { ResPage, ResPriority, ResEmpty } from '../components/ResShared.jsx';

export default function ResHistory() {
  const { resData: resRows } = resUseLive('/history', ['queue']);
  return (
    <ResPage title="Received" intro="Requests that were fully allocated, with everything you received and how many rounds it took.">
      <section className="panel">
        {!resRows ? <p className="muted">Loading…</p> : !resRows.length ? <ResEmpty>Nothing fulfilled yet.</ResEmpty> : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Request</th><th>Priority</th><th>Zone</th><th className="r">Food</th><th className="r">Water</th><th className="r">Medicine</th><th className="r">Cots</th><th className="r">Vehicles</th><th className="r">Rounds</th><th>Fulfilled</th></tr>
              </thead>
              <tbody>
                {resRows.map((resR) => (
                  <tr key={`${resR.kind}${resR.id}`}>
                    <td><strong>{resR.process_id}</strong> {resR.title}</td>
                    <td><ResPriority value={resR.priority} /></td>
                    <td>{resR.zone}</td>
                    {['food', 'water', 'medicine', 'cots', 'vehicles'].map((resK) => <td key={resK} className="r num">{resR[resK]}</td>)}
                    <td className="r num">{resR.rounds}</td>
                    <td>{resTimeAgo(resR.fulfilled_at)}</td>
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
