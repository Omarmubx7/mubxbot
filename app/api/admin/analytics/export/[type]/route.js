import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '../../../../../../lib/adminAuth.js';
import { formatCsv, hasAnalyticsDb, parseDateRange, safeQuery, withAnalyticsDb } from '../../../../../../lib/adminAnalyticsDb.js';

function unauthorized(req) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value || '';
  return !verifyAdminSessionToken(token);
}

export async function GET(req, { params }) {
  if (unauthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasAnalyticsDb()) {
    return NextResponse.json({ error: 'Database is not configured' }, { status: 400 });
  }

  const resolvedParams = await params;
  const type = String(resolvedParams?.type || '').toLowerCase();
  const url = new URL(req.url);
  const range = parseDateRange(url.searchParams);

  const queryByType = {
    conversations: {
      sql: `
        WITH base AS (
          SELECT
            c.id,
            c.user_id,
            c.started_at,
            c.ended_at,
            COALESCE(c.message_count, 0) AS message_count,
            c.has_smart_search,
            c.has_error,
            c.success,
            NULLIF(c.meta->>'department', '') AS department,
            COALESCE(m.first_message_at, c.started_at) AS first_message_at,
            COALESCE(m.last_activity_at, c.ended_at, c.started_at) AS last_activity_at,
            COALESCE(i.detected_intent, CASE WHEN c.has_smart_search THEN 'smart' WHEN c.has_error THEN 'error' ELSE 'general' END) AS detected_intent,
            CASE
              WHEN c.ended_at IS NULL THEN 'live'
              WHEN c.success = true THEN 'resolved'
              WHEN c.has_error = true THEN 'needs_review'
              ELSE 'closed'
            END AS status,
            CASE
              WHEN COALESCE(f.down_count, 0) > 0 OR COALESCE(uf.user_feedback_count, 0) > 0 THEN 'reviewed'
              WHEN COALESCE(f.up_count, 0) > 0 THEN 'positive'
              ELSE 'none'
            END AS feedback_state,
            CASE
              WHEN c.has_error = true OR COALESCE(e.error_count, 0) > 0 THEN 'escalated'
              ELSE 'normal'
            END AS escalation_state
          FROM conversations c
          LEFT JOIN LATERAL (
            SELECT MIN(created_at) AS first_message_at, MAX(created_at) AS last_activity_at
            FROM messages m
            WHERE m.conversation_id = c.id
          ) m ON true
          LEFT JOIN LATERAL (
            SELECT search_type AS detected_intent
            FROM search_events se
            WHERE se.conversation_id = c.id
            ORDER BY se.created_at DESC
            LIMIT 1
          ) i ON true
          LEFT JOIN LATERAL (
            SELECT
              COUNT(*) FILTER (WHERE feedback = 'up')::int AS up_count,
              COUNT(*) FILTER (WHERE feedback = 'down')::int AS down_count
            FROM feedback_events fe
            WHERE fe.conversation_id = c.id
          ) f ON true
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::int AS user_feedback_count
            FROM user_feedback uf
            WHERE uf.conversation_id = c.id
          ) uf ON true
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::int AS error_count
            FROM error_events ee
            WHERE ee.conversation_id = c.id
          ) e ON true
          WHERE started_at >= $1 AND started_at <= $2
        )
        SELECT
          id,
          user_id,
          started_at,
          ended_at,
          first_message_at,
          last_activity_at,
          message_count,
          has_smart_search,
          has_error,
          success,
          detected_intent,
          status,
          feedback_state,
          escalation_state,
          department
        FROM base
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
