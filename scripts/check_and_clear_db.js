const { Client } = require('pg');

async function checkAndClear() {
  const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';
  if (!DATABASE_URL) {
    console.error('Missing DATABASE_URL');
    process.exit(1);
  }

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  try {
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    for (const row of tablesRes.rows) {
      const tableName = row.table_name;
      const countRes = await client.query(`SELECT COUNT(*) FROM "${tableName}"`);
      console.log(`Table ${tableName} has ${countRes.rows[0].count} rows.`);
    }

    console.log('\nTruncating office_hours_entries...');
    await client.query('TRUNCATE TABLE office_hours_entries');
    console.log('Done!');
  } finally {
    await client.end();
  }
}

checkAndClear().catch(console.error);
