// Print the ResQSync tables in the terminal - works with MySQL or the SQLite file.
//   npm run db             -> every table and view (last 15 rows)
//   npm run db audit_logs  -> one table, all rows
import { resInitDatabase, resQuery, resIsMysql, resDbState } from '../server/resDb.js';

const resOnly = process.argv[2];

try {
  await resInitDatabase();
} catch (resErr) {
  console.log('Could not open the database:', resErr.message);
  process.exit(1);
}

const resNames = resIsMysql()
  ? (await resQuery('SELECT TABLE_NAME AS name, TABLE_TYPE AS kind FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_TYPE, TABLE_NAME'))
  : (await resQuery("SELECT name, type AS kind FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY type, name"));

for (const { name: resName } of resNames) {
  if (resName === 'txn_context' || (resOnly && resName !== resOnly)) continue;
  const [{ n: resCount }] = await resQuery(`SELECT COUNT(*) AS n FROM ${resName}`);
  let resRows = await resQuery(`SELECT * FROM ${resName}${resOnly ? '' : ' LIMIT 15'}`);
  if (resName === 'users') resRows = resRows.map((resR) => ({ ...resR, password_hash: String(resR.password_hash).slice(0, 12) + '…' }));
  console.log(`\n=== ${resName} (${resCount} rows)`);
  if (resRows.length) console.table(resRows);
}
console.log(`\n(${resDbState.resEngine === 'mysql' ? 'MySQL' : 'SQLite'})`);
process.exit(0);
