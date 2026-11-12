import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '../../../../lib/adminAuth.js';

const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';
const FILE_PATH = path.join(process.cwd(), 'data', 'feedback_submissions.json');

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

async function ensureTable() {
  const sqlInstance = getSql();
  if (!sqlInstance) throw new Error('Database not configured');
  await sqlInstance`
    CREATE TABLE IF NOT EXISTS user_feedback (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL CHECK (category IN ('missing_name', 'general')),
      message TEXT,
      missing_name TEXT,
      user_query TEXT,
      request_label TEXT,
      conversation_id TEXT,
      user_id TEXT,
      source_path TEXT,
      source TEXT NOT NULL DEFAULT 'chat',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sqlInstance`CREATE INDEX IF NOT EXISTS idx_user_feedback_category ON user_feedback (category)`;
  await sqlInstance`CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback (created_at)`;
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

function parseLegacyReason(value) {
  try {
    const parsed = JSON.parse(String(value || '{}'));
    if (parsed && typeof parsed === 'object') return parsed;
    return {};
  } catch {
    return {};
  }
}

async function readLegacyFeedbackRows(category, limit) {
  const sqlInstance = getSql();
  if (!sqlInstance) return [];

  const rows = await sqlInstance`
    SELECT id, conversation_id, reason, created_at
    FROM feedback_events
    WHERE feedback = 'down'
    ORDER BY created_at DESC
    LIMIT ${Math.min(500, Math.max(1, limit))}
  `;

  const mapped = rows.map((row) => {
    const reason = parseLegacyReason(row.reason);
    return {
      id: row.id,
      category: String(reason.category || 'general').toLowerCase(),
      message: reason.message || row.reason || '',
      missing_name: reason.missing_name || null,
      user_query: reason.user_query || null,
      request_label: reason.request_label || null,
      conversation_id: row.conversation_id || null,
      user_id: null,
      source_path: reason.source_path || null,
      source: reason.source || 'chat',
      created_at: row.created_at
    };
  });

  return applyFilters(mapped, category);
}

async function readUserFeedbackRows(category, limit) {
  const sqlInstance = getSql();
  if (!sqlInstance) return [];

  const rows = category !== 'all'
    ? await sqlInstance`
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
        WHERE category = ${category}
        ORDER BY created_at DESC
        LIMIT ${Math.min(500, Math.max(1, limit))}
      `
    : await sqlInstance`
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
        ORDER BY created_at DESC
        LIMIT ${Math.min(500, Math.max(1, limit))}
      `;

  return rows;
}

async function tryReadFromDb(category, limit) {
  if (!DATABASE_URL) return null;

  try {
    return await readUserFeedbackRows(category, limit);
  } catch (error) {
    if (error?.code !== '42P01' && error?.code !== '42703') {
      throw error;
    }
  }

  try {
    return await readLegacyFeedbackRows(category, limit);
  } catch (error) {
    if (error?.code !== '42P01' && error?.code !== '42703') {
      throw error;
    }
  }

  return null;
}

export async function GET(req) {
  if (unauthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const category = String(url.searchParams.get('category') || 'all').toLowerCase();
  const limit = Math.min(500, Math.max(1, Number.parseInt(url.searchParams.get('limit') || '200', 10) || 200));

  try {
    const dbRows = await tryReadFromDb(category, limit);
    if (dbRows) {
      return NextResponse.json({
        rows: dbRows,
        count: dbRows.length,
        fetchedAt: new Date().toISOString(),
        source: DATABASE_URL ? 'database' : 'file'
      });
    }

    const rows = applyFilters(await readFileRows(), category)
      .sort((a, b) => {
        const aTs = new Date(a?.created_at || 0).getTime();
        const bTs = new Date(b?.created_at || 0).getTime();
        return bTs - aTs;
      })
      .slice(0, limit);

    return NextResponse.json({
      rows,
      count: rows.length,
      fetchedAt: new Date().toISOString(),
      source: 'file'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load feedback', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  if (unauthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const ids = Array.isArray(body?.ids)
    ? body.ids.map((v) => String(v || '').trim()).filter(Boolean)
    : [];
  const deleteAll = Boolean(body?.all);
  const category = String(body?.category || 'missing_name').toLowerCase();

  try {
    if (DATABASE_URL) {
      const sqlInstance = getSql();
      if (!sqlInstance) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
      }

      let deleted = 0;
      let affectedMissingNames = [];

      if (ids.length > 0) {
        // Collect missing names for affected feedback rows
        try {
          const fb = await sqlInstance`
            SELECT missing_name
            FROM user_feedback
            WHERE id = ANY(${ids}) AND category = 'missing_name'
          `;
          affectedMissingNames = fb.map((r) => r.missing_name).filter(Boolean);
        } catch {
          // ignore
        }

        const delRows = await sqlInstance`DELETE FROM user_feedback WHERE id = ANY(${ids})`;
        deleted += delRows.length;

        // Legacy feedback events (best-effort).
        try {
          await sqlInstance`DELETE FROM feedback_events WHERE id = ANY(${ids})`;
        } catch {
          // ignore legacy table errors
        }
      } else if (deleteAll) {
        if (category === 'missing_name' || category === 'all') {
          try {
            const fb = await sqlInstance`
              SELECT missing_name
              FROM user_feedback
              WHERE category = 'missing_name'
            `;
            affectedMissingNames = fb.map((r) => r.missing_name).filter(Boolean);
          } catch {
            // ignore
          }
        }

        const whereCategory = category && category !== 'all' ? `WHERE category = ${category}` : '';
        const delRows = await sqlInstance`DELETE FROM user_feedback ${whereCategory}`;
        deleted += delRows.length;
      } else {
        return NextResponse.json({ ok: true, deleted: 0 });
      }

      // Mark missing name metrics as ignored to hide from hot lists
      if ((category === 'missing_name' || category === 'all') && affectedMissingNames.length > 0) {
        try {
          const names = Array.from(
            new Set(affectedMissingNames.map((n) => String(n || '').trim()).filter(Boolean))
          );
          if (names.length > 0) {
            await sqlInstance`
              UPDATE missing_name_metrics
              SET status = 'ignored', updated_at = NOW()
              WHERE lower(display_name) = ANY(${names.map((n) => n.toLowerCase())})
                OR name_norm = ANY(${names.map((n) => n.toLowerCase())})
            `;
          }
        } catch {
          // best-effort only
        }
      }

      return NextResponse.json({ ok: true, deleted });
    }

    // File fallback
    const rows = await readFileRows();
    let remaining = rows;
    if (ids.length > 0) {
      const idSet = new Set(ids);
      remaining = rows.filter((row) => !idSet.has(String(row?.id || '')));
    } else if (deleteAll) {
      remaining = rows.filter((row) => {
        if (category === 'all') return false;
        return String(row?.category || '').toLowerCase() !== category;
      });
    }
    await fs.writeFile(FILE_PATH, `${JSON.stringify(remaining, null, 2)}\n`, 'utf8');
    return NextResponse.json({ ok: true, deleted: rows.length - remaining.length });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete feedback', details: error.message },
      { status: 500 }
    );
  }
}
