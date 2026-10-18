import { useState } from 'react';
import { resApi, resUseLive, resQtyText, resTimeAgo } from '../resApi.jsx';
import { ResPage, ResPriority, ResEmpty } from '../components/ResShared.jsx';

const RES_STAGES = ['open', 'assigned', 'pickup', 'in_transit', 'delivered', 'completed'];
const RES_STAGE_NAME = { open: 'Waiting for a volunteer', assigned: 'Assigned', pickup: 'At pickup', in_transit: 'In transit', delivered: 'Delivered', completed: 'Completed' };
const RES_NEXT_BUTTON = { assigned: 'Start pickup', pickup: 'Picked up, on the way', in_transit: 'Mark delivered' };

function ResStageBar({ status: resStatus }) {
  const resAt = RES_STAGES.indexOf(resStatus);
  return (
    <ol className="stagebar" aria-label={`Stage: ${RES_STAGE_NAME[resStatus]}`}>
      {RES_STAGES.slice(1).map((resS, resI) => (
        <li key={resS} className={resI + 1 <= resAt ? 'done' : ''}>{RES_STAGE_NAME[resS]}</li>
      ))}
    </ol>
  );
}

export default function ResMissions({ user: resUser }) {
  const { resData: resMissions } = resUseLive('/missions', ['missions', 'queue']);
  const [resMsg, resSetMsg] = useState(null);
  const resRole = resUser.role;

  async function resAct(resId, resAction) {
    resSetMsg(null);
    try {
      await resApi(`/missions/${resId}/${resAction}`, { method: 'POST' });
      const resText = { claim: `Mission #${resId} is yours.`, advance: `Mission #${resId} moved to the next stage.`, confirm: `Mission #${resId} confirmed. The volunteer got +50 XP.` };
      resSetMsg({ ok: true, text: resText[resAction] });
    } catch (resErr) {
      resSetMsg({ ok: false, text: resErr.message });
    }
  }

  const resMine = (resMissions || []).filter((resM) => resRole === 'volunteer' && resM.volunteer_id === resUser.id && !['delivered', 'completed'].includes(resM.status));
  const resOpen = (resMissions || []).filter((resM) => resM.status === 'open');
  const resList = resRole === 'volunteer' ? resOpen : resMissions || [];

  const resIntro = {
    volunteer: 'Every allocation becomes a rescue mission. Claims go through the stored procedure sp_DispatchRescueMission, which locks the row, so only one volunteer can take each mission.',
    ngo: 'Deliveries of the stock allocated to your requests. Confirm each one when it arrives, so the volunteer gets their reward.',
    admin: 'All rescue missions. Confirm deliveries for emergency cases here.',
  }[resRole];

  return (
    <ResPage title={resRole === 'ngo' ? 'Deliveries' : resRole === 'volunteer' ? 'Missions' : 'Rescue missions'} intro={resIntro}>
      {resMsg && <p className={`banner ${resMsg.ok ? 'ok' : 'error'}`}>{resMsg.text}</p>}

      {resRole === 'volunteer' && (
        <section className="panel">
          <h2>Your current mission</h2>
          {!resMine.length ? <ResEmpty>You're free. Claim a mission from the list below.</ResEmpty> : resMine.map((resM) => (
            <div className="mission is-mine" key={resM.id}>
              <div>
                <strong>#{resM.id} {resM.process_id}</strong> <ResPriority value={resM.priority} />
                <p>{resM.title}</p>
                <p className="load">{resQtyText(resM)}</p>
                <p className="muted small">From the {resM.zone} depot</p>
                <ResStageBar status={resM.status} />
              </div>
              <button className="btn primary" onClick={() => resAct(resM.id, 'advance')}>{RES_NEXT_BUTTON[resM.status]}</button>
            </div>
          ))}
        </section>
      )}

      <section className="panel">
        <h2>{resRole === 'volunteer' ? 'Waiting for a volunteer' : 'Missions'} <span className="count">{resList.length}</span></h2>
        {!resMissions ? <p className="muted">Loading…</p> : !resList.length ? <ResEmpty>No missions here right now.</ResEmpty> : resList.map((resM) => (
          <div className="mission" key={resM.id}>
            <div>
              <div className="mission-top">
                <strong>#{resM.id} {resM.process_id}</strong> <ResPriority value={resM.priority} /> <span className="muted small">{resM.zone}</span>
                <span className={`mstate m-${resM.status}`}>{RES_STAGE_NAME[resM.status]}</span>
              </div>
              <p>{resM.title}</p>
              <p className="load">{resQtyText(resM)}</p>
              <p className="muted small">
                {resM.volunteer_name ? `Volunteer: ${resM.volunteer_name}. ` : ''}Allocated by {resM.worker} in txn #{resM.txn_id}, {resTimeAgo(resM.created_at)}
              </p>
            </div>
            {resRole === 'volunteer' && <button className="btn" disabled={resMine.length > 0} onClick={() => resAct(resM.id, 'claim')}>Claim</button>}
            {resRole !== 'volunteer' && resM.status === 'delivered' && (resRole === 'ngo' || resM.kind === 'case' || resRole === 'admin') && (
              <button className="btn primary" onClick={() => resAct(resM.id, 'confirm')}>Confirm received</button>
            )}
          </div>
        ))}
      </section>
    </ResPage>
  );
}
