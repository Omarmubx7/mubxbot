import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { markNewData } from './newDataStore';

const DATA_PATH = path.join(process.cwd(), 'data', 'office_hours.json');
const DAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';
const { Client } = pg;

function normalizeName(value = '') {
  return String(value || '').trim().toLowerCase();
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

function buildRows(record) {
  const hours = record.office_hours && typeof record.office_hours === 'object'
    ? record.office_hours
    : {};
  const rows = [];

  for (const day of DAY_ORDER) {
    const parsedSlots = parseDaySlots(hours[day]);
    for (const slot of parsedSlots) {
      rows.push({
        faculty: String(record.name || '').trim(),
        department: String(record.department || '').trim(),
        email: String(record.email || '').trim(),
        office: String(record.office || '').trim(),
        day,
        start: slot.start,
        end: slot.end,
        type: 'In-Person'
      });
    }
  }

  if (rows.length === 0) {
    rows.push({
      faculty: String(record.name || '').trim(),
      department: String(record.department || '').trim(),
      email: String(record.email || '').trim(),
      office: String(record.office || '').trim(),
      day: '',
      start: '',
      end: '',
      type: 'In-Person'
    });
  }

  return rows;
}

/**
 * Writes an approved submission into the directory: updates the faculty
 * if it already exists, otherwise creates it. Returns true on success.
 */
export async function applyInstructorToDirectory(record) {
  const name = String(record?.name || '').trim();
  if (!name) throw new Error('Cannot apply submission without a name');

  if (DATABASE_URL) {
    const client = new Client({
      connectionString: DATABASE_URL,
      ssl: (process.env.PGSSL_MODE === 'disable' ? false : { rejectUnauthorized: true, ...(process.env.SSL_ROOT_CERT ? { ca: process.env.SSL_ROOT_CERT } : {}) })
    });
    await client.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'DELETE FROM office_hours_entries WHERE LOWER(TRIM(faculty)) = $1',
        [normalizeName(name)]
      );

      const sql = `
        INSERT INTO office_hours_entries
          (faculty, department, email, office, day, start, "end", type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      for (const row of buildRows(record)) {
        await client.query(sql, [
          row.faculty,
          row.department,
          row.email,
          row.office,
          row.day,
          row.start,
          row.end,
          row.type
        ]);
      }
      await client.query('COMMIT');
      try {
        await markNewData(name);
      } catch (error) {
        console.error('Failed to mark name as new data', error?.message || error);
      }
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      await client.end();
    }
  }

  let allRows = [];
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf8');
    allRows = JSON.parse(raw || '[]');
    if (!Array.isArray(allRows)) allRows = [];
  } catch {
    allRows = [];
  }

  const key = normalizeName(name);
  const filtered = allRows.filter(r => normalizeName(r.faculty) !== key);
  const combined = [...filtered, ...buildRows(record)];

  await fs.writeFile(DATA_PATH, `${JSON.stringify(combined, null, 2)}\n`, 'utf8');
  try {
    await markNewData(name);
  } catch (error) {
    console.error('Failed to mark name as new data', error?.message || error);
  }
  return true;
}
