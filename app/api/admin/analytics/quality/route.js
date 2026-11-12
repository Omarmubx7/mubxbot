import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '../../../../../lib/adminAuth.js';
import { coercePage, hasAnalyticsDb, parseDateRange, safeQuery, getAnalyticsSql } from '../../../../../lib/adminAnalyticsDb.js';

function unauthorized(req) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value || '';
  return !verifyAdminSessionToken(token);
}

export async function GET(req) {
  if (unauthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sql = getAnalyticsSql();
  if (!sql) {
    return NextResponse.json({ kpis: {}, errorRatePerDay: [], errorTypeDistribution: [], recentErrors: [], topErrorMessages: [], warning: 'Database is not configured' });
  }

  const url = new URL(req.url);
  const range = parseDateRange(url.searchParams);
  const { page, pageSize, offset } = coercePage(url.searchParams);

  try {
    const [kpiRes, errorRateRes, typeRes, recentRes, topMessagesRes] = await Promise.all([
      safeQuery`
        WITH c AS (
          SELECT
            COUNT(*)::int AS total_conversations,
            COUNT(*) FILTER (WHERE has_error = true)::int AS errored_conversations,
            COUNT(*) FILTER (WHERE success = true)::int AS successful_conversations
          FROM conversations
          WHERE started_at >= ${range.from} AND started_at <= ${range.to}
        ),
        m AS (
          SELECT COUNT(*)::int AS bot_messages
          FROM messages
          WHERE created_at >= ${range.from} AND created_at <= ${range.to} AND sender = 'bot'
        ),
        e AS (
          SELECT
            COUNT(*)::int AS error_events,
            COUNT(*) FILTER (WHERE error_type IN ('no_results', 'did_not_understand'))::int AS fallback_events
          FROM error_events
          WHERE created_at >= ${range.from} AND created_at <= ${range.to}
        )
        SELECT * FROM c, m, e
      `,
      safeQuery`
        SELECT
          DATE(c.started_at) AS day,
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE c.has_error = true)::int AS errored
        FROM conversations c
        WHERE c.started_at >= ${range.from} AND c.started_at <= ${range.to}
        GROUP BY DATE(c.started_at)
        ORDER BY day ASC
      `,
      safeQuery`
        SELECT error_type, COUNT(*)::int AS count
        FROM error_events
        WHERE created_at >= ${range.from} AND created_at <= ${range.to}
        GROUP BY error_type
        ORDER BY count DESC
      `,
      safeQuery`
        SELECT
          e.created_at,
          e.conversation_id,
          e.error_type,
          e.user_text_at_error,
          e.bot_reply_snippet
        FROM error_events e
        WHERE e.created_at >= ${range.from} AND e.created_at <= ${range.to}
        ORDER BY e.created_at DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `,
      safeQuery`
        SELECT
          user_text_at_error,
          COUNT(*)::int AS count,
          MAX(created_at) AS last_occurrence,
          (ARRAY_AGG(error_type ORDER BY created_at DESC))[1] AS most_recent_error_type
        FROM error_events
        WHERE created_at >= ${range.from}
          AND created_at <= ${range.to}
          AND user_text_at_error IS NOT NULL
          AND user_text_at_error <> ''
        GROUP BY user_text_at_error
        ORDER BY count DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `
    ]);

    const k = kpiRes[0] || {};
    const totalConversations = Number(k.total_conversations || 0);
    const botMessages = Number(k.bot_messages || 0);
    const errorEvents = Number(k.error_events || 0);

    return NextResponse.json({
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
      errorRatePerDay: errorRateRes.map((row) => {
        const total = Number(row.total || 0);
        const errored = Number(row.errored || 0);
        return {
          day: new Date(row.day).toISOString().slice(0, 10),
          rate: total > 0 ? (errored / total) * 100 : 0
        };
      }),
      errorTypeDistribution: typeRes,
      recentErrors: recentRes,
      topErrorMessages: topMessagesRes
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
