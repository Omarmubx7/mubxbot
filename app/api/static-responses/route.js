import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';
const FILE_PATH = path.join(process.cwd(), 'data', 'static_responses.json');

let sql = null;

function getSql() {
  if (!sql && DATABASE_URL) {
    sql = neon(DATABASE_URL);
  }
  return sql;
}

async function readFileRows() {
  const raw = await fs.readFile(FILE_PATH, 'utf8').catch(() => '[]');
  const parsed = JSON.parse(raw || '[]');
  return Array.isArray(parsed) ? parsed : [];
}

export async function GET() {
  try {
    if (DATABASE_URL) {
      const sqlInstance = getSql();
      if (!sqlInstance) {
        const rows = await readFileRows();
        return NextResponse.json(rows.filter((row) => row.is_active !== false));
      }
      const rows = await sqlInstance`
        SELECT id, trigger, response, audience, is_active
        FROM bot_static_responses
        WHERE is_active = true
        ORDER BY id DESC
      `;
      return NextResponse.json(rows);
    }

    const rows = await readFileRows();
    return NextResponse.json(rows.filter((row) => row.is_active !== false));
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load public static responses', details: error.message },
      { status: 500 }
    );
  }
}
