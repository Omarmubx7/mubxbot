import 'dotenv/config';
import pg from 'pg';
import { isLikelyJunkName } from '../lib/nameFilters.js';

const { Client } = pg;
const DATABASE_URL = process.env.STORAGE_DATABASE_URL || process.env.DATABASE_URL || '';

if (!DATABASE_URL) {
  console.error('No DATABASE_URL / STORAGE_DATABASE_URL found. Nothing to do.');
  process.exit(1);
}

const client = new Client({ connectionString: DATABASE_URL, ssl: (process.env.PGSSL_MODE === 'disable' ? false : { rejectUnauthorized: true, ...(process.env.SSL_ROOT_CERT ? { ca: process.env.SSL_ROOT_CERT } : {}) }) });
await client.connect();

try {
  const names = await client.query(
    `SELECT DISTINCT missing_name FROM user_feedback
     WHERE category = 'missing_name' AND missing_name IS NOT NULL`
  );

  const junk = names.rows
    .map(r => String(r.missing_name).trim())
    .filter(Boolean)
    .filter(isLikelyJunkName)
    .sort((a, b) => a.localeCompare(b));

  console.log(`Candidate missing_names: ${names.rows.length}`);
  console.log(`Junk (to delete): ${junk.length}`);

  if (junk.length === 0) {
    console.log('Nothing to delete.');
    process.exit(0);
  }

  let totalDeleted = 0;
  for (const name of junk) {
    const result = await client.query(
      `DELETE FROM user_feedback WHERE category = 'missing_name' AND missing_name = $1`,
      [name]
    );
    totalDeleted += result.rowCount;
    console.log(`- "${name}": ${result.rowCount} row(s) deleted`);
  }

  console.log(`TOTAL deleted: ${totalDeleted}`);
} finally {
  await client.end();
}
