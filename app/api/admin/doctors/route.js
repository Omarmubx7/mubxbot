import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const DATA_PATH = path.join(process.cwd(), 'data', 'office_hours.json');
const DAY_ORDER = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';
const { Client } = pg;

function normalizeName(value = '') {
  return String(value).trim().toLowerCase();
}

async function withDb(fn) {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function readRows() {
  if (DATABASE_URL) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        `SELECT faculty, department, email, office, day, start, "end", type
         FROM office_hours_entries`
      );
      return rows;
    });
  }

  const raw = await fs.readFile(DATA_PATH, 'utf8');
  const parsed = JSON.parse(raw || '[]');
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Writes rows for a single faculty member only (surgical DB path).
 * For file fallback, replaces all rows for that faculty name.
 */
async function writeFacultyRows(facultyName, newRows) {
  if (DATABASE_URL) {
    return withDb(async (client) => {
      await client.query('BEGIN');
      try {
        await client.query(
          'DELETE FROM office_hours_entries WHERE LOWER(TRIM(faculty)) = $1',
          [normalizeName(facultyName)]
        );

        const insertSql = `
          INSERT INTO office_hours_entries
            (faculty, department, email, office, day, start, "end", type)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;

        for (const row of newRows) {
          await client.query(insertSql, [
            row.faculty || '',
            row.department || '',
            row.email || '',
            row.office || '',
            row.day || '',
            row.start || '',
            row.end || '',
            row.type || 'In-Person'
          ]);
        }

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    });
  }

  // File fallback: read all, filter out this faculty, write back with new rows
  let allRows;
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf8');
    allRows = JSON.parse(raw || '[]');
    if (!Array.isArray(allRows)) allRows = [];
  } catch {
    allRows = [];
  }

  const key = normalizeName(facultyName);
  const filtered = allRows.filter(r => normalizeName(r.faculty) !== key);
  const combined = [...filtered, ...newRows];

  try {
    await fs.writeFile(DATA_PATH, `${JSON.stringify(combined, null, 2)}\n`, 'utf8');
  } catch (error) {
    if (error?.code === 'EROFS' || error?.code === 'EPERM') {
      throw new Error('Persistent admin saves require writable storage. This deployment filesystem is read-only.');
    }
    throw error;
  }
}

/**
 * Deletes all rows for a single faculty member.
 */
async function deleteFacultyRows(facultyName) {
  if (DATABASE_URL) {
    return withDb(async (client) => {
      const { rowCount } = await client.query(
        'DELETE FROM office_hours_entries WHERE LOWER(TRIM(faculty)) = $1',
        [normalizeName(facultyName)]
      );
      return rowCount;
    });
  }

  // File fallback
  let allRows;
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf8');
    allRows = JSON.parse(raw || '[]');
    if (!Array.isArray(allRows)) allRows = [];
  } catch {
    allRows = [];
  }

  const key = normalizeName(facultyName);
  const before = allRows.length;
  const filtered = allRows.filter(r => normalizeName(r.faculty) !== key);
  if (filtered.length === before) return 0;

  try {
    await fs.writeFile(DATA_PATH, `${JSON.stringify(filtered, null, 2)}\n`, 'utf8');
  } catch (error) {
    if (error?.code === 'EROFS' || error?.code === 'EPERM') {
      throw new Error('Persistent admin saves require writable storage. This deployment filesystem is read-only.');
    }
    throw error;
  }
  return before - filtered.length;
}

/**
 * Checks whether a faculty name already exists in the DB / file.
 */
async function facultyExists(facultyName) {
  if (DATABASE_URL) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        'SELECT 1 FROM office_hours_entries WHERE LOWER(TRIM(faculty)) = $1 LIMIT 1',
        [normalizeName(facultyName)]
      );
      return rows.length > 0;
    });
  }

  const allRows = await readRows();
  const key = normalizeName(facultyName);
  return allRows.some(r => normalizeName(r.faculty) === key);
}

function parseDaySlots(rawValue = '') {
  const value = String(rawValue || '').trim();
  if (!value) return [];

  return value
    .split(',')
    .map(slot => slot.trim())
    .filter(Boolean)
    .map(slot => {
      const [startPart, endPart] = slot.split('-').map(part => String(part || '').trim());
      return {
        start: startPart || '',
        end: endPart || ''
      };
    })
    .filter(slot => slot.start || slot.end);
}

function buildRowsFromDoctor(doctor) {
  const officeHours = doctor?.office_hours || {};
  const rows = [];

  for (const day of DAY_ORDER) {
    const parsedSlots = parseDaySlots(officeHours[day]);
    for (const slot of parsedSlots) {
      rows.push({
        faculty: doctor.name,
        department: doctor.department || '',
        email: doctor.email || '',
        office: doctor.office || '',
        day,
        start: slot.start,
        end: slot.end,
        type: 'In-Person'
      });
    }
  }

  if (rows.length === 0) {
    rows.push({
      faculty: doctor.name,
      department: doctor.department || '',
      email: doctor.email || '',
      office: doctor.office || '',
      day: '',
      start: '',
      end: '',
      type: 'In-Person'
    });
  }

  return rows;
}

function validateDoctorPayload(doctor) {
  if (!doctor || typeof doctor !== 'object') return 'Invalid request body';
  if (!String(doctor.name || '').trim()) return 'Name is required';
  if (!String(doctor.department || '').trim()) return 'Department is required';
  if (!String(doctor.email || '').trim()) return 'Email is required';
  if (!String(doctor.office || '').trim()) return 'Office is required';
  return null;
}

export async function POST(req) {
  try {
    const doctor = await req.json();
    const validationError = validateDoctorPayload(doctor);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const exists = await facultyExists(doctor.name);
    if (exists) {
      return NextResponse.json({ error: 'Doctor already exists' }, { status: 409 });
    }

    const newRows = buildRowsFromDoctor(doctor);
    await writeFacultyRows(doctor.name, newRows);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create doctor', details: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const doctor = await req.json();
    const validationError = validateDoctorPayload(doctor);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const exists = await facultyExists(doctor.name);
    if (!exists) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    const newRows = buildRowsFromDoctor(doctor);
    await writeFacultyRows(doctor.name, newRows);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update doctor', details: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { name } = await req.json();
    const normalized = normalizeName(name);
    if (!normalized) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const deleted = await deleteFacultyRows(name);
    if (!deleted) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete doctor', details: error.message }, { status: 500 });
  }
}