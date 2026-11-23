import { resUseLive } from '../resApi.jsx';
import { ResPage, ResQueueCards, ResCaseForm, ResAllocatorControls } from '../components/ResShared.jsx';

export default function ResNgoRequests({ user: resUser }) {
  const { resData: resRows, resReload } = resUseLive('/queue', ['queue']);
  const resOrg = resUser.organisation;
  return (
    <ResPage title="My requests" intro="Ask for supplies for your shelter. Each number counts down as stock is allocated; at zero the request is fulfilled.">
      {resOrg && resOrg.status !== 'verified' && (
        <p className="banner error">
          {resOrg.org_name} is {resOrg.status}. The city controller has to verify it before you can raise requests.
        </p>
      )}
      <ResAllocatorControls isAdmin={false} />
      <div className="split">
        <ResCaseForm user={resUser} onCreated={resReload} />
        <section>
          <h2 className="section-title">Open requests <span className="count">{resRows?.length ?? ''}</span></h2>
          <ResQueueCards rows={resRows} showOwner={false} />
        </section>
      </div>
    </ResPage>
  );
}
