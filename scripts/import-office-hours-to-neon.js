const fs = require('node:fs/promises');
const path = require('node:path');
const { Client } = require('pg');

const DATA_PATH = path.join(process.cwd(), 'data', 'office_hours.json');
const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';

async function main() {
  if (!DATABASE_URL) {
    throw new Error('Missing DATABASE_URL (or STORAGE_DATABASE_URL).');
  }

  const raw = await fs.readFile(DATA_PATH, 'utf8');
  const rows = JSON.parse(raw || '[]');

  if (!Array.isArray(rows)) {
    throw new Error('data/office_hours.json must be an array.');
  }

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  try {
    await client.query('BEGIN');

    await client.query('TRUNCATE TABLE office_hours_entries');

    const insertSql = `
      INSERT INTO office_hours_entries (
        faculty,
        department,
        email,
        office,
        day,
        start,
        "end",
        type
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `;

    for (const row of rows) {
      await client.query(insertSql, [
        String(row.faculty || ''),
        String(row.department || ''),
        String(row.email || ''),
        String(row.office || ''),
        String(row.day || ''),
        String(row.start || ''),
        String(row.end || ''),
        String(row.type || 'In-Person')
      ]);
    }

    await client.query('COMMIT');

    const countResult = await client.query('SELECT COUNT(*)::int AS count FROM office_hours_entries');
    const count = countResult.rows[0]?.count || 0;

    console.log(`Seed complete. Inserted ${count} rows into office_hours_entries.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
