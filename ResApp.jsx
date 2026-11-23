import { useEffect, useState } from 'react';
import { resApi, resSetToken, resGetToken, ResLiveProvider, resUseConnected } from './resApi.jsx';
import ResLogin from './components/ResLogin.jsx';
import ResNotifications from './components/ResNotifications.jsx';
import ResOverview from './views/ResOverview.jsx';
import ResEmergencyQueue from './views/ResEmergencyQueue.jsx';
import ResCityMap from './views/ResCityMap.jsx';
import ResStockView from './views/ResStockView.jsx';
import ResMissions from './views/ResMissions.jsx';
import ResOrganisations from './views/ResOrganisations.jsx';
import ResAnalytics from './views/ResAnalytics.jsx';
import ResOsLab from './views/ResOsLab.jsx';
import ResDbmsLab from './views/ResDbmsLab.jsx';
import ResSyncMonitor from './views/ResSyncMonitor.jsx';
import ResAuditLog from './views/ResAuditLog.jsx';
import ResNgoRequests from './views/ResNgoRequests.jsx';
import ResHistory from './views/ResHistory.jsx';
import ResSurplus from './views/ResSurplus.jsx';
import ResRewards from './views/ResRewards.jsx';
import ResMlModel from './views/ResMlModel.jsx';
import ResProfile from './views/ResProfile.jsx';
import ResReports from './views/ResReports.jsx';
import ResDrill from './views/ResDrill.jsx';

// menu for each role: [key, label] or a group heading string; new = added in the final phase
const RES_NAV = {
  admin: [
    'Operations',
    ['overview', 'Overview'],
    ['queue', 'Emergency queue'],
    ['map', 'City map & routes'],
    ['stock', 'Stock & forecast'],
    ['missions', 'Rescue missions'],
    ['surplus', 'Surplus food'],
    ['orgs', 'Organisations'],
    'Show and prove',
    ['drill', 'Disaster drill', true],
    ['ml', 'ML risk model'],
    ['oslab', 'OS lab'],
    ['dbms', 'DBMS lab'],
    ['sync', 'Sync monitor'],
    'Records',
    ['analytics', 'Analytics'],
    ['reports', 'Reports & backups'],
    ['audit', 'Audit log'],
    ['profile', 'My profile'],
  ],
  ngo: [
    ['requests', 'My requests'],
    ['deliveries', 'Deliveries'],
    ['surplus', 'Surplus food'],
    ['history', 'Received'],
    ['profile', 'My profile'],
  ],
  restaurant: [['surplus', 'Surplus food'], ['profile', 'My profile']],
  volunteer: [
    ['missions', 'Missions'],
    ['rewards', 'Rewards'],
    ['profile', 'My profile'],
  ],
};

const RES_ROLE_NAME = { admin: 'City controller', ngo: 'NGO / shelter', restaurant: 'Restaurant', volunteer: 'Volunteer' };

export default function ResApp() {
  const [resUser, resSetUser] = useState(null);
  const [resChecking, resSetChecking] = useState(Boolean(resGetToken()));

  useEffect(() => {
    if (!resGetToken()) return;
    resApi('/me')
      .then(resSetUser)
      .catch(() => resSetToken(null))
      .finally(() => resSetChecking(false));
  }, []);

  if (resChecking) return <div className="boot">Connecting…</div>;
  if (!resUser) {
    return (
      <ResLogin
        onSignedIn={async (resToken) => {
          resSetToken(resToken);
          resSetUser(await resApi('/me'));
        }}
      />
    );
  }
  return (
    <ResLiveProvider>
      <ResShell
        user={resUser}
        onUserChange={resSetUser}
        onSignOut={() => {
          resSetToken(null);
          resSetUser(null);
        }}
      />
    </ResLiveProvider>
  );
}

function ResShell({ user: resUser, onSignOut: resOnSignOut, onUserChange: resOnUserChange }) {
  const resNav = RES_NAV[resUser.role];
  const resItems = resNav.filter((resN) => Array.isArray(resN));
  const [resView, resSetView] = useState(resItems[0][0]);
  const resConnected = resUseConnected();

  const resViews = {
    overview: <ResOverview go={resSetView} />,
    queue: <ResEmergencyQueue user={resUser} />,
    map: <ResCityMap user={resUser} />,
    stock: <ResStockView />,
    missions: <ResMissions user={resUser} />,
    deliveries: <ResMissions user={resUser} />,
    surplus: <ResSurplus user={resUser} />,
    orgs: <ResOrganisations />,
    analytics: <ResAnalytics />,
    oslab: <ResOsLab />,
    dbms: <ResDbmsLab />,
    sync: <ResSyncMonitor />,
    audit: <ResAuditLog />,
    requests: <ResNgoRequests user={resUser} />,
    history: <ResHistory user={resUser} />,
    rewards: <ResRewards user={resUser} />,
    ml: <ResMlModel />,
    reports: <ResReports />,
    drill: <ResDrill />,
    profile: <ResProfile user={resUser} onUpdated={(resU) => resOnUserChange({ ...resUser, ...resU })} />,
  };
  const resOrg = resUser.organisation;

  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          ResQSync
        </div>
        <nav>
          {resNav.map((resN) => {
            if (!Array.isArray(resN)) return <div key={resN} className="nav-group">{resN}</div>;
            const [resKey, resLabel, resNew] = resN;
            return (
              <button key={resKey} className={`nav-item${resView === resKey ? ' is-active' : ''}${resNew ? ' is-new' : ''}`}
                onClick={() => resSetView(resKey)} aria-current={resView === resKey ? 'page' : undefined}>
                {resLabel}
              </button>
            );
          })}
        </nav>
        <div className="rail-foot">
          <div className="who">
            <strong>{resOrg?.org_name || resUser.name}</strong>
            <span>{RES_ROLE_NAME[resUser.role]}, {resUser.zone}</span>
            {resOrg && resOrg.status !== 'verified' && <span className="org-pending">Organisation {resOrg.status}</span>}
          </div>
          <div className={`live ${resConnected ? 'on' : 'off'}`}>{resConnected ? 'Live updates on' : 'Reconnecting…'}</div>
          <div className="db-chip" title={resUser.database?.note || ''}>
            Database: {resUser.database?.engine === 'mysql' ? 'MySQL' : 'SQLite'}
          </div>
          <button className="link-btn" onClick={resOnSignOut}>Sign out</button>
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <ResNotifications />
        </div>
        {resViews[resView]}
      </main>
    </div>
  );
}
