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
    return NextResponse.json({ rows: [], total: 0, page: 1, pageSize: 20, range: null, warning: 'Database is not configured' });
  }

  const url = new URL(req.url);
  const range = parseDateRange(url.searchParams);
  const { page, pageSize, offset } = coercePage(url.searchParams);

  const success = url.searchParams.get('success');
  const hasError = url.searchParams.get('hasError');
  const hasSmartSearch = url.searchParams.get('hasSmartSearch');
  const minMessages = Number.parseInt(url.searchParams.get('minMessages') || '', 10);
  const maxMessages = Number.parseInt(url.searchParams.get('maxMessages') || '', 10);

  const where = ['started_at >= $1', 'started_at <= $2'];
  const params = [range.from, range.to];

  if (success === 'true' || success === 'false') {
    params.push(success === 'true');
    where.push(`success = $${params.length}`);
  }

  if (hasError === 'true' || hasError === 'false') {
    params.push(hasError === 'true');
    where.push(`has_error = $${params.length}`);
  }

  if (hasSmartSearch === 'true' || hasSmartSearch === 'false') {
    params.push(hasSmartSearch === 'true');
    where.push(`has_smart_search = $${params.length}`);
  }

  if (Number.isFinite(minMessages)) {
    params.push(minMessages);
    where.push(`message_count >= $${params.length}`);
  }

  if (Number.isFinite(maxMessages)) {
    params.push(maxMessages);
    where.push(`message_count <= $${params.length}`);
  }

  const whereSql = where.join(' AND ');

  try {
    const data = await withAnalyticsDb(async (client) => {
      const countRes = await safeQuery(
        client,
        `SELECT COUNT(*)::int AS total FROM conversations WHERE ${whereSql}`,
        params,
        [{ total: 0 }]
      );

      const dataParams = [...params, pageSize, offset];
      const rowsRes = await safeQuery(
        client,
        `
          SELECT
            id,
            user_id,
            started_at,
            ended_at,
            EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at))::int AS duration_seconds,
            message_count,
            has_smart_search,
            has_error,
            success
          FROM conversations
          WHERE ${whereSql}
          ORDER BY started_at DESC
          LIMIT $${dataParams.length - 1}
          OFFSET $${dataParams.length}
        `,
        dataParams,
        []
      );

      return {
        total: Number(countRes.rows[0]?.total || 0),
        rows: rowsRes.rows
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
      { error: 'Failed to load conversations', details: error.message },
      { status: 500 }
    );
  }
}
