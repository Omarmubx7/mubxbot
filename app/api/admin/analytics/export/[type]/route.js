import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '../../../../../../lib/adminAuth.js';
import { formatCsv, hasAnalyticsDb, parseDateRange, safeQuery, withAnalyticsDb } from '../../../../../../lib/adminAnalyticsDb.js';

function unauthorized(req) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value || '';
  return !verifyAdminSessionToken(token);
}

export async function GET(req, ctx) {
  if (unauthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasAnalyticsDb()) {
    return NextResponse.json({ error: 'Database is not configured' }, { status: 400 });
  }

  const params = await ctx.params;
  const type = String(params?.type || '').toLowerCase();
  const url = new URL(req.url);
  const range = parseDateRange(url.searchParams);

  const queryByType = {
    conversations: {
      sql: `
        SELECT id, user_id, started_at, ended_at, has_smart_search, has_error, success, message_count
        FROM conversations
        WHERE started_at >= $1 AND started_at <= $2
        ORDER BY started_at DESC
        LIMIT 10000
      `
    },
    'search-events': {
      sql: `
        SELECT id, conversation_id, user_id, search_type, query, normalized_name, result_count, success, created_at
        FROM search_events
        WHERE created_at >= $1 AND created_at <= $2
        ORDER BY created_at DESC
        LIMIT 10000
      `
    },
    'error-events': {
      sql: `
        SELECT id, conversation_id, message_id, user_id, error_type, trigger_source, user_text_at_error, bot_reply_snippet, created_at
        FROM error_events
        WHERE created_at >= $1 AND created_at <= $2
        ORDER BY created_at DESC
        LIMIT 10000
      `
    }
  };

  const selected = queryByType[type];
  if (!selected) {
    return NextResponse.json({ error: 'Unsupported export type' }, { status: 400 });
  }

  try {
    const rows = await withAnalyticsDb(async (client) => {
      const res = await safeQuery(client, selected.sql, [range.from, range.to], []);
      return res.rows;
    });

    const csv = formatCsv(rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${type}-${new Date().toISOString().slice(0, 10)}.csv"`
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to export analytics', details: error.message },
      { status: 500 }
    );
  }
}
