import { useState } from 'react';
import { resApi, resUseLive, resTimeAgo, RES_ZONES } from '../resApi.jsx';
import { ResPage, ResEmpty, ResNote, ResStockBoard } from '../components/ResShared.jsx';

const RES_FOOD_STATUS = {
  available: 'Available',
  reserved: 'Reserved by an NGO',
  picked_up: 'Picked up',
  delivered: 'Delivered',
  added_to_stock: 'Sent to city depot',
  expired: 'Expired',
};
const RES_FLOW = ['available', 'reserved', 'picked_up', 'delivered'];

function ResFlow({ status: resStatus }) {
  if (!RES_FLOW.includes(resStatus)) return <span className={`fstate f-${resStatus}`}>{RES_FOOD_STATUS[resStatus]}</span>;
  const resAt = RES_FLOW.indexOf(resStatus);
  return (
    <ol className="stagebar small">
      {RES_FLOW.map((resS, resI) => <li key={resS} className={resI <= resAt ? 'done' : ''}>{RES_FOOD_STATUS[resS]}</li>)}
    </ol>
  );
}

function ResPostForm({ user: resUser }) {
  const resBlank = { title: '', food_type: 'Cooked meals', servings: '', zone: resUser.zone, expiry_hours: 4 };
  const [resF, resSetF] = useState(resBlank);
  const [resMsg, resSetMsg] = useState(null);
  const resSet = (resK) => (resE) => resSetF({ ...resF, [resK]: resE.target.value });

  async function resSubmit(resE) {
    resE.preventDefault();
    resSetMsg(null);
    try {
      const resOut = await resApi('/surplus', { method: 'POST', body: resF });
      resSetMsg({ ok: true, text: resOut.alerted ? 'Posted. 80+ servings, so every NGO got an alert (database trigger).' : 'Posted. NGOs can reserve it now.' });
      resSetF(resBlank);
    } catch (resErr) {
      resSetMsg({ ok: false, text: resErr.message });
    }
  }

  return (
    <form className="panel form" onSubmit={resSubmit}>
      <h2>Register surplus food</h2>
      <label>Food
        <input value={resF.title} onChange={resSet('title')} placeholder="e.g. Rice and dal, packed" required />
      </label>
      <div className="row2">
        <label>Type
          <input value={resF.food_type} onChange={resSet('food_type')} />
        </label>
        <label>Servings
          <input type="number" min="1" value={resF.servings} onChange={resSet('servings')} required />
        </label>
      </div>
      <div className="row2">
        <label>Zone
          <select value={resF.zone} onChange={resSet('zone')}>{RES_ZONES.map((resZ) => <option key={resZ}>{resZ}</option>)}</select>
        </label>
        <label>Good for (hours)
          <input type="number" min="1" max="48" value={resF.expiry_hours} onChange={resSet('expiry_hours')} />
        </label>
      </div>
      <ResNote msg={resMsg} />
      <button className="btn primary">Post food</button>
    </form>
  );
}

export default function ResSurplus({ user: resUser }) {
  const { resData: resItems } = resUseLive('/surplus', ['surplus']);
  const [resMsg, resSetMsg] = useState(null);
  const resRole = resUser.role;

  async function resAct(resId, resAction, resDone) {
    resSetMsg(null);
    try {
      await resApi(`/surplus/${resId}/${resAction}`, { method: 'POST' });
      resSetMsg({ ok: true, text: resDone });
    } catch (resErr) {
      resSetMsg({ ok: false, text: resErr.message });
    }
  }

  const resActions = (resS) => {
    if (resRole === 'ngo' && resS.status === 'available') return <button className="btn" onClick={() => resAct(resS.id, 'reserve', 'Reserved. The restaurant has been told.')}>Reserve</button>;
    if (resRole === 'ngo' && resS.status === 'picked_up' && resS.claimed_by === resUser.id) return <button className="btn primary" onClick={() => resAct(resS.id, 'delivered', 'Marked as delivered. Thank you!')}>Confirm received</button>;
    if (resRole === 'restaurant' && resS.status === 'reserved') return <button className="btn primary" onClick={() => resAct(resS.id, 'picked-up', 'Marked as picked up.')}>Mark picked up</button>;
    if (resRole === 'admin' && resS.status === 'available') return <button className="btn" onClick={() => resAct(resS.id, 'to-stock', 'Added to the zone food stock. Waiting cases there were woken.')}>Send to city depot</button>;
    return null;
  };

  const resActive = (resItems || []).filter((resS) => ['available', 'reserved', 'picked_up'].includes(resS.status));
  const resPast = (resItems || []).filter((resS) => !['available', 'reserved', 'picked_up'].includes(resS.status));

  const resIntro = {
    restaurant: 'Post food you have left over. NGOs reserve it, you hand it over, they confirm. Expired food is archived automatically.',
    ngo: 'Surplus food from restaurants. Reserve what your shelter can use, then confirm when it arrives.',
    admin: 'All surplus food in the city. Unclaimed food can be sent to the zone depot, which adds it to the food stock (one transaction).',
  }[resRole];

  return (
    <ResPage title="Surplus food" intro={resIntro}>
      {resMsg && <p className={`banner ${resMsg.ok ? 'ok' : 'error'}`}>{resMsg.text}</p>}
      <div className={resRole === 'restaurant' ? 'split' : ''}>
        {resRole === 'restaurant' && <ResPostForm user={resUser} />}
        <section className="panel">
          <h2>{resRole === 'restaurant' ? 'Pickup tracking' : 'Available and in progress'} <span className="count">{resActive.length}</span></h2>
          {!resItems ? <p className="muted">Loading…</p> : !resActive.length ? <ResEmpty>Nothing right now.</ResEmpty> : resActive.map((resS) => (
            <div className="mission" key={resS.id}>
              <div>
                <div className="mission-top">
                  <strong>{resS.title}</strong> <span className="num">{resS.servings} servings</span> <span className="muted small">{resS.zone}</span>
                </div>
                <p className="muted small">
                  {resS.restaurant_name}, {resS.food_type}. Best before {resTimeAgo(resS.expiry_time)}.
                  {resS.claimed_by_name ? ` Reserved by ${resS.claimed_by_name}.` : ''}
                </p>
                <ResFlow status={resS.status} />
              </div>
              {resActions(resS)}
            </div>
          ))}
        </section>
      </div>
      {resRole === 'admin' && (
        <section>
          <h2 className="section-title">Food stock by zone</h2>
          <ResStockBoard only="food" />
        </section>
      )}
      <section className="panel">
        <h2>{resRole === 'restaurant' ? 'Donation history' : 'Finished'}</h2>
        {!resPast.length ? <ResEmpty>No finished donations yet.</ResEmpty> : (
          <ul className="plain">
            {resPast.map((resS) => (
              <li key={resS.id}>
                <span>{resS.title} <span className="muted small">({resS.restaurant_name})</span></span>
                <span className="num">{resS.servings} servings</span>
                <span className="muted small">{resS.zone}, {RES_FOOD_STATUS[resS.status]}{resS.claimed_by_name ? `, ${resS.claimed_by_name}` : ''}, {resTimeAgo(resS.updated_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </ResPage>
  );
}
