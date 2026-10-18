import { useState } from 'react';
import { resApi, resUseLive, resTimeAgo } from '../resApi.jsx';
import { ResPage, ResEmpty } from '../components/ResShared.jsx';

export default function ResOrganisations() {
  const { resData: resOrgs } = resUseLive('/organisations', ['organisations']);
  const [resMsg, resSetMsg] = useState('');

  async function resSetStatus(resOrg, resStatus) {
    try {
      await resApi(`/organisations/${resOrg.id}/status`, { method: 'POST', body: { status: resStatus } });
      resSetMsg(`${resOrg.org_name} is now ${resStatus}.`);
    } catch (resErr) {
      resSetMsg(resErr.message);
    }
  }

  return (
    <ResPage title="Organisations" intro="NGOs, shelters and restaurants sign up as pending. Only verified organisations can raise requests or post surplus food.">
      {resMsg && <p className="banner ok">{resMsg}</p>}
      <section className="panel">
        {!resOrgs ? <p className="muted">Loading…</p> : !resOrgs.length ? <ResEmpty>No organisations yet.</ResEmpty> : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Organisation</th><th>Type</th><th>Zone</th><th>Contact</th><th className="r">Capacity</th><th>Status</th><th /></tr>
              </thead>
              <tbody>
                {resOrgs.map((resO) => (
                  <tr key={resO.id}>
                    <td><strong>{resO.org_name}</strong><div className="muted small">{resO.address}</div></td>
                    <td>{resO.org_type}</td>
                    <td>{resO.zone}</td>
                    <td>{resO.contact}<div className="muted small">{resO.email}</div></td>
                    <td className="r num">{resO.capacity}</td>
                    <td><span className={`org-status o-${resO.status}`}>{resO.status}</span><div className="muted small">{resTimeAgo(resO.created_at)}</div></td>
                    <td className="r nowrap">
                      {resO.status !== 'verified' && <button className="btn small-btn primary" onClick={() => resSetStatus(resO, 'verified')}>Verify</button>}{' '}
                      {resO.status === 'pending' && <button className="btn small-btn" onClick={() => resSetStatus(resO, 'rejected')}>Reject</button>}
                    </td>
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
