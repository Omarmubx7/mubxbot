import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '../../../../lib/adminAuth.js';

const { Client } = pg;
const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';
const FILE_PATH = path.join(process.cwd(), 'data', 'feedback_submissions.json');

function unauthorized(req) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value || '';
  return !verifyAdminSessionToken(token);
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

async function readFileRows() {
  const raw = await fs.readFile(FILE_PATH, 'utf8').catch(() => '[]');
  const parsed = JSON.parse(raw || '[]');
  return Array.isArray(parsed) ? parsed : [];
}

function applyFilters(rows, category) {
  if (!category || category === 'all') return rows;
  return rows.filter((row) => String(row?.category || '').toLowerCase() === category);
}

export async function GET(req) {
  if (unauthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const category = String(url.searchParams.get('category') || 'all').toLowerCase();
  const limit = Math.min(500, Math.max(1, Number.parseInt(url.searchParams.get('limit') || '200', 10) || 200));

  try {
    if (DATABASE_URL) {
      try {
        const rows = await withDb(async (client) => {
          const params = [];
          let where = '';

          if (category !== 'all') {
            params.push(category);
            where = `WHERE category = $${params.length}`;
          }

          params.push(limit);

          const result = await client.query(
            `
              SELECT
                id,
                category,
                message,
                missing_name,
                user_query,
                request_label,
                conversation_id,
                user_id,
                source_path,
                source,
                created_at
              FROM user_feedback
              ${where}
              ORDER BY created_at DESC
              LIMIT $${params.length}
            `,
            params
          );

          return result.rows;
        });

        return NextResponse.json({ rows, count: rows.length });
      } catch (error) {
        if (error?.code !== '42P01' && error?.code !== '42703') {
          throw error;
        }
      }
    }

    const rows = applyFilters(await readFileRows(), category)
      .sort((a, b) => {
        const aTs = new Date(a?.created_at || 0).getTime();
        const bTs = new Date(b?.created_at || 0).getTime();
        return bTs - aTs;
      })
      .slice(0, limit);

    return NextResponse.json({ rows, count: rows.length });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load feedback', details: error.message },
      { status: 500 }
    );
  }
}