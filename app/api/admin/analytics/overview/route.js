import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '../../../../../lib/adminAuth.js';
import {
  hasAnalyticsDb,
  parseDateRange,
  percentDelta,
  previousDateRange,
  safeQuery,
  withAnalyticsDb
} from '../../../../../lib/adminAnalyticsDb.js';

function unauthorized(req) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value || '';
  return !verifyAdminSessionToken(token);
}

function buildSearchByTypeSeries(rows) {
  const searchByTypeMap = new Map();
  for (const row of rows) {
    const key = new Date(row.day).toISOString().slice(0, 10);
    if (!searchByTypeMap.has(key)) {
      searchByTypeMap.set(key, { day: key, name: 0, smart: 0, other: 0 });
    }
    const rec = searchByTypeMap.get(key);
    const type = String(row.search_type || 'other').toLowerCase();
    if (type === 'name') rec.name = Number(row.count || 0);
    else if (type === 'smart') rec.smart = Number(row.count || 0);
    else rec.other += Number(row.count || 0);
  }
  return [...searchByTypeMap.values()];
}

function buildUsageHeatmapSummary(rows) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const usageHeatmap = [];
  const dayTotals = Array.from({ length: 7 }, () => 0);
  const hourTotals = Array.from({ length: 24 }, () => 0);

  for (const row of rows) {
    const dow = Number(row.dow || 0);
    const hour = Number(row.hour || 0);
    const views = Number(row.views || 0);
    if (dow < 0 || dow > 6 || hour < 0 || hour > 23) continue;

    usageHeatmap.push({ dayIndex: dow, day: dayNames[dow], hour, views });
    dayTotals[dow] += views;
    hourTotals[hour] += views;
  }

  let peakHour = null;
  let peakHourViews = 0;
  for (let h = 0; h < hourTotals.length; h += 1) {
    if (hourTotals[h] > peakHourViews) {
      peakHourViews = hourTotals[h];
      peakHour = h;
    }
  }

  let peakDay = null;
  let peakDayViews = 0;
  for (let d = 0; d < dayTotals.length; d += 1) {
    if (dayTotals[d] > peakDayViews) {
      peakDayViews = dayTotals[d];
      peakDay = dayNames[d];
    }
  }

  return {
    usageHeatmap,
    peakHour,
    peakHourViews,
    peakDay,
    peakDayViews
  };
}

export async function GET(req) {
  if (unauthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasAnalyticsDb()) {
    return NextResponse.json({
      kpis: {},
      charts: { messagesPerDay: [], errorRatePerDay: [], searchByTypePerDay: [], usageHeatmap: [] },
      recentConversations: [],
      usageSummary: { peakHour: null, peakDay: null, totalViews: 0 },
      range: null,
      compare: null,
      warning: 'Database is not configured'
    });
  }

  const url = new URL(req.url);
  const range = parseDateRange(url.searchParams);
  const compareRange = previousDateRange(range.from, range.to);

  try {
    const data = await withAnalyticsDb(async (client) => {
      const [kpiRes, compareRes, messageSeriesRes, errorSeriesRes, searchSeriesRes, recentRes, usageHeatmapRes] = await Promise.all([
        safeQuery(
          client,
          `
            SELECT
              COUNT(*)::int AS total_conversations,
              COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL AND user_id <> '')::int AS unique_users,
              COUNT(*) FILTER (WHERE success = true)::int AS successful_conversations,
              COUNT(*) FILTER (WHERE has_error = true)::int AS conversations_with_error,
              COALESCE(SUM(message_count), 0)::int AS total_messages,
              COUNT(*) FILTER (WHERE has_smart_search = true)::int AS smart_conversations
            FROM conversations
            WHERE started_at >= $1 AND started_at <= $2
          `,
          [range.from, range.to],
          [{
            total_conversations: 0,
            unique_users: 0,
            successful_conversations: 0,
            conversations_with_error: 0,
            total_messages: 0,
            smart_conversations: 0
          }]
        ),
        safeQuery(
          client,
          `
            SELECT
              COUNT(*)::int AS total_conversations,
              COALESCE(SUM(message_count), 0)::int AS total_messages,
              COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL AND user_id <> '')::int AS unique_users,
              COUNT(*) FILTER (WHERE has_smart_search = true)::int AS smart_conversations,
              COUNT(*) FILTER (WHERE has_error = true)::int AS conversations_with_error,
              COUNT(*) FILTER (WHERE success = true)::int AS successful_conversations
            FROM conversations
            WHERE started_at >= $1 AND started_at <= $2
          `,
          [compareRange.from, compareRange.to],
          [{
            total_conversations: 0,
            total_messages: 0,
            unique_users: 0,
            smart_conversations: 0,
            conversations_with_error: 0,
            successful_conversations: 0
          }]
        ),
        safeQuery(
          client,
          `
            SELECT
              DATE(created_at) AS day,
              COUNT(*) FILTER (WHERE sender = 'user')::int AS user_messages,
              COUNT(*) FILTER (WHERE sender = 'bot')::int AS bot_messages
            FROM messages
            WHERE created_at >= $1 AND created_at <= $2
            GROUP BY DATE(created_at)
            ORDER BY day ASC
          `,
          [range.from, range.to],
          []
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
            SELECT
              DATE(created_at) AS day,
              search_type,
              COUNT(*)::int AS count
            FROM search_events
            WHERE created_at >= $1 AND created_at <= $2
            GROUP BY DATE(created_at), search_type
            ORDER BY day ASC
          `,
          [range.from, range.to],
          []
        ),
        safeQuery(
          client,
          `
            SELECT
              id,
              user_id,
              started_at,
              ended_at,
              success,
              has_error,
              message_count
            FROM conversations
            WHERE started_at >= $1 AND started_at <= $2
            ORDER BY started_at DESC
            LIMIT 20
          `,
          [range.from, range.to],
          []
        ),
        safeQuery(
          client,
          `
            SELECT
              EXTRACT(DOW FROM started_at)::int AS dow,
              EXTRACT(HOUR FROM started_at)::int AS hour,
              COUNT(*)::int AS views
            FROM conversations
            WHERE started_at >= $1 AND started_at <= $2
            GROUP BY EXTRACT(DOW FROM started_at), EXTRACT(HOUR FROM started_at)
            ORDER BY dow ASC, hour ASC
          `,
          [range.from, range.to],
          []
        )
      ]);

      const k = kpiRes.rows[0] || {};
      const p = compareRes.rows[0] || {};

      const totalConversations = Number(k.total_conversations || 0);
      const totalMessages = Number(k.total_messages || 0);
      const uniqueUsers = Number(k.unique_users || 0);
      const smartConversations = Number(k.smart_conversations || 0);
      const conversationsWithError = Number(k.conversations_with_error || 0);
      const successfulConversations = Number(k.successful_conversations || 0);

      const smartRate = totalConversations > 0 ? (smartConversations / totalConversations) * 100 : 0;
      const errorRate = totalConversations > 0 ? (conversationsWithError / totalConversations) * 100 : 0;
      const gcr = totalConversations > 0 ? (successfulConversations / totalConversations) * 100 : 0;

      const prevTotalConversations = Number(p.total_conversations || 0);
      const prevTotalMessages = Number(p.total_messages || 0);
      const prevUniqueUsers = Number(p.unique_users || 0);
      const prevSmartRate = prevTotalConversations > 0 ? (Number(p.smart_conversations || 0) / prevTotalConversations) * 100 : 0;
      const prevErrorRate = prevTotalConversations > 0 ? (Number(p.conversations_with_error || 0) / prevTotalConversations) * 100 : 0;
      const prevGcr = prevTotalConversations > 0 ? (Number(p.successful_conversations || 0) / prevTotalConversations) * 100 : 0;

      const searchByTypePerDay = buildSearchByTypeSeries(searchSeriesRes.rows);
      const usage = buildUsageHeatmapSummary(usageHeatmapRes.rows);

      return {
        kpis: {
          totalMessages: {
            value: totalMessages,
            deltaPct: percentDelta(totalMessages, prevTotalMessages)
          },
          totalViews: {
            value: totalConversations,
            deltaPct: percentDelta(totalConversations, prevTotalConversations)
          },
          totalConversations: {
            value: totalConversations,
            deltaPct: percentDelta(totalConversations, prevTotalConversations)
          },
          uniqueUsers: {
            value: uniqueUsers,
            deltaPct: percentDelta(uniqueUsers, prevUniqueUsers)
          },
          smartSearches: {
            value: smartConversations,
            rate: smartRate,
            deltaPct: percentDelta(smartRate, prevSmartRate)
          },
          errorRateConversations: {
            value: errorRate,
            deltaPct: percentDelta(errorRate, prevErrorRate)
          },
          conversationSuccessRate: {
            value: gcr,
            deltaPct: percentDelta(gcr, prevGcr)
          }
        },
        charts: {
          messagesPerDay: messageSeriesRes.rows.map((row) => ({
            day: new Date(row.day).toISOString().slice(0, 10),
            user: Number(row.user_messages || 0),
            bot: Number(row.bot_messages || 0)
          })),
          errorRatePerDay: errorSeriesRes.rows.map((row) => {
            const total = Number(row.total || 0);
            const errored = Number(row.errored || 0);
            return {
              day: new Date(row.day).toISOString().slice(0, 10),
              rate: total > 0 ? (errored / total) * 100 : 0
            };
          }),
          searchByTypePerDay,
          usageHeatmap: usage.usageHeatmap
        },
        recentConversations: recentRes.rows,
        usageSummary: {
          peakHour: usage.peakHour,
          peakHourViews: usage.peakHourViews,
          peakDay: usage.peakDay,
          peakDayViews: usage.peakDayViews,
          totalViews: totalConversations
        }
      };
    });

    return NextResponse.json({
      ...data,
      range: {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        preset: range.preset
      },
      compare: {
        from: compareRange.from.toISOString(),
        to: compareRange.to.toISOString()
      }
    }, {
      headers: {
        'Cache-Control': 'private, max-age=30, s-maxage=30',
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load overview analytics', details: error.message },
      { status: 500 }
    );
  }
}
