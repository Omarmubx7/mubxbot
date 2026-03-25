const { Client } = require('pg');

async function clearAllTables() {
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
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);

    if (tablesRes.rows.length === 0) {
      console.log("No tables found in public schema.");
      return;
    }

    const tableNames = tablesRes.rows.map(row => `"${row.table_name}"`).join(', ');
    
    console.log(`Truncating tables: ${tableNames}`);
    
    // We use CASCADE so that if there are foreign keys, it clears dependent data (though not strictly needed if we're clearing everything)
    await client.query(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE`);
    
    console.log('✅ Successfully emptied all tables!');
  } catch (err) {
    console.error('Error emptying tables:', err);
  } finally {
    await client.end();
  }
}

clearAllTables();
