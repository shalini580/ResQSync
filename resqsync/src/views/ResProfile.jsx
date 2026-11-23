import { useState } from 'react';
import { resApi, resSetToken, resTimeAgo, RES_ZONES } from '../resApi.jsx';
import { ResPage, ResNote, ResEmpty } from '../components/ResShared.jsx';
import { resUseGiven, ResStars } from '../components/ResRate.jsx';

export default function ResProfile({ user: resUser, onUpdated: resOnUpdated }) {
  const resOrg = resUser.organisation;
  const resVol = resUser.volunteer;
  const [resF, resSetF] = useState({
    name: resUser.name || '',
    phone: resUser.phone || '',
    zone: resUser.zone,
    org_name: resOrg?.org_name || '',
    org_type: resOrg?.org_type || 'NGO',
    address: resOrg?.address || '',
    capacity: resOrg?.capacity || '',
    skills: resVol?.skills || '',
    availability: resVol?.availability || 'available',
  });
  const [resMsg, resSetMsg] = useState(null);
  const [resPw, resSetPw] = useState({ current: '', next: '', again: '' });
  const [resPwMsg, resSetPwMsg] = useState(null);
  const resMine = resUseGiven();
  const resSet = (resK) => (resE) => resSetF({ ...resF, [resK]: resE.target.value });

  async function resSave(resE) {
    resE.preventDefault();
    resSetMsg(null);
    try {
      const resBody = { name: resF.name, phone: resF.phone, zone: resF.zone };
      if (resOrg) resBody.organisation = { org_name: resF.org_name, org_type: resF.org_type, address: resF.address, capacity: resF.capacity };
      if (resUser.role === 'volunteer') {
        resBody.volunteer = { skills: resF.skills };
        if (resF.availability !== resVol?.availability) resBody.volunteer.availability = resF.availability;
      }
      const resOut = await resApi('/me', { method: 'PATCH', body: resBody });
      resSetToken(resOut.token); // name and zone live inside the login token, so it is renewed
      resOnUpdated(resOut.user);
      resSetMsg({ ok: true, text: 'Profile saved.' });
    } catch (resErr) {
      resSetMsg({ ok: false, text: resErr.message });
    }
  }

  async function resChangePw(resE) {
    resE.preventDefault();
    if (resPw.next !== resPw.again) return resSetPwMsg({ ok: false, text: 'The two new passwords are different.' });
    try {
      await resApi('/me/password', { method: 'POST', body: { current: resPw.current, next: resPw.next } });
      resSetPw({ current: '', next: '', again: '' });
      resSetPwMsg({ ok: true, text: 'Password changed. Use the new one next time you sign in.' });
    } catch (resErr) {
      resSetPwMsg({ ok: false, text: resErr.message });
    }
    return undefined;
  }

  return (
    <ResPage title="My profile" intro={`Signed in as ${resUser.email}. Changes are saved in the users table${resOrg ? ' and the organisations table' : ''}${resVol ? ' and the volunteers table' : ''}.`}>
      <div className="split">
        <div>
          <form className="panel form" onSubmit={resSave}>
            <h2>Details</h2>
            <label>Name<input value={resF.name} onChange={resSet('name')} required maxLength={100} /></label>
            <div className="row2">
              <label>Phone<input value={resF.phone} onChange={resSet('phone')} maxLength={20} placeholder="+91…" /></label>
              <label>Zone<select value={resF.zone} onChange={resSet('zone')}>{RES_ZONES.map((resZ) => <option key={resZ}>{resZ}</option>)}</select></label>
            </div>
            {resOrg && (
              <>
                <h3>Organisation <span className={`org-status o-${resOrg.status}`}>{resOrg.status}</span></h3>
                <label>Organisation name<input value={resF.org_name} onChange={resSet('org_name')} required maxLength={120} /></label>
                {resUser.role === 'ngo' && (
                  <label>Type<select value={resF.org_type} onChange={resSet('org_type')}>{['NGO', 'Emergency Shelter', 'Community Kitchen'].map((resT) => <option key={resT}>{resT}</option>)}</select></label>
                )}
                <div className="row2">
                  <label>Address<input value={resF.address} onChange={resSet('address')} maxLength={200} /></label>
                  <label>Capacity<input type="number" min="1" value={resF.capacity} onChange={resSet('capacity')} /></label>
                </div>
              </>
            )}
            {resUser.role === 'volunteer' && (
              <>
                <h3>Volunteer</h3>
                <label>Skills<input value={resF.skills} onChange={resSet('skills')} maxLength={200} placeholder="First aid, driving, boat" /></label>
                <label>Availability
                  <select value={resF.availability} onChange={resSet('availability')}>
                    <option value="available">Available for missions</option>
                    <option value="offline">Offline</option>
                    {resVol?.availability === 'busy' && <option value="busy" disabled>Busy (on a mission)</option>}
                  </select>
                </label>
              </>
            )}
            <ResNote msg={resMsg} />
            <button className="btn primary">Save profile</button>
          </form>

          <form className="panel form" onSubmit={resChangePw}>
            <h2>Change password</h2>
            <label>Current password<input type="password" value={resPw.current} onChange={(resE) => resSetPw({ ...resPw, current: resE.target.value })} required autoComplete="current-password" /></label>
            <div className="row2">
              <label>New password<input type="password" minLength={6} value={resPw.next} onChange={(resE) => resSetPw({ ...resPw, next: resE.target.value })} required autoComplete="new-password" /></label>
              <label>New again<input type="password" minLength={6} value={resPw.again} onChange={(resE) => resSetPw({ ...resPw, again: resE.target.value })} required autoComplete="new-password" /></label>
            </div>
            <p className="muted small">Stored as a bcrypt hash, never as plain text.</p>
            <ResNote msg={resPwMsg} />
            <button className="btn">Change password</button>
          </form>
        </div>

        <section className="panel">
          <h2>Ratings you received</h2>
          {!resMine ? <p className="muted">Loading…</p> : (
            <>
              <p className="rating-big"><ResStars value={resMine.average} count={resMine.count} /></p>
              {!resMine.received.length ? <ResEmpty>No ratings yet. They appear after a finished delivery.</ResEmpty> : (
                <ul className="plain feedback-list">
                  {resMine.received.map((resR) => (
                    <li key={resR.id}>
                      <span><span className="stars-read">{'★'.repeat(resR.rating)}</span> <strong>{resR.from_name}</strong></span>
                      <span className="muted small">{resR.context === 'mission' ? 'Delivery' : 'Surplus food'} #{resR.context_id}, {resTimeAgo(resR.created_at)}</span>
                      {resR.comment && <span className="small">&ldquo;{resR.comment}&rdquo;</span>}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </div>
    </ResPage>
  );
}
