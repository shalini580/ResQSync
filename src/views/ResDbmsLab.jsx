// DBMS lab - schema, views, triggers, procedures, transactions and locks, all read live from the database.
import { useEffect, useState } from 'react';
import { resApi, resUseLive, RES_ZONES, RES_TYPES, RES_LABEL } from '../resApi.jsx';
import { ResPage, ResEmpty } from '../components/ResShared.jsx';
import { ResRollbackTest, ResLedger } from './ResStockView.jsx';

const RES_TABS = [
  ['schema', 'Schema'],
  ['views', 'Views'],
  ['triggers', 'Triggers'],
  ['procs', 'Procedures'],
  ['acid', 'Transactions'],
  ['locks', 'Concurrency'],
];

const RES_VIEW_INFO = {
  v_priority_queue: 'Every open case and request in one list (UNION ALL), what the allocator reads.',
  v_zone_stock: 'Stock per zone with percent left, used by the stock board and analytics.',
  v_volunteer_leaderboard: 'Volunteers joined with users, sorted by XP. Race test users are filtered out.',
  v_mission_board: 'Missions joined with the volunteer who claimed them.',
};

const RES_TRIGGER_INFO = {
  trg_resource_underflow: 'Refuses any update that would make stock negative.',
  trg_resource_audit: 'Writes old → new stock into audit_logs, which becomes the ledger.',
  trg_surplus_food_alert: 'Big surplus donation (80+ servings) raises a notification for admins.',
  trg_case_status_audit: 'Logs every status change of an emergency case.',
  trg_case_fulfilled: 'When all five amounts reach zero the case becomes fulfilled.',
  trg_request_fulfilled: 'Same thing for NGO requests.',
  trg_mission_reward: 'Completed mission gives the volunteer +50 XP, +20 coins and maybe a new badge.',
};

// ------------------------------------------------------------------ 1. schema

function ResSchemaTab({ schema: resSchema }) {
  const [resOpen, resSetOpen] = useState('emergency_cases');
  const resTable = resSchema.tables.find((resT) => resT.name === resOpen) || resSchema.tables[0];
  const resFkCols = new Set(resTable.foreignKeys.map((resF) => resF.col));

  return (
    <div className="split">
      <section className="panel">
        <h2>Tables</h2>
        <ul className="table-list">
          {resSchema.tables.map((resT) => (
            <li key={resT.name}>
              <button className={resT.name === resTable.name ? 'active' : ''} onClick={() => resSetOpen(resT.name)}>
                <span>{resT.name}</span>
                <span className="muted small">{resT.rows} rows</span>
              </button>
            </li>
          ))}
        </ul>
        <h3 className="sub">Relationships</h3>
        <ul className="fk-list small">
          {resSchema.tables.flatMap((resT) => resT.foreignKeys.map((resF) => (
            <li key={`${resT.name}.${resF.col}`}><code>{resT.name}.{resF.col}</code> → <code>{resF.refTable}.{resF.refCol}</code></li>
          )))}
        </ul>
      </section>

      <section className="panel">
        <h2>{resTable.name} <span className="muted small">{resTable.rows} rows</span></h2>
        <div className="table-wrap">
          <table className="table small-table">
            <thead><tr><th>Column</th><th>Type</th><th>Null</th><th>Key</th><th>Default</th></tr></thead>
            <tbody>
              {resTable.columns.map((resC) => (
                <tr key={resC.name}>
                  <td><strong>{resC.name}</strong></td>
                  <td><code>{resC.type}</code></td>
                  <td>{resC.nullable === 'YES' ? 'yes' : ''}</td>
                  <td>
                    {resC.keyType === 'PRI' && <span className="key-tag pk">PK</span>}
                    {resC.keyType === 'UNI' && <span className="key-tag uk">UNIQUE</span>}
                    {resFkCols.has(resC.name) && <span className="key-tag fk">FK</span>}
                  </td>
                  <td className="muted">{resC.def ?? ''}{resC.extra ? ` ${resC.extra}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {resTable.indexes.length > 0 && (
          <>
            <h3 className="sub">Indexes</h3>
            <ul className="fk-list small">
              {resTable.indexes.map((resI) => (
                <li key={resI.name}><code>{resI.name}</code> on ({resI.cols}){resI.unique && <span className="key-tag uk">UNIQUE</span>}</li>
              ))}
            </ul>
          </>
        )}
        {resTable.name === 'emergency_cases' || resTable.name === 'resource_requests' ? (
          <p className="muted small">The unique index on <code>open_key</code> is what stops the same open request being entered twice. Once a row is fulfilled its key becomes NULL, so a new one for the same place can be logged later.</p>
        ) : null}
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ 2. views

function ResViewsTab({ views: resViews }) {
  const [resName, resSetName] = useState(resViews[0]);
  const { resData: resRows } = resUseLive(`/dbms/view/${resName}`, ['queue', 'stock', 'missions']);
  const resCols = resRows?.length ? Object.keys(resRows[0]) : [];
  return (
    <section className="panel">
      <nav className="tabs sub-tabs">
        {resViews.map((resV) => <button key={resV} className={resV === resName ? 'active' : ''} onClick={() => resSetName(resV)}>{resV}</button>)}
      </nav>
      <p className="muted">{RES_VIEW_INFO[resName]}</p>
      <p className="muted small"><code>SELECT * FROM {resName} LIMIT 50</code></p>
      {!resRows ? <p className="muted">Loading…</p> : !resRows.length ? <ResEmpty>The view is empty right now.</ResEmpty> : (
        <div className="table-wrap">
          <table className="table small-table">
            <thead><tr>{resCols.map((resC) => <th key={resC}>{resC}</th>)}</tr></thead>
            <tbody>
              {resRows.map((resR, resI) => (
                <tr key={resI}>{resCols.map((resC) => <td key={resC} className="nowrap">{resR[resC] === null ? <span className="muted">null</span> : String(resR[resC])}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ 3. triggers

function ResTriggersTab({ triggers: resTriggers }) {
  const [resForm, resSetForm] = useState({ zone: 'Zone A', type: 'food' });
  const [resOut, resSetOut] = useState(null);
  const [resErr, resSetErr] = useState('');

  async function resTest() {
    resSetErr('');
    try {
      resSetOut(await resApi('/dbms/test-underflow', { method: 'POST', body: resForm }));
    } catch (resE) {
      resSetErr(resE.message);
    }
  }

  return (
    <>
      <section className="panel">
        <h2>Try to break the stock</h2>
        <p className="muted">Runs <code>UPDATE resources SET available = -5</code> directly. The BEFORE UPDATE trigger should refuse it and the value should stay the same.</p>
        <div className="toolbar">
          <select value={resForm.zone} onChange={(resE) => resSetForm({ ...resForm, zone: resE.target.value })}>{RES_ZONES.map((resZ) => <option key={resZ}>{resZ}</option>)}</select>
          <select value={resForm.type} onChange={(resE) => resSetForm({ ...resForm, type: resE.target.value })}>{RES_TYPES.map((resT) => <option key={resT} value={resT}>{RES_LABEL[resT]}</option>)}</select>
          <button className="btn primary" onClick={resTest}>Set it to −5</button>
        </div>
        {resErr && <p className="error">{resErr}</p>}
        {resOut && (
          <p className={`verdict ${resOut.blocked && resOut.before === resOut.after ? 'good' : 'bad'}`}>
            Before {resOut.before}, after {resOut.after}. {resOut.blocked ? <>Database said: <code>{resOut.message}</code></> : 'The update went through!'}
          </p>
        )}
      </section>

      <section className="panel">
        <h2>Triggers in the database ({resTriggers.length})</h2>
        {resTriggers.map((resT) => (
          <details key={resT.name} className="code-card">
            <summary>
              <strong>{resT.name}</strong>
              <span className="muted small"> {resT.timing} {resT.event} on {resT.tableName}</span>
              {RES_TRIGGER_INFO[resT.name] && <span className="small"> · {RES_TRIGGER_INFO[resT.name]}</span>}
            </summary>
            <pre>{resT.body}</pre>
          </details>
        ))}
      </section>
    </>
  );
}

// ------------------------------------------------------------------ 4. procedures

function ResProcsTab({ schema: resSchema }) {
  const { resData: resQueue } = resUseLive('/queue', ['queue']);
  const [resPick, resSetPick] = useState('');
  const [resOut, resSetOut] = useState(null);
  const [resErr, resSetErr] = useState('');
  const resPending = (resQueue || []).filter((resQ) => resQ.status === 'pending' && resQ.stage === 'pending');
  const resIsMysql = resSchema.engine === 'mysql';

  async function resCall() {
    const [resKind, resId] = resPick.split(':');
    resSetErr('');
    try {
      resSetOut(await resApi('/dbms/call-procedure', { method: 'POST', body: { kind: resKind, id: Number(resId) } }));
      resSetPick('');
    } catch (resE) {
      resSetErr(resE.message);
    }
  }

  return (
    <>
      <section className="panel">
        <h2>Call the allocation procedure by hand</h2>
        <p className="muted">
          {resIsMysql
            ? <>Runs <code>CALL sp_AllocateEmergencyResources(…)</code> on one pending case, skipping the allocator queue.</>
            : <>SQLite has no stored procedures, so the server runs the same steps in one JavaScript transaction (<code>resAllocate</code> in <code>server/resDb.js</code>). The logic is line for line the same as the MySQL procedure.</>}
        </p>
        <div className="toolbar">
          <select value={resPick} onChange={(resE) => resSetPick(resE.target.value)}>
            <option value="">Pick a pending case or request…</option>
            {resPending.map((resQ) => <option key={`${resQ.kind}:${resQ.id}`} value={`${resQ.kind}:${resQ.id}`}>{resQ.process_id} · {resQ.zone} · P{resQ.priority} · {resQ.title}</option>)}
          </select>
          <button className="btn primary" disabled={!resPick} onClick={resCall}>Call it</button>
        </div>
        {resQueue && !resPending.length && <p className="muted small">Nothing is pending right now. Log a case first.</p>}
        {resErr && <p className="error">{resErr}</p>}
        {resOut && (
          <div className="bank-result">
            <p className={`verdict ${resOut.status === 'fulfilled' ? 'good' : resOut.status === 'waiting' ? 'warn' : ''}`}>
              {resOut.pid}: txn #{resOut.txnId}, result <strong>{resOut.status}</strong>{resOut.missionId ? `, mission #${resOut.missionId} created` : ''}
            </p>
            {resOut.ledger?.length > 0 && (
              <table className="table small-table">
                <thead><tr><th>Resource</th><th className="r">Before</th><th className="r">Given</th><th className="r">After</th></tr></thead>
                <tbody>
                  {resOut.ledger.map((resL) => (
                    <tr key={resL.type}><td>{RES_LABEL[resL.type] || resL.type}</td><td className="r num">{resL.before}</td><td className="r num">− {Math.abs(resL.change)}</td><td className="r num">{resL.after}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Stored procedures</h2>
        {!resSchema.procedures.length ? (
          <p className="muted">None in SQLite. Start the app with MySQL to see <code>sp_AllocateEmergencyResources</code> and <code>sp_DispatchRescueMission</code> here. Their source is in <code>database/schema.mysql.sql</code>.</p>
        ) : resSchema.procedures.map((resP) => (
          <details key={resP.name} className="code-card">
            <summary><strong>{resP.name}</strong></summary>
            <pre>{resP.body}</pre>
          </details>
        ))}
      </section>
    </>
  );
}

// ------------------------------------------------------------------ 6. concurrency

function ResLocksTab({ engine: resEngine }) {
  const [resClients, resSetClients] = useState(6);
  const [resOut, resSetOut] = useState(null);
  const [resErr, resSetErr] = useState('');
  const [resBusy, resSetBusy] = useState(false);

  async function resRace() {
    resSetBusy(true);
    resSetErr('');
    try {
      resSetOut(await resApi('/dbms/race/claim', { method: 'POST', body: { clients: resClients } }));
    } catch (resE) {
      resSetErr(resE.message);
    } finally {
      resSetBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2>Many volunteers claim the same mission at once</h2>
      <p className="muted">
        A test mission is created and N clients try to claim it in parallel through {resEngine === 'mysql' ? <code>sp_DispatchRescueMission</code> : 'the dispatch transaction'}.
        {resEngine === 'mysql'
          ? <> The procedure reads the mission with <code>SELECT … FOR UPDATE</code>, so the first one locks the row and the rest wait, then see it's taken.</>
          : <> SQLite locks the whole database for a write (<code>BEGIN IMMEDIATE</code>), so the claims run one after another.</>}
        {' '}Exactly one should win. The test mission is deleted afterwards.
      </p>
      <div className="toolbar">
        <label className="inline-label">Clients
          <input type="number" className="num-in" min="2" max="10" value={resClients} onChange={(resE) => resSetClients(Number(resE.target.value))} />
        </label>
        <button className="btn primary" disabled={resBusy} onClick={resRace}>{resBusy ? 'Racing…' : 'Start the race'}</button>
      </div>
      {resErr && <p className="error">{resErr}</p>}
      {resOut && (
        <>
          <p className={`verdict ${resOut.winners === 1 ? 'good' : 'bad'}`}>
            {resOut.winners === 1 ? 'One winner, no double booking.' : `${resOut.winners} winners: the lock didn't hold!`}
          </p>
          <table className="table small-table">
            <thead><tr><th>Client</th><th>Result</th><th className="r">Finished after</th></tr></thead>
            <tbody>
              {resOut.results.map((resR) => (
                <tr key={resR.client} className={resR.result === 'OK' ? 'best-row' : ''}>
                  <td>{resR.client}</td>
                  <td><code>{resR.result}</code></td>
                  <td className="r num">{resR.ms} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted small">OK = got the mission, TAKEN = someone else locked it first.</p>
        </>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ page

export default function ResDbmsLab() {
  const [resTab, resSetTab] = useState('schema');
  const [resSchema, resSetSchema] = useState(null);
  const [resErr, resSetErr] = useState('');

  useEffect(() => {
    resApi('/dbms/schema').then(resSetSchema).catch((resE) => resSetErr(resE.message));
  }, []);

  return (
    <ResPage
      title="DBMS lab"
      intro="The database side of the project: tables, keys, views, triggers, procedures, transactions and locking, read straight from the running database."
      actions={resSchema && <span className="db-chip">{resSchema.engine === 'mysql' ? 'MySQL' : 'SQLite'}</span>}
    >
      {resSchema?.note && <div className="panel note-panel small">{resSchema.note}</div>}
      <nav className="tabs">
        {RES_TABS.map(([resKey, resLabel]) => (
          <button key={resKey} className={resTab === resKey ? 'active' : ''} onClick={() => resSetTab(resKey)}>{resLabel}</button>
        ))}
      </nav>
      {resErr && <p className="error">{resErr}</p>}
      {!resSchema ? <div className="panel muted">Loading…</div> : (
        <>
          {resTab === 'schema' && <ResSchemaTab schema={resSchema} />}
          {resTab === 'views' && <ResViewsTab views={resSchema.views} />}
          {resTab === 'triggers' && <ResTriggersTab triggers={resSchema.triggers} />}
          {resTab === 'procs' && <ResProcsTab schema={resSchema} />}
          {resTab === 'acid' && (
            <>
              <section className="panel">
                <h2>ACID in this project</h2>
                <ul className="acid-list">
                  <li><strong>Atomicity:</strong> one allocation takes stock, lowers the case's remaining amounts and creates the mission in a single transaction. Any error rolls back all of it. Try the test below.</li>
                  <li><strong>Consistency:</strong> CHECK constraints and the underflow trigger keep stock ≥ 0, and foreign keys keep every request tied to a real NGO.</li>
                  <li><strong>Isolation:</strong> {resSchema.engine === 'mysql' ? 'the stock rows are locked with SELECT … FOR UPDATE, so two workers can never read the same old value.' : 'writes use BEGIN IMMEDIATE, so only one transaction writes at a time.'} The zone mutex in Node adds a second layer on top.</li>
                  <li><strong>Durability:</strong> after COMMIT the change is on disk, so it survives a server restart. The ledger below is that record.</li>
                </ul>
              </section>
              <div className="split">
                <ResRollbackTest />
                <ResLedger />
              </div>
            </>
          )}
          {resTab === 'locks' && <ResLocksTab engine={resSchema.engine} />}
        </>
      )}
    </ResPage>
  );
}
