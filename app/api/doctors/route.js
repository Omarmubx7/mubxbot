import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import fs from 'fs/promises';
import path from 'path';
import pg from 'pg';

const DATA_PATH = path.join(process.cwd(), 'data', 'office_hours.json');
const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';
const { Client } = pg;

const DAY_ORDER = {
  saturday: 0,
  sunday: 1,
  monday: 2,
  tuesday: 3,
  wednesday: 4,
  thursday: 5,
  friday: 6
};

function toMinutes(timeString = '') {
  const raw = String(timeString).trim().toLowerCase();
  const match = raw.match(/^(\d{1,2})(?:[:.](\d{2})(?:[:.]\d{2})?)?\s*(am|pm)?$/i);
  if (!match) return Number.MAX_SAFE_INTEGER;

  let hours = Number(match[1]);
  const minutes = Number(match[2] || '0');
  const meridiem = match[3];

  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

function aggregate(rows) {
  const map = new Map();

  for (const row of rows) {
    const name = String(row.faculty || '').trim();
    if (!name) continue;

    if (!map.has(name)) {
      map.set(name, {
        name,
        department: String(row.department || '').trim(),
        email: String(row.email || '').trim(),
        office: String(row.office || '').trim(),
        office_hours: {}
      });
    }

    const item = map.get(name);
    if (!item.department && row.department) item.department = String(row.department).trim();
    if (!item.email && row.email) item.email = String(row.email).trim();
    if (!item.office && row.office) item.office = String(row.office).trim();

    const day = String(row.day || '').trim();
    const start = String(row.start || '').trim();
    const end = String(row.end || '').trim();
    if (!day) continue;

    const slot = start && end ? `${start} - ${end}` : (start || end || 'N/A');
    if (!item.office_hours[day]) {
      item.office_hours[day] = [];
    }
    item.office_hours[day].push(slot);
  }

  return Array.from(map.values()).map(item => {
    const orderedEntries = Object.entries(item.office_hours)
      .sort((a, b) => (DAY_ORDER[a[0].toLowerCase()] ?? 99) - (DAY_ORDER[b[0].toLowerCase()] ?? 99))
      .map(([day, slots]) => {
        const uniqueSlots = [...new Set(slots)];
        const sorted = uniqueSlots.sort((aSlot, bSlot) => {
          const aStart = aSlot.split('-')[0]?.trim() || '';
          const bStart = bSlot.split('-')[0]?.trim() || '';
          return toMinutes(aStart) - toMinutes(bStart);
        });
        return [day, sorted.join(', ')];
      });

    return {
      ...item,
      office_hours: Object.fromEntries(orderedEntries)
    };
  });
}

async function readRowsFromDatabase() {
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

    const normalized = aggregate(rows);
    return NextResponse.json(normalized, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to read doctors data' }, { status: 500 });
  }
}
