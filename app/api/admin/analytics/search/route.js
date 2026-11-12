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
    return NextResponse.json({ kpis: {}, trends: [], topNames: [], topQueries: [], warning: 'Database is not configured' });
  }

  const url = new URL(req.url);
  const range = parseDateRange(url.searchParams);
  const queryFilter = String(url.searchParams.get('query') || '').trim();
  const nameFilter = String(url.searchParams.get('name') || '').trim();
  const { page, pageSize, offset } = coercePage(url.searchParams);

  try {
    const [kpiRes, trendsRes, topNamesRes, topQueriesRes] = await Promise.all([
      safeQuery`
        SELECT
          COUNT(*)::int AS total_searches,
          COUNT(*) FILTER (WHERE search_type = 'smart')::int AS smart_searches,
          COUNT(*) FILTER (WHERE search_type = 'name')::int AS name_searches,
          COUNT(*) FILTER (WHERE success = true)::int AS successful_searches
        FROM search_events
        WHERE created_at >= ${range.from} AND created_at <= ${range.to}
      `,
      safeQuery`
        SELECT DATE(created_at) AS day, search_type, COUNT(*)::int AS count
        FROM search_events
        WHERE created_at >= ${range.from} AND created_at <= ${range.to}
        GROUP BY DATE(created_at), search_type
        ORDER BY day ASC
      `,
      nameFilter
        ? safeQuery`
            SELECT
              normalized_name,
              COUNT(*)::int AS search_count,
              AVG(result_count)::numeric(10,2) AS result_count_avg,
              (100.0 * COUNT(*) FILTER (WHERE success = true) / NULLIF(COUNT(*), 0))::numeric(10,2) AS success_rate
            FROM search_events
            WHERE created_at >= ${range.from}
              AND created_at <= ${range.to}
              AND search_type = 'name'
              AND normalized_name IS NOT NULL
              AND normalized_name <> ''
              AND normalized_name ILIKE ${`%${nameFilter}%`}
            GROUP BY normalized_name
            ORDER BY search_count DESC
            LIMIT ${pageSize} OFFSET ${offset}
          `
        : safeQuery`
            SELECT
              normalized_name,
              COUNT(*)::int AS search_count,
              AVG(result_count)::numeric(10,2) AS result_count_avg,
              (100.0 * COUNT(*) FILTER (WHERE success = true) / NULLIF(COUNT(*), 0))::numeric(10,2) AS success_rate
            FROM search_events
            WHERE created_at >= ${range.from}
              AND created_at <= ${range.to}
              AND search_type = 'name'
              AND normalized_name IS NOT NULL
              AND normalized_name <> ''
            GROUP BY normalized_name
            ORDER BY search_count DESC
            LIMIT ${pageSize} OFFSET ${offset}
          `,
      queryFilter
        ? safeQuery`
            SELECT
              query,
              search_type,
              COUNT(*)::int AS count,
              (100.0 * COUNT(*) FILTER (WHERE success = true) / NULLIF(COUNT(*), 0))::numeric(10,2) AS success_rate
            FROM search_events
            WHERE created_at >= ${range.from}
              AND created_at <= ${range.to}
              AND query ILIKE ${`%${queryFilter}%`}
            GROUP BY query, search_type
            ORDER BY count DESC
            LIMIT ${pageSize} OFFSET ${offset}
          `
        : safeQuery`
            SELECT
              query,
              search_type,
              COUNT(*)::int AS count,
              (100.0 * COUNT(*) FILTER (WHERE success = true) / NULLIF(COUNT(*), 0))::numeric(10,2) AS success_rate
            FROM search_events
            WHERE created_at >= ${range.from}
              AND created_at <= ${range.to}
            GROUP BY query, search_type
            ORDER BY count DESC
            LIMIT ${pageSize} OFFSET ${offset}
          `
    ]);

    const k = kpiRes[0] || {};
    const totalSearches = Number(k.total_searches || 0);
    const smartSearches = Number(k.smart_searches || 0);
    const successfulSearches = Number(k.successful_searches || 0);

    const trendMap = new Map();
    for (const row of trendsRes) {
      const day = new Date(row.day).toISOString().slice(0, 10);
      if (!trendMap.has(day)) trendMap.set(day, { day, name: 0, smart: 0, other: 0 });
      const rec = trendMap.get(day);
      if (row.search_type === 'name') rec.name = Number(row.count || 0);
      else if (row.search_type === 'smart') rec.smart = Number(row.count || 0);
      else rec.other += Number(row.count || 0);
    }

    return NextResponse.json({
      kpis: {
        totalSearches,
        smartSearches,
        smartSearchRate: totalSearches > 0 ? (smartSearches / totalSearches) * 100 : 0,
        nameSearches: Number(k.name_searches || 0),
        overallSuccessRate: totalSearches > 0 ? (successfulSearches / totalSearches) * 100 : 0
      },
      trends: [...trendMap.values()],
      topNames: topNamesRes,
      topQueries: topQueriesRes
    }, {
      headers: {
        'Cache-Control': 'private, max-age=30, s-maxage=30',
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load search analytics', details: error.message },
      { status: 500 }
    );
  }
}
