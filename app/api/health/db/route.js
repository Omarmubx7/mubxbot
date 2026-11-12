import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';

let sql = null;

function getSql() {
  if (!sql && DATABASE_URL) {
    sql = neon(DATABASE_URL);
  }
  return sql;
}

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

  const sqlInstance = getSql();
  if (!sqlInstance) {
    return NextResponse.json(
      {
        ok: false,
        source: 'none',
        error: 'Neon client not initialized.'
      },
      { status: 500 }
    );
  }

  try {
    const ping = await sqlInstance`SELECT 1 AS ok`;
    const count = await sqlInstance`SELECT COUNT(*)::int AS count FROM office_hours_entries`;

    return NextResponse.json({
      ok: ping[0]?.ok === 1,
      source: 'postgres',
      table: 'office_hours_entries',
      rowCount: count[0]?.count || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.warn('Database health check failed', error?.message || error);
    return NextResponse.json(
      {
        ok: false,
        source: 'postgres',
        error: 'Database health check failed.'
      },
      { status: 500 }
    );
  }
}
