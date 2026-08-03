import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import fs from 'fs/promises';
import path from 'path';
import pg from 'pg';
import { aggregateOfficeHours } from '../../../lib/officeHours';
import { isNewDataName } from '../../../lib/updateList';
import { loadNewDataNames } from '../../../lib/newDataStore';

const DATA_PATH = path.join(process.cwd(), 'data', 'office_hours.json');
const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';
const { Client } = pg;

async function readRowsFromDatabase() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: (process.env.PGSSL_MODE === 'disable' ? false : { rejectUnauthorized: true, ...(process.env.SSL_ROOT_CERT ? { ca: process.env.SSL_ROOT_CERT } : {}) })
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
        ORDER BY
          faculty,
          CASE LOWER(TRIM(day))
            WHEN 'sunday'    THEN 0
            WHEN 'monday'    THEN 1
            WHEN 'tuesday'   THEN 2
            WHEN 'wednesday' THEN 3
            WHEN 'thursday'  THEN 4
            WHEN 'friday'    THEN 5
            WHEN 'saturday'  THEN 6
            ELSE 7
          END,
          start
      `
    );
    return rows;
  } finally {
    await client.end();
  }
}

async function readRowsFromFile() {
  const raw = await fs.readFile(DATA_PATH, 'utf8');
  const parsed = JSON.parse(raw || '[]');
  return Array.isArray(parsed) ? parsed : [];
}

export async function GET() {
  try {
    const rows = DATABASE_URL
      ? await readRowsFromDatabase()
      : await readRowsFromFile();

    const normalized = aggregateOfficeHours(rows);
    const newDataNames = await loadNewDataNames();
    const annotated = normalized.map(d => ({ ...d, isNew: isNewDataName(d.name, newDataNames) }));
    return NextResponse.json(annotated, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to read doctors data' }, { status: 500 });
  }
}
