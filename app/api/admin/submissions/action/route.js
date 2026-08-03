import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { verifySubmissionActionToken } from '../../../../../lib/adminAuth.js';
import { applyInstructorToDirectory } from '../../../../../lib/instructorWriter.js';

export const dynamic = 'force-dynamic';

const { Client } = pg;
const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';
const FILE_PATH = path.join(process.cwd(), 'data', 'instructor_submissions.json');

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

async function loadSubmission(id) {
  if (DATABASE_URL) {
    return withDb(async (client) => {
      const result = await client.query(
        'SELECT id, name, department, email, office, office_hours, missing_name_link, status, created_at, reviewed_at, reviewed_by FROM instructor_submissions WHERE id = $1',
        [id]
      );
      const row = result.rows[0];
      return row ? { ...row, office_hours: parseOfficeHours(row.office_hours) } : null;
    });
  }

  const rows = await readFileRows();
  const row = rows.find(r => String(r?.id || '') === id);
  return row ? { ...row, office_hours: parseOfficeHours(row.office_hours) } : null;
}

async function setStatus(id, status, reviewedBy) {
  if (DATABASE_URL) {
    return withDb(async (client) => {
      await client.query(
        'UPDATE instructor_submissions SET status = $1, reviewed_at = NOW(), reviewed_by = $2 WHERE id = $3',
        [status, reviewedBy, id]
      );
    });
  }

  const rows = await readFileRows();
  const idx = rows.findIndex(r => String(r?.id || '') === id);
  if (idx === -1) throw new Error('Submission not found');
  rows[idx] = {
    ...rows[idx],
    status,
    reviewed_at: new Date().toISOString(),
    reviewed_by: reviewedBy
  };
  await writeFileRows(rows);
}

function renderPage({ title, heading, message, status = '', dashboardLink }) {
  const color = status === 'approved' ? '#16a34a' : status === 'rejected' ? '#DC2626' : '#4b5563';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f2f2f7;color:#111827;">
  <div style="max-width:480px;margin:0 auto;padding:40px 20px;">
    <div style="background:#ffffff;border-radius:16px;padding:32px;text-align:center;border:1px solid #e5e7eb;">
      <div style="font-size:13px;font-weight:700;letter-spacing:0.14em;color:#DC2626;text-transform:uppercase;">MUBXBot</div>
      <div style="font-size:26px;font-weight:800;margin:12px 0 10px;color:${color};">${heading}</div>
      <div style="font-size:15px;line-height:1.6;color:#4b5563;">${message}</div>
      <div style="margin-top:24px;">
        <a href="${dashboardLink}" style="display:inline-block;background:#111827;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;padding:12px 24px;">Open admin dashboard</a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function GET(req) {
  const url = new URL(req.url);
  const token = String(url.searchParams.get('token') || '');
  const dashboardLink = `${url.origin}/admin/missing-names`;

  const verified = verifySubmissionActionToken(token);
  if (!verified) {
    return new NextResponse(
      renderPage({
        title: 'Link invalid or expired',
        heading: 'Invalid or expired link',
        message: 'This approval/rejection link is invalid or has expired. New submissions send a fresh link, or you can review submissions from the admin dashboard.',
        dashboardLink
      }),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  const { id, action } = verified;

  let submission;
  try {
    submission = await loadSubmission(id);
  } catch (error) {
    console.error('action route load failed', error?.message || error);
    return new NextResponse(
      renderPage({
        title: 'Something went wrong',
        heading: 'Something went wrong',
        message: 'The submission could not be loaded. Please try again from the admin dashboard.',
        dashboardLink
      }),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  if (!submission) {
    return new NextResponse(
      renderPage({
        title: 'Submission not found',
        heading: 'Submission not found',
        message: 'This submission no longer exists in the system.',
        dashboardLink
      }),
      { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  if (submission.status === 'approved' || submission.status === 'rejected') {
    return new NextResponse(
      renderPage({
        title: 'Already processed',
        heading: 'Already processed',
        message: `This submission was already ${submission.status} on ${submission.reviewed_at ? new Date(submission.reviewed_at).toLocaleString() : 'an earlier date'}. No further action is needed.`,
        status: submission.status,
        dashboardLink
      }),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  try {
    if (action === 'approve') {
      await applyInstructorToDirectory({
        name: submission.name,
        department: submission.department,
        email: submission.email,
        office: submission.office,
        office_hours: submission.office_hours
      });
      await setStatus(id, 'approved', 'email-approve');

      return new NextResponse(
        renderPage({
          title: 'Submission approved',
          heading: 'Approved ✓',
          message: `<strong>${submission.name}</strong> was approved and the data was written into the directory. It is now live in the bot.`,
          status: 'approved',
          dashboardLink
        }),
        { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    await setStatus(id, 'rejected', 'email-reject');
    return new NextResponse(
      renderPage({
        title: 'Submission rejected',
        heading: 'Rejected ✕',
        message: `<strong>${submission.name}</strong> was rejected. No changes were made to the directory.`,
        status: 'rejected',
        dashboardLink
      }),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  } catch (error) {
    console.error('action route write failed', error?.message || error);
    return new NextResponse(
      renderPage({
        title: 'Action failed',
        heading: 'Action failed',
        message: `The ${action} action could not be completed: ${error?.message || 'unexpected error'}. Please try again from the admin dashboard.`,
        dashboardLink
      }),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
