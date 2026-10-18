import { useState } from 'react';
import { resApi, RES_ZONES } from '../resApi.jsx';

const RES_DEMO = [
  ['City controller', 'admin@gmail.com', 'admin123'],
  ['NGO / shelter', 'shantingo@gmail.com', 'password123'],
  ['Restaurant', 'marcus@gmail.com', 'password123'],
  ['Volunteer', 'alex@gmail.com', 'password123'],
];

export default function ResLogin({ onSignedIn: resOnSignedIn }) {
  const [resMode, resSetMode] = useState('login');
  const [resF, resSetF] = useState({
    name: '', email: '', password: '', role: 'ngo', zone: 'Zone A', org_name: '', org_type: 'NGO', address: '', skills: '',
  });
  const [resError, resSetError] = useState('');
  const [resBusy, resSetBusy] = useState(false);
  const resSet = (resK) => (resE) => resSetF({ ...resF, [resK]: resE.target.value });

  async function resSubmit(resE, resQuick) {
    resE?.preventDefault();
    resSetBusy(true);
    resSetError('');
    try {
      const resLogin = resQuick || resMode === 'login';
      const resBody = resQuick || (resLogin ? { email: resF.email, password: resF.password } : resF);
      const { token: resToken, user: resUser } = await resApi(resLogin ? '/auth/login' : '/auth/register', { method: 'POST', body: resBody });
      resOnSignedIn(resToken, resUser);
    } catch (resErr) {
      resSetError(resErr.message);
    } finally {
      resSetBusy(false);
    }
  }

  return (
    <div className="login">
      <section className="login-intro">
        <h1>ResQSync</h1>
        <p>
          Emergency relief for a simulated city. Cases are scheduled like processes, every zone's stock is guarded by a lock,
          and each allocation is one database transaction.
        </p>
        <div className="demo">
          <h2>Try a demo account</h2>
          {RES_DEMO.map(([resRole, resEmail, resPassword]) => (
            <button key={resEmail} className="demo-row" disabled={resBusy} onClick={() => resSubmit(null, { email: resEmail, password: resPassword })}>
              <span>{resRole}</span>
              <span className="muted">{resEmail}</span>
            </button>
          ))}
        </div>
      </section>

      <form className="login-card" onSubmit={resSubmit}>
        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={resMode === 'login'} onClick={() => resSetMode('login')}>Sign in</button>
          <button type="button" role="tab" aria-selected={resMode === 'register'} onClick={() => resSetMode('register')}>Create account</button>
        </div>

        {resMode === 'register' && (
          <>
            <div className="row2">
              <label>
                I am a
                <select value={resF.role} onChange={resSet('role')}>
                  <option value="ngo">NGO / shelter</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="volunteer">Volunteer</option>
                </select>
              </label>
              <label>
                Zone
                <select value={resF.zone} onChange={resSet('zone')}>
                  {RES_ZONES.map((resZ) => <option key={resZ}>{resZ}</option>)}
                </select>
              </label>
            </div>
            <label>
              Your name
              <input value={resF.name} onChange={resSet('name')} required />
            </label>
            {resF.role !== 'volunteer' ? (
              <>
                <label>
                  Organisation name
                  <input value={resF.org_name} onChange={resSet('org_name')} required />
                </label>
                {resF.role === 'ngo' && (
                  <label>
                    Type
                    <select value={resF.org_type} onChange={resSet('org_type')}>
                      <option>NGO</option>
                      <option>Emergency Shelter</option>
                      <option>Community Kitchen</option>
                    </select>
                  </label>
                )}
                <label>
                  Address
                  <input value={resF.address} onChange={resSet('address')} />
                </label>
              </>
            ) : (
              <label>
                Skills
                <input value={resF.skills} onChange={resSet('skills')} placeholder="First aid, driving…" />
              </label>
            )}
          </>
        )}
        <label>
          Email
          <input type="email" value={resF.email} onChange={resSet('email')} required autoComplete="email" />
        </label>
        <label>
          Password
          <input type="password" value={resF.password} onChange={resSet('password')} required minLength={resMode === 'register' ? 6 : undefined}
            autoComplete={resMode === 'login' ? 'current-password' : 'new-password'} />
        </label>
        {resMode === 'register' && resF.role !== 'volunteer' && (
          <p className="muted small">New organisations start as "pending" until the city controller verifies them.</p>
        )}
        {resError && <p className="error">{resError}</p>}
        <button className="btn primary" disabled={resBusy}>{resMode === 'login' ? 'Sign in' : 'Create account'}</button>
      </form>
    </div>
  );
}
