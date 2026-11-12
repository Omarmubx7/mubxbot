import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '../../../../lib/adminAuth.js';
import { markNewData, removeNewDataName } from '../../../../lib/newDataStore';
import { markResolved as markMissingNameResolved } from '../../../../lib/missingNameMetrics.js';

const DATA_PATH = path.join(process.cwd(), 'data', 'office_hours.json');
const DAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';

let sql = null;

function getSql() {
  if (!sql && DATABASE_URL) {
    sql = neon(DATABASE_URL);
  }
  return sql;
}

function unauthorized(req) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value || '';
  return !verifyAdminSessionToken(token);
}

function normalizeName(value = '') {
  return String(value).trim().toLowerCase();
}

async function readRows() {
  if (DATABASE_URL) {
    const sqlInstance = getSql();
    if (!sqlInstance) return [];
    const rows = await sqlInstance`
      SELECT faculty, department, email, office, day, start, "end", type
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
    `;
    return rows;
  }

  const raw = await fs.readFile(DATA_PATH, 'utf8');
  const parsed = JSON.parse(raw || '[]');
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Writes rows for a single faculty member only (surgical DB path).
 * For file fallback, replaces all rows for that faculty name.
 *
 * Note: @neondatabase/serverless does not support explicit transactions.
 * DELETE and INSERTs run sequentially without atomic rollback.
 */
async function writeFacultyRows(facultyName, newRows) {
  if (DATABASE_URL) {
    const sqlInstance = getSql();
    if (!sqlInstance) throw new Error('Database not configured');

    // neon serverless driver does not support BEGIN/COMMIT/ROLLBACK.
    // Execute statements sequentially.
    await sqlInstance`
      DELETE FROM office_hours_entries WHERE LOWER(TRIM(faculty)) = ${normalizeName(facultyName)}
    `;

    for (const row of newRows) {
      await sqlInstance`
        INSERT INTO office_hours_entries
          (faculty, department, email, office, day, start, "end", type)
        VALUES (
          ${row.faculty || ''},
          ${row.department || ''},
          ${row.email || ''},
          ${row.office || ''},
          ${row.day || ''},
          ${row.start || ''},
          ${row.end || ''},
          ${row.type || 'In-Person'}
        )
      `;
    }

    return;
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
  const filtered = allRows.filter((r) => normalizeName(r.faculty) !== key);
  const combined = [...filtered, ...newRows];

  try {
    await fs.writeFile(DATA_PATH, `${JSON.stringify(combined, null, 2)}\n`, 'utf8');
  } catch (error) {
    if (error?.code === 'EROFS' || error?.code === 'EPERM') {
      throw new Error(
        'Persistent admin saves require writable storage. This deployment filesystem is read-only.'
      );
    }
    throw error;
  }
}

/**
 * Deletes all rows for a single faculty member.
 */
async function deleteFacultyRows(facultyName) {
  if (DATABASE_URL) {
    const sqlInstance = getSql();
    if (!sqlInstance) return 0;

    const rows = await sqlInstance`
      DELETE FROM office_hours_entries WHERE LOWER(TRIM(faculty)) = ${normalizeName(facultyName)}
      RETURNING 1
    `;
    return rows.length;
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
  const filtered = allRows.filter((r) => normalizeName(r.faculty) !== key);
  if (filtered.length === before) return 0;

  try {
    await fs.writeFile(DATA_PATH, `${JSON.stringify(filtered, null, 2)}\n`, 'utf8');
  } catch (error) {
    if (error?.code === 'EROFS' || error?.code === 'EPERM') {
      throw new Error(
        'Persistent admin saves require writable storage. This deployment filesystem is read-only.'
      );
    }
    throw error;
  }
  return before - filtered.length;
}

/**
 * Renames a faculty member. DB path: DELETE old rows + INSERT new rows sequentially
 * (no transaction support in neon serverless driver).
 * File path: single atomic write.
 */
async function renameFacultyRows(fromName, newRows) {
  if (DATABASE_URL) {
    const sqlInstance = getSql();
    if (!sqlInstance) throw new Error('Database not configured');

    await sqlInstance`
      DELETE FROM office_hours_entries WHERE LOWER(TRIM(faculty)) = ${normalizeName(fromName)}
    `;

    for (const row of newRows) {
      await sqlInstance`
        INSERT INTO office_hours_entries
          (faculty, department, email, office, day, start, "end", type)
        VALUES (
          ${row.faculty || ''},
          ${row.department || ''},
          ${row.email || ''},
          ${row.office || ''},
          ${row.day || ''},
          ${row.start || ''},
          ${row.end || ''},
          ${row.type || 'In-Person'}
        )
      `;
    }

    return;
  }

  let allRows;
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf8');
    allRows = JSON.parse(raw || '[]');
    if (!Array.isArray(allRows)) allRows = [];
  } catch {
    allRows = [];
  }

  const key = normalizeName(fromName);
  const filtered = allRows.filter((r) => normalizeName(r.faculty) !== key);
  const combined = [...filtered, ...newRows];

  try {
    await fs.writeFile(DATA_PATH, `${JSON.stringify(combined, null, 2)}\n`, 'utf8');
  } catch (error) {
    if (error?.code === 'EROFS' || error?.code === 'EPERM') {
      throw new Error(
        'Persistent admin saves require writable storage. This deployment filesystem is read-only.'
      );
    }
    throw error;
  }
}

/**
 * Checks whether a faculty name already exists in the DB / file.
 */
async function facultyExists(facultyName) {
  if (DATABASE_URL) {
    const sqlInstance = getSql();
    if (!sqlInstance) return false;

    const rows = await sqlInstance`
      SELECT 1 FROM office_hours_entries WHERE LOWER(TRIM(faculty)) = ${normalizeName(facultyName)} LIMIT 1
    `;
    return rows.length > 0;
  }

  const allRows = await readRows();
  const key = normalizeName(facultyName);
  return allRows.some((r) => normalizeName(r.faculty) === key);
}

function parseDaySlots(rawValue = '') {
  const value = String(rawValue || '').trim();
  if (!value) return [];

  return value
    .split(',')
    .map((slot) => slot.trim())
    .filter(Boolean)
    .map((slot) => {
      const [startPart, endPart] = slot.split('-').map((part) => String(part || '').trim());
      return {
        start: startPart || '',
        end: endPart || ''
      };
    })
    .filter((slot) => slot.start || slot.end);
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
    if (unauthorized(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    let marked = true;
    try {
      await markNewData(doctor.name);
    } catch (error) {
      marked = false;
      console.error('Failed to mark name as new data', error?.message || error);
    }
    await markMissingNameResolved(doctor.name);
    return NextResponse.json({ ok: true, marked }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create doctor', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    if (unauthorized(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const doctor = await req.json();
    const validationError = validateDoctorPayload(doctor);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // `originalName` lets the client rename in place instead of delete-then-create.
    const originalName = String(doctor.originalName || '').trim();
    const renaming = Boolean(originalName) && normalizeName(originalName) !== normalizeName(doctor.name);

    if (renaming) {
      const originalExists = await facultyExists(originalName);
      if (!originalExists) {
        return NextResponse.json({ error: 'Instructor not found' }, { status: 404 });
      }
      const targetExists = await facultyExists(doctor.name);
      if (targetExists) {
        return NextResponse.json({ error: 'Doctor already exists' }, { status: 409 });
      }
    } else {
      const exists = await facultyExists(doctor.name);
      if (!exists) {
        return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
      }
    }

    const newRows = buildRowsFromDoctor(doctor);
    if (renaming) {
      await renameFacultyRows(originalName, newRows);
      try {
        await removeNewDataName(originalName);
      } catch (error) {
        console.error('Failed to clear new-data flag on rename', error?.message || error);
      }
    } else {
      await writeFacultyRows(doctor.name, newRows);
    }

    let marked = true;
    try {
      await markNewData(doctor.name);
    } catch (error) {
      marked = false;
      console.error('Failed to mark name as new data', error?.message || error);
    }
    await markMissingNameResolved(doctor.name);
    return NextResponse.json({ ok: true, marked, renamed: renaming }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update doctor', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    if (unauthorized(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const names = Array.isArray(body?.names)
      ? body.names.map((v) => String(v || '').trim()).filter(Boolean)
      : body?.name ? [String(body.name).trim()] : [];

    if (names.length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    let deletedCount = 0;
    for (const name of names) {
      const deleted = await deleteFacultyRows(name);
      if (deleted) deletedCount += 1;

      try {
        await removeNewDataName(name);
      } catch (error) {
        console.error('Failed to remove name from new data store', error?.message || error);
      }
    }

    return NextResponse.json({ ok: true, deleted: deletedCount > 0, deletedCount });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete doctor', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Flips a single instructor between NEW DATA and OLD DATA by adding/removing
 * their name in the new-data store. Used by the admin directory's status
 * toggle (test/triage use case) — it does not touch office-hours rows.
 */
export async function PATCH(req) {
  try {
    if (unauthorized(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, isNew } = await req.json();
    const trimmed = String(name || '').trim();
    if (!trimmed) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (typeof isNew !== 'boolean') {
      return NextResponse.json({ error: 'isNew must be a boolean' }, { status: 400 });
    }

    if (isNew) {
      await markNewData(trimmed);
    } else {
      await removeNewDataName(trimmed);
    }

    return NextResponse.json({ ok: true, name: trimmed, isNew });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update data status', details: error.message },
      { status: 500 }
    );
  }
}
