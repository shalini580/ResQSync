import { resUseLive } from '../resApi.jsx';
import { ResPage, ResQueueCards, ResCaseForm, ResAllocatorControls } from '../components/ResShared.jsx';
import ResReadyQueue from '../components/ResReadyQueue.jsx';
import ResExecutionOrder from '../components/ResExecutionOrder.jsx';

export default function ResEmergencyQueue({ user: resUser }) {
  const { resData: resRows, resReload } = resUseLive('/queue', ['queue']);
  return (
    <ResPage
      title="Emergency queue"
      intro="Emergency cases and NGO requests are processes. They are served by priority: P1 Critical first, then P2, P3, P4. Each number counts down as stock is given; at zero the case is fulfilled and leaves this list."
    >
      <ResAllocatorControls isAdmin />
      <ResReadyQueue />
      <div className="split">
        <ResCaseForm user={resUser} onCreated={resReload} />
        <section>
          <h2 className="section-title">
            Open cases and requests <span className="count">{resRows?.length ?? ''}</span>
          </h2>
          <ResQueueCards rows={resRows} />
        </section>
      </div>
      <ResExecutionOrder />
    </ResPage>
  );
}
