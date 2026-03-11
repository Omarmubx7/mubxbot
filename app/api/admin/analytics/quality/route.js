import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '../../../../../lib/adminAuth.js';
import { coercePage, hasAnalyticsDb, parseDateRange, safeQuery, withAnalyticsDb } from '../../../../../lib/adminAnalyticsDb.js';

function unauthorized(req) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value || '';
  return !verifyAdminSessionToken(token);
}

export async function GET(req) {
  if (unauthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasAnalyticsDb()) {
    return NextResponse.json({ kpis: {}, errorRatePerDay: [], errorTypeDistribution: [], recentErrors: [], topErrorMessages: [], warning: 'Database is not configured' });
  }

  const url = new URL(req.url);
  const range = parseDateRange(url.searchParams);
  const { page, pageSize, offset } = coercePage(url.searchParams);

  try {
    const data = await withAnalyticsDb(async (client) => {
      const [kpiRes, errorRateRes, typeRes, recentRes, topMessagesRes] = await Promise.all([
        safeQuery(
          client,
          `
            WITH c AS (
              SELECT
                COUNT(*)::int AS total_conversations,
                COUNT(*) FILTER (WHERE has_error = true)::int AS errored_conversations,
                COUNT(*) FILTER (WHERE success = true)::int AS successful_conversations
              FROM conversations
              WHERE started_at >= $1 AND started_at <= $2
            ),
            m AS (
              SELECT COUNT(*)::int AS bot_messages
              FROM messages
              WHERE created_at >= $1 AND created_at <= $2 AND sender = 'bot'
            ),
            e AS (
              SELECT
                COUNT(*)::int AS error_events,
                COUNT(*) FILTER (WHERE error_type IN ('no_results', 'did_not_understand'))::int AS fallback_events
              FROM error_events
              WHERE created_at >= $1 AND created_at <= $2
            )
            SELECT * FROM c, m, e
          `,
          [range.from, range.to],
          [{
            total_conversations: 0,
            errored_conversations: 0,
            successful_conversations: 0,
            bot_messages: 0,
            error_events: 0,
            fallback_events: 0
          }]
        ),
        safeQuery(
          client,
          `
            SELECT
              DATE(c.started_at) AS day,
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE c.has_error = true)::int AS errored
            FROM conversations c
            WHERE c.started_at >= $1 AND c.started_at <= $2
            GROUP BY DATE(c.started_at)
            ORDER BY day ASC
          `,
          [range.from, range.to],
          []
        ),
        safeQuery(
          client,
          `
            SELECT error_type, COUNT(*)::int AS count
            FROM error_events
            WHERE created_at >= $1 AND created_at <= $2
            GROUP BY error_type
            ORDER BY count DESC
          `,
          [range.from, range.to],
          []
        ),
        safeQuery(
          client,
          `
            SELECT
              e.created_at,
              e.conversation_id,
              e.error_type,
              e.user_text_at_error,
              e.bot_reply_snippet
            FROM error_events e
            WHERE e.created_at >= $1 AND e.created_at <= $2
            ORDER BY e.created_at DESC
            LIMIT $3 OFFSET $4
          `,
          [range.from, range.to, pageSize, offset],
          []
        ),
        safeQuery(
          client,
          `
            SELECT
              user_text_at_error,
              COUNT(*)::int AS count,
              MAX(created_at) AS last_occurrence,
              (ARRAY_AGG(error_type ORDER BY created_at DESC))[1] AS most_recent_error_type
            FROM error_events
            WHERE created_at >= $1
              AND created_at <= $2
              AND user_text_at_error IS NOT NULL
              AND user_text_at_error <> ''
            GROUP BY user_text_at_error
            ORDER BY count DESC
            LIMIT $3 OFFSET $4
          `,
          [range.from, range.to, pageSize, offset],
          []
        )
      ]);

      const k = kpiRes.rows[0] || {};
      const totalConversations = Number(k.total_conversations || 0);
      const botMessages = Number(k.bot_messages || 0);
      const errorEvents = Number(k.error_events || 0);

      return {
        kpis: {
          errorRatePerConversation: totalConversations > 0
            ? (Number(k.errored_conversations || 0) / totalConversations) * 100
            : 0,
          errorRatePerMessage: botMessages > 0
            ? (errorEvents / botMessages) * 100
            : 0,
          fallbackRate: totalConversations > 0
            ? (Number(k.fallback_events || 0) / totalConversations) * 100
            : 0,
          conversationSuccessRate: totalConversations > 0
            ? (Number(k.successful_conversations || 0) / totalConversations) * 100
            : 0,
          totalErrorEvents: errorEvents
        },
        errorRatePerDay: errorRateRes.rows.map((row) => {
          const total = Number(row.total || 0);
          const errored = Number(row.errored || 0);
          return {
            day: new Date(row.day).toISOString().slice(0, 10),
            rate: total > 0 ? (errored / total) * 100 : 0
          };
        }),
        errorTypeDistribution: typeRes.rows,
        recentErrors: recentRes.rows,
        topErrorMessages: topMessagesRes.rows
      };
    });

    return NextResponse.json({
      ...data,
      page,
      pageSize,
      range: {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        preset: range.preset
      }
    }, {
      headers: {
        'Cache-Control': 'private, max-age=30, s-maxage=30',
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load quality analytics', details: error.message },
      { status: 500 }
    );
  }
}
