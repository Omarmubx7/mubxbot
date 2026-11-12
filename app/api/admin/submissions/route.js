import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '../../../../lib/adminAuth.js';
import { applyInstructorToDirectory } from '../../../../lib/instructorWriter.js';
import { markResolved } from '../../../../lib/missingNameMetrics.js';

export const dynamic = 'force-dynamic';

const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';
const FILE_PATH = path.join(process.cwd(), 'data', 'instructor_submissions.json');

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

async function readFileRows() {
  const raw = await fs.readFile(FILE_PATH, 'utf8').catch(() => '[]');
  const parsed = JSON.parse(raw || '[]');
  return Array.isArray(parsed) ? parsed : [];
}

async function writeFileRows(rows) {
  await fs.writeFile(FILE_PATH, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
}

function parseOfficeHours(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function findSubmissionById(id) {
  if (DATABASE_URL) {
    const sqlInstance = getSql();
    if (!sqlInstance) return null;

    const rows = await sqlInstance`
      SELECT id, name, department, email, office, office_hours, missing_name_link,
             missing_name_report_id, origin, status, created_at, reviewed_at, reviewed_by
      FROM instructor_submissions
      WHERE id = ${id}
    `;
    const row = rows[0];
    return row ? { ...row, office_hours: parseOfficeHours(row.office_hours) } : null;
  }

  const rows = await readFileRows();
  const row = rows.find((r) => String(r?.id || '') === id);
  return row ? { ...row, office_hours: parseOfficeHours(row.office_hours) } : null;
}

export async function GET(req) {
  if (unauthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = String(url.searchParams.get('status') || 'all').toLowerCase();
  const limit = Math.min(500, Math.max(1, Number.parseInt(url.searchParams.get('limit') || '200', 10) || 200));

  try {
    if (DATABASE_URL) {
      const sqlInstance = getSql();
      if (!sqlInstance) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
      }

      const rows = status !== 'all'
        ? await sqlInstance`
            SELECT id, name, department, email, office, office_hours, missing_name_link,
                   missing_name_report_id, origin, status, created_at, reviewed_at, reviewed_by
            FROM instructor_submissions
            WHERE status = ${status}
            ORDER BY created_at DESC
            LIMIT ${limit}
          `
        : await sqlInstance`
            SELECT id, name, department, email, office, office_hours, missing_name_link,
                   missing_name_report_id, origin, status, created_at, reviewed_at, reviewed_by
            FROM instructor_submissions
            ORDER BY created_at DESC
            LIMIT ${limit}
          `;

      const mappedRows = rows.map((row) => ({
        ...row,
        office_hours: parseOfficeHours(row.office_hours)
      }));

      return NextResponse.json(
        {
          rows: mappedRows,
          count: mappedRows.length,
          fetchedAt: new Date().toISOString(),
          source: 'database'
        },
        { status: 200 }
      );
    }

    const fileRows = await readFileRows();
    const rows = fileRows
      .filter((r) => status === 'all' || String(r?.status || 'pending').toLowerCase() === status)
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, limit);

    return NextResponse.json(
      {
        rows,
        count: rows.length,
        fetchedAt: new Date().toISOString(),
        source: 'file'
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load submissions', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  if (unauthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const id = String(body?.id || '').trim();
    const status = String(body?.status || '').trim().toLowerCase();

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'status must be pending, approved or rejected' },
        { status: 400 }
      );
    }

    const reviewedBy = String(body?.reviewedBy || 'admin').trim();

    const existing = await findSubmissionById(id);
    if (!existing) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });

    if (status === 'approved') {
      await applyInstructorToDirectory({
        name: existing.name,
        department: existing.department,
        email: existing.email,
        office: existing.office,
        office_hours: existing.office_hours
      });
      markResolved(existing.name).catch((error) => {
        console.warn('failed to mark missing name resolved', error?.message || error);
      });
    }

    if (DATABASE_URL) {
      const sqlInstance = getSql();
      if (!sqlInstance) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
      }

      const rows = await sqlInstance`
        UPDATE instructor_submissions
        SET status = ${status}, reviewed_at = NOW(), reviewed_by = ${reviewedBy}
        WHERE id = ${id}
        RETURNING id, name, department, email, office, office_hours, missing_name_link, status, created_at, reviewed_at, reviewed_by
      `;

      if (!rows[0]) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });

      const result = {
        ...rows[0],
        office_hours: parseOfficeHours(rows[0].office_hours)
      };
      return NextResponse.json(result, { status: 200 });
    }

    const fileRows = await readFileRows();
    const idx = fileRows.findIndex((r) => String(r?.id || '') === id);
    if (idx === -1) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });

    fileRows[idx] = {
      ...fileRows[idx],
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy
    };
    await writeFileRows(fileRows);
    return NextResponse.json(fileRows[idx], { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update submission', details: error.message },
      { status: 500 }
    );
  }
}
