import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '../../../../../../lib/adminAuth.js';
import { hasAnalyticsDb, safeQuery, withAnalyticsDb } from '../../../../../../lib/adminAnalyticsDb.js';

function unauthorized(req) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value || '';
  return !verifyAdminSessionToken(token);
}

export async function GET(req, ctx) {
  if (unauthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasAnalyticsDb()) {
    return NextResponse.json({ conversation: null, messages: [], searchEvents: [], errorEvents: [], warning: 'Database is not configured' });
  }

  const params = await ctx.params;
  const id = String(params?.id || '');
  if (!id) {
    return NextResponse.json({ error: 'Conversation id is required' }, { status: 400 });
  }

  try {
    const data = await withAnalyticsDb(async (client) => {
      const [convRes, messagesRes, searchRes, errorRes, feedbackRes] = await Promise.all([
        safeQuery(
          client,
          `
            SELECT
              c.id,
              c.user_id,
              c.started_at,
              c.ended_at,
              c.has_smart_search,
              c.has_error,
              c.success,
              COALESCE(c.message_count, 0) AS message_count,
              c.meta,
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
            WHERE c.id = $1
            LIMIT 1
          `,
          [id],
          []
        ),
        safeQuery(
          client,
          `
            SELECT id, sender, text, created_at, is_error_trigger, tags
            FROM messages
            WHERE conversation_id = $1
            ORDER BY created_at ASC
          `,
          [id],
          []
        ),
        safeQuery(
          client,
          `
            SELECT id, search_type, query, normalized_name, result_count, success, created_at
            FROM search_events
            WHERE conversation_id = $1
            ORDER BY created_at ASC
          `,
          [id],
          []
        ),
        safeQuery(
          client,
          `
            SELECT id, message_id, error_type, trigger_source, user_text_at_error, bot_reply_snippet, created_at
            FROM error_events
            WHERE conversation_id = $1
            ORDER BY created_at ASC
          `,
          [id],
          []
        ),
        safeQuery(
          client,
          `
            SELECT id, category, message, missing_name, user_query, request_label, source, created_at
            FROM user_feedback
            WHERE conversation_id = $1
            ORDER BY created_at ASC
          `,
          [id],
          []
        )
      ]);

      return {
        conversation: convRes.rows[0] || null,
        messages: messagesRes.rows,
        searchEvents: searchRes.rows,
        errorEvents: errorRes.rows,
        feedbackEvents: feedbackRes.rows
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load conversation detail', details: error.message },
      { status: 500 }
    );
  }
}
