import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import fs from 'fs/promises';
import path from 'path';
import { neon } from '@neondatabase/serverless';

const DATA_PATH = path.join(process.cwd(), 'data', 'office_hours.json');
const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';

let sql = null;

function getSql() {
  if (!sql && DATABASE_URL) {
    sql = neon(DATABASE_URL);
  }
  return sql;
}

export async function GET() {
  try {
    if (DATABASE_URL) {
      const sqlInstance = getSql();
      if (!sqlInstance) {
        const raw = await fs.readFile(DATA_PATH, 'utf8');
        const parsed = JSON.parse(raw || '[]');
        return NextResponse.json(Array.isArray(parsed) ? parsed : [], { status: 200 });
      }
      const rows = await sqlInstance`
        SELECT
          faculty,
          department,
          email,
          office,
          day,
          start,
          "end",
          type
        FROM office_hours_entries
      `;
      return NextResponse.json(rows, { status: 200 });
    } else {
      const raw = await fs.readFile(DATA_PATH, 'utf8');
      const parsed = JSON.parse(raw || '[]');
      return NextResponse.json(Array.isArray(parsed) ? parsed : [], { status: 200 });
    }
  } catch (err) {
    console.error("Office Hours API Error:", err);
    return NextResponse.json({ error: 'Failed to read office hours data' }, { status: 500 });
  }
}
