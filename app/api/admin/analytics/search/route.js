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
    return NextResponse.json({ kpis: {}, trends: [], topNames: [], topQueries: [], warning: 'Database is not configured' });
  }

  const url = new URL(req.url);
  const range = parseDateRange(url.searchParams);
  const queryFilter = String(url.searchParams.get('query') || '').trim();
  const nameFilter = String(url.searchParams.get('name') || '').trim();
  const { page, pageSize, offset } = coercePage(url.searchParams);

  try {
    const data = await withAnalyticsDb(async (client) => {
      const [kpiRes, trendsRes, topNamesRes, topQueriesRes] = await Promise.all([
        safeQuery(
          client,
          `
            SELECT
              COUNT(*)::int AS total_searches,
              COUNT(*) FILTER (WHERE search_type = 'smart')::int AS smart_searches,
              COUNT(*) FILTER (WHERE search_type = 'name')::int AS name_searches,
              COUNT(*) FILTER (WHERE success = true)::int AS successful_searches
            FROM search_events
            WHERE created_at >= $1 AND created_at <= $2
          `,
          [range.from, range.to],
          [{ total_searches: 0, smart_searches: 0, name_searches: 0, successful_searches: 0 }]
        ),
        safeQuery(
          client,
          `
            SELECT DATE(created_at) AS day, search_type, COUNT(*)::int AS count
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
              normalized_name,
              COUNT(*)::int AS search_count,
              AVG(result_count)::numeric(10,2) AS result_count_avg,
              (100.0 * COUNT(*) FILTER (WHERE success = true) / NULLIF(COUNT(*), 0))::numeric(10,2) AS success_rate
            FROM search_events
            WHERE created_at >= $1
              AND created_at <= $2
              AND search_type = 'name'
              AND normalized_name IS NOT NULL
              AND normalized_name <> ''
              ${nameFilter ? `AND normalized_name ILIKE $3` : ''}
            GROUP BY normalized_name
            ORDER BY search_count DESC
            LIMIT $${nameFilter ? '4' : '3'}
            OFFSET $${nameFilter ? '5' : '4'}
          `,
          nameFilter ? [range.from, range.to, `%${nameFilter}%`, pageSize, offset] : [range.from, range.to, pageSize, offset],
          []
        ),
        safeQuery(
          client,
          `
            SELECT
              query,
              search_type,
              COUNT(*)::int AS count,
              (100.0 * COUNT(*) FILTER (WHERE success = true) / NULLIF(COUNT(*), 0))::numeric(10,2) AS success_rate
            FROM search_events
            WHERE created_at >= $1
              AND created_at <= $2
              ${queryFilter ? `AND query ILIKE $3` : ''}
            GROUP BY query, search_type
            ORDER BY count DESC
            LIMIT $${queryFilter ? '4' : '3'}
            OFFSET $${queryFilter ? '5' : '4'}
          `,
          queryFilter ? [range.from, range.to, `%${queryFilter}%`, pageSize, offset] : [range.from, range.to, pageSize, offset],
          []
        )
      ]);

      const k = kpiRes.rows[0] || {};
      const totalSearches = Number(k.total_searches || 0);
      const smartSearches = Number(k.smart_searches || 0);
      const successfulSearches = Number(k.successful_searches || 0);

      const trendMap = new Map();
      for (const row of trendsRes.rows) {
        const day = new Date(row.day).toISOString().slice(0, 10);
        if (!trendMap.has(day)) trendMap.set(day, { day, name: 0, smart: 0, other: 0 });
        const rec = trendMap.get(day);
        if (row.search_type === 'name') rec.name = Number(row.count || 0);
        else if (row.search_type === 'smart') rec.smart = Number(row.count || 0);
        else rec.other += Number(row.count || 0);
      }

      return {
        kpis: {
          totalSearches,
          smartSearches,
          smartSearchRate: totalSearches > 0 ? (smartSearches / totalSearches) * 100 : 0,
          nameSearches: Number(k.name_searches || 0),
          overallSuccessRate: totalSearches > 0 ? (successfulSearches / totalSearches) * 100 : 0
        },
        trends: [...trendMap.values()],
        topNames: topNamesRes.rows,
        topQueries: topQueriesRes.rows
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
      { error: 'Failed to load search analytics', details: error.message },
      { status: 500 }
    );
  }
}
