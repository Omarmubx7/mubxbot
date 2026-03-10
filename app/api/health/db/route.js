import { NextResponse } from 'next/server';
import pg from 'pg';

const { Client } = pg;
const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';

export async function GET() {
  if (!DATABASE_URL) {
    return NextResponse.json(
      {
        ok: false,
        source: 'none',
        error: 'DATABASE_URL/STORAGE_DATABASE_URL is not configured.'
      },
      { status: 500 }
    );
  }

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const ping = await client.query('SELECT 1 AS ok');
    const count = await client.query('SELECT COUNT(*)::int AS count FROM office_hours_entries');

    return NextResponse.json({
      ok: ping.rows[0]?.ok === 1,
      source: 'postgres',
      table: 'office_hours_entries',
      rowCount: count.rows[0]?.count || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        source: 'postgres',
        error: error.message || 'Database health check failed.'
      },
      { status: 500 }
    );
  } finally {
    await client.end().catch(() => {});
  }
}
