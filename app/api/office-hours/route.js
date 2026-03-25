import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import fs from 'fs/promises';
import path from 'path';
import pg from 'pg';

const DATA_PATH = path.join(process.cwd(), 'data', 'office_hours.json');
const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';
const { Client } = pg;

export async function GET() {
  try {
    if (DATABASE_URL) {
      const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });

      await client.connect();
      try {
        const { rows } = await client.query(
          `
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
          `
        );
        return NextResponse.json(rows, { status: 200 });
      } finally {
        await client.end();
      }
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
