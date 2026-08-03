import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { notifyDataSubmission } from '../../../lib/notifications';
import { aggregateOfficeHours } from '../../../lib/officeHours';
import { isNewDataName } from '../../../lib/updateList';
import { loadNewDataNames } from '../../../lib/newDataStore';
import { isLikelyJunkName } from '../../../lib/nameFilters';
import { DEPARTMENTS, normalizeDepartmentName, formatRoom, parseRoom } from '../../../lib/directoryLists';

export const dynamic = 'force-dynamic';

const { Client } = pg;
const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';
const FILE_PATH = path.join(process.cwd(), 'data', 'instructor_submissions.json');
const OFFICE_HOURS_FILE_PATH = path.join(process.cwd(), 'data', 'office_hours.json');

const SUBMISSION_LIMIT_PER_IP = 5;
const ipHits = new Map();

function normalizeName(value = '') {
  return String(value || '').trim().toLowerCase();
}

function normalizeText(value = '') {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(dr|doctor|eng|prof|professor)\.?\b/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function withDb(fn) {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: (process.env.PGSSL_MODE === 'disable' ? false : { rejectUnauthorized: true, ...(process.env.SSL_ROOT_CERT ? { ca: process.env.SSL_ROOT_CERT } : {}) })
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function ensureTable() {
  return withDb(async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS instructor_submissions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        department TEXT,
        email TEXT,
        office TEXT,
        office_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
        missing_name_link TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        ip_hash TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        reviewed_at TIMESTAMPTZ,
        reviewed_by TEXT
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_instructor_submissions_status ON instructor_submissions (status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_instructor_submissions_name ON instructor_submissions (name)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_instructor_submissions_created_at ON instructor_submissions (created_at)');
  });
}

async function readFileRows() {
  const raw = await fs.readFile(FILE_PATH, 'utf8').catch(() => '[]');
  const parsed = JSON.parse(raw || '[]');
  return Array.isArray(parsed) ? parsed : [];
}

async function readOfficeHoursRows() {
  if (DATABASE_URL) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        `
          SELECT faculty, department, email, office, day, start, "end", type
          FROM office_hours_entries
          ORDER BY faculty
        `
      );
      return rows;
    });
  }

  const raw = await fs.readFile(OFFICE_HOURS_FILE_PATH, 'utf8').catch(() => '[]');
  const parsed = JSON.parse(raw || '[]');
  return Array.isArray(parsed) ? parsed : [];
}

async function writeFileRows(rows) {
  await fs.writeFile(FILE_PATH, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
}

function clientIp(req) {
  const fwd = req.headers.get('x-forwarded-for') || '';
  return fwd.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

function hashIp(ip) {
  return crypto.createHash('sha256').update(String(ip || '')).digest('hex').slice(0, 16);
}

function rateLimit(req) {
  const ip = clientIp(req);
  const now = Date.now();
  const windowStart = now - 60 * 60 * 1000;
  const hits = (ipHits.get(ip) || []).filter(t => t > windowStart);
  ipHits.set(ip, hits);
  if (hits.length >= SUBMISSION_LIMIT_PER_IP) return true;
  ipHits.set(ip, [...hits, now]);
  return false;
}

function normalizePayload(payload) {
  const name = String(payload?.name || '').trim();
  const email = String(payload?.email || '').trim();
  const rawDepartment = String(payload?.department || '').trim();
  const department = normalizeDepartmentName(rawDepartment) || rawDepartment;
  const rawOffice = String(payload?.office || '').trim();
  const office = (() => {
    const parsed = parseRoom(rawOffice);
    return parsed ? formatRoom(parsed.building, parsed.number) : rawOffice;
  })();
  const officeHours = payload?.office_hours && typeof payload?.office_hours === 'object'
    ? payload.office_hours
    : {};

  const cleanedHours = {};
  let hasHours = false;
  for (const [day, value] of Object.entries(officeHours)) {
    const cleaned = String(value || '').trim();
    if (cleaned) {
      cleanedHours[day] = cleaned;
      hasHours = true;
    }
  }

  if (!name) return { error: 'Instructor name is required' };
  if (!hasHours) return { error: 'Please provide at least one office hours entry' };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Please enter a valid email address' };
  }

  return {
    value: {
      id: crypto.randomUUID(),
      name,
      department,
      email,
      office,
      office_hours: cleanedHours,
      missing_name_link: String(payload?.missing_name_link || '').trim() || null,
      status: 'pending',
      ip_hash: String(payload?.ip_hash || '').trim() || null,
      created_at: new Date().toISOString(),
      reviewed_at: null,
      reviewed_by: null
    }
  };
}

async function tryPersistToDb(record) {
  if (!DATABASE_URL) return null;

  const insert = async () => withDb(async (client) => {
    const result = await client.query(
      `
        INSERT INTO instructor_submissions
          (id, name, department, email, office, office_hours, missing_name_link, status, ip_hash, created_at, reviewed_at, reviewed_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        RETURNING id, name, department, email, office, office_hours, missing_name_link, status, created_at, reviewed_at, reviewed_by
      `,
      [
        record.id,
        record.name,
        record.department,
        record.email,
        record.office,
        JSON.stringify(record.office_hours),
        record.missing_name_link,
        record.status,
        record.ip_hash,
        record.created_at,
        record.reviewed_at,
        record.reviewed_by
      ]
    );
    return result.rows[0];
  });

  try {
    return await insert();
  } catch (error) {
    if (error?.code !== '42P01' && error?.code !== '42703') {
      throw error;
    }
  }

  try {
    await ensureTable();
    return await insert();
  } catch (error) {
    console.warn('instructor_submissions bootstrap failed', error?.code || error?.message || error);
  }

  return null;
}

export async function GET() {
  try {
    const missingNames = [];

    if (DATABASE_URL) {
      const readMissing = async () => withDb(async (client) => {
        const result = await client.query(
          `
            SELECT missing_name, message, created_at
            FROM user_feedback
            WHERE category = 'missing_name' AND missing_name IS NOT NULL
            ORDER BY created_at DESC
            LIMIT 500
          `
        );
        return result.rows;
      });

      const readExisting = async () => withDb(async (client) => {
        const result = await client.query('SELECT DISTINCT faculty FROM office_hours_entries');
        return result.rows;
      });

      let rows = [];
      let existingResult = [];
      try {
        [rows, existingResult] = await Promise.all([readMissing(), readExisting()]);
      } catch (error) {
        if (error?.code !== '42P01' && error?.code !== '42703') {
          throw error;
        }
      }

      const existingNames = new Set(existingResult.map(r => normalizeName(r.faculty)));

      const map = new Map();
      for (const row of rows) {
        const rawName = String(row.missing_name || '').trim();
        const key = normalizeText(rawName);
        if (!key || key.length < 2) continue;
        if (isLikelyJunkName(rawName)) continue;
        if (!map.has(key)) {
          map.set(key, {
            name: row.missing_name,
            count: 0,
            last_reported: row.created_at,
            resolved: existingNames.has(normalizeName(row.missing_name)),
            sample_message: row.message || null
          });
        }
        map.get(key).count += 1;
        if (row.created_at && new Date(row.created_at) > new Date(map.get(key).last_reported)) {
          map.get(key).last_reported = row.created_at;
        }
        if (!map.get(key).sample_message && row.message) {
          map.get(key).sample_message = row.message;
        }
      }

      missingNames.push(...Array.from(map.values())
        .sort((a, b) => new Date(b.last_reported) - new Date(a.last_reported)));
    }

    let staleInstructors = [];
    let newDataNames = [];
    let counts = { new: 0, old: 0, missing: missingNames.length, total: 0 };
    let departments = [...DEPARTMENTS];
    try {
      const ohRows = await readOfficeHoursRows();
      const aggregated = aggregateOfficeHours(ohRows);
      newDataNames = await loadNewDataNames();
      const stale = aggregated.filter(d => !isNewDataName(d.name, newDataNames));

      const seenDepartments = new Set();
      for (const item of aggregated) {
        const canonical = normalizeDepartmentName(item.department);
        if (canonical) seenDepartments.add(canonical);
      }
      if (seenDepartments.size > 0) {
        departments = [...DEPARTMENTS.filter(d => seenDepartments.has(d))];
        for (const dept of seenDepartments) {
          if (!departments.includes(dept)) departments.push(dept);
        }
      }

      staleInstructors = stale
        .map(d => ({
          name: d.name,
          department: d.department,
          email: d.email,
          office: d.office,
          hasOfficeHours: Object.values(d.office_hours || {}).some(v => String(v).trim()),
          existingDays: Object.entries(d.office_hours || {})
            .filter(([, v]) => String(v).trim())
            .map(([day]) => day)
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      counts = {
        new: aggregated.length - stale.length,
        old: staleInstructors.length,
        missing: missingNames.length,
        total: aggregated.length
      };
    } catch (error) {
      console.warn('Failed to build stale instructor list', error?.message || error);
    }

    const fileRows = await readFileRows().catch(() => []);
    const submissionsCount = fileRows.filter(r => r?.status === 'pending').length;

    return NextResponse.json({
      missingNames,
      staleInstructors,
      newDataNames,
      departments,
      counts,
      submissionsCount,
      generatedAt: new Date().toISOString(),
      source: DATABASE_URL ? 'database' : 'file'
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load missing names', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    if (rateLimit(req)) {
      return NextResponse.json(
        { error: 'Too many submissions. Please try again later.' },
        { status: 429 }
      );
    }

    const payload = await req.json();

    if (typeof payload?._hp === 'string' && payload._hp.length > 0) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const normalized = normalizePayload({ ...payload, ip_hash: hashIp(clientIp(req)) });
    if (normalized.error) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }

    const record = normalized.value;
    const dbCreated = await tryPersistToDb(record);
    const createdRecord = dbCreated || null;

    let responseRecord = createdRecord;
    if (!responseRecord) {
      try {
        const rows = await readFileRows();
        responseRecord = { ...record };
        await writeFileRows([responseRecord, ...rows]);
      } catch (fileError) {
        if (fileError?.code === 'EROFS' || fileError?.code === 'EPERM') {
          return NextResponse.json(
            { error: 'Submissions storage is not writable in this deployment. Please enable DB table instructor_submissions.' },
            { status: 503 }
          );
        }
        throw fileError;
      }
    }

    notifyDataSubmission(responseRecord, {
      baseUrl: new URL(req.url).origin
    }).catch((error) => {
      console.warn('data submission notification email failed', error?.message || error);
    });

    return NextResponse.json(responseRecord, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to submit data', details: error.message },
      { status: 500 }
    );
  }
}
