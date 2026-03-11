import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '../../../../../lib/adminAuth.js';
import { hasAnalyticsDb, parseDateRange, safeQuery, withAnalyticsDb } from '../../../../../lib/adminAnalyticsDb.js';

function unauthorized(req) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value || '';
  return !verifyAdminSessionToken(token);
}

export async function GET(req) {
  if (unauthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasAnalyticsDb()) {
    return NextResponse.json({ kpis: {}, avgLatencyPerDay: [], p95LatencyPerDay: [], histogram: [], warning: 'Database is not configured' });
  }

  const url = new URL(req.url);
  const range = parseDateRange(url.searchParams);

  try {
    const data = await withAnalyticsDb(async (client) => {
      const [kpiRes, avgDailyRes, p95DailyRes, histogramRes] = await Promise.all([
        safeQuery(
          client,
          `
            SELECT
              AVG(total_latency_ms)::numeric(10,2) AS avg_latency,
              PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_latency_ms)::numeric(10,2) AS p95_latency,
              AVG(model_latency_ms)::numeric(10,2) AS avg_model_latency,
              COUNT(*)::int AS total_requests
            FROM performance_events
            WHERE created_at >= $1 AND created_at <= $2
          `,
          [range.from, range.to],
          [{ avg_latency: 0, p95_latency: 0, avg_model_latency: 0, total_requests: 0 }]
        ),
        safeQuery(
          client,
          `
            SELECT
              DATE(created_at) AS day,
              AVG(total_latency_ms)::numeric(10,2) AS avg_latency
            FROM performance_events
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
              DATE(created_at) AS day,
              PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_latency_ms)::numeric(10,2) AS p95_latency
            FROM performance_events
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
              WIDTH_BUCKET(total_latency_ms, 0, 5000, 10) AS bucket,
              COUNT(*)::int AS count
            FROM performance_events
            WHERE created_at >= $1 AND created_at <= $2
            GROUP BY bucket
            ORDER BY bucket ASC
          `,
          [range.from, range.to],
          []
        )
      ]);

      return {
        kpis: {
          avgLatencyMs: Number(kpiRes.rows[0]?.avg_latency || 0),
          p95LatencyMs: Number(kpiRes.rows[0]?.p95_latency || 0),
          avgModelLatencyMs: Number(kpiRes.rows[0]?.avg_model_latency || 0),
          totalRequests: Number(kpiRes.rows[0]?.total_requests || 0)
        },
        avgLatencyPerDay: avgDailyRes.rows.map((row) => ({
          day: new Date(row.day).toISOString().slice(0, 10),
          value: Number(row.avg_latency || 0)
        })),
        p95LatencyPerDay: p95DailyRes.rows.map((row) => ({
          day: new Date(row.day).toISOString().slice(0, 10),
          value: Number(row.p95_latency || 0)
        })),
        histogram: histogramRes.rows.map((row) => ({
          bucket: Number(row.bucket || 0),
          count: Number(row.count || 0)
        }))
      };
    });

    return NextResponse.json({
      ...data,
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
      { error: 'Failed to load performance analytics', details: error.message },
      { status: 500 }
    );
  }
}
