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
  const sortByRaw = String(url.searchParams.get('sortBy') || 'started_at').trim().toLowerCase();
  const sortDirRaw = String(url.searchParams.get('sortDir') || 'desc').trim().toLowerCase();
  const sortDir = sortDirRaw === 'asc' ? 'ASC' : 'DESC';

  const sortColumnMap = {
    started_at: 'base.started_at',
    last_activity_at: 'base.last_activity_at',
    message_count: 'base.message_count',
    actual_message_count: 'base.actual_message_count',
    status: 'base.status',
    feedback_state: 'base.feedback_state',
    escalation_state: 'base.escalation_state',
    user_id: 'base.user_id',
    detected_intent: 'base.detected_intent'
  };
  const sortColumn = sortColumnMap[sortByRaw] || sortColumnMap.started_at;

  const success = url.searchParams.get('success');
  const hasError = url.searchParams.get('hasError');
  const hasSmartSearch = url.searchParams.get('hasSmartSearch');
  const minMessages = Number.parseInt(url.searchParams.get('minMessages') || '', 10);
  const maxMessages = Number.parseInt(url.searchParams.get('maxMessages') || '', 10);
  const userId = String(url.searchParams.get('userId') || '').trim();
  const conversationId = String(url.searchParams.get('conversationId') || '').trim();
  const status = String(url.searchParams.get('status') || '').trim().toLowerCase();
  const feedback = String(url.searchParams.get('feedback') || '').trim().toLowerCase();
  const intent = String(url.searchParams.get('intent') || '').trim().toLowerCase();
  const escalation = String(url.searchParams.get('escalation') || '').trim().toLowerCase();
  const department = String(url.searchParams.get('department') || '').trim().toLowerCase();

  const baseWhere = ['c.started_at >= $1', 'c.started_at <= $2'];
  const params = [range.from, range.to];

  if (success === 'true' || success === 'false') {
    params.push(success === 'true');
    baseWhere.push(`c.success = $${params.length}`);
  }

  if (hasError === 'true' || hasError === 'false') {
    params.push(hasError === 'true');
    baseWhere.push(`c.has_error = $${params.length}`);
  }

  if (hasSmartSearch === 'true' || hasSmartSearch === 'false') {
    params.push(hasSmartSearch === 'true');
    baseWhere.push(`c.has_smart_search = $${params.length}`);
  }

  if (Number.isFinite(minMessages)) {
    params.push(minMessages);
    baseWhere.push(`COALESCE(c.message_count, 0) >= $${params.length}`);
  }

  if (Number.isFinite(maxMessages)) {
    params.push(maxMessages);
    baseWhere.push(`COALESCE(c.message_count, 0) <= $${params.length}`);
  }

  if (userId) {
    params.push(userId);
    baseWhere.push(`LOWER(COALESCE(c.user_id, '')) = LOWER($${params.length})`);
  }

  if (conversationId) {
    params.push(conversationId);
    baseWhere.push(`LOWER(COALESCE(c.id, '')) = LOWER($${params.length})`);
  }

  if (department) {
    params.push(department);
    baseWhere.push(`LOWER(COALESCE(NULLIF(c.meta->>'department', ''), '')) = LOWER($${params.length})`);
  }

  const baseSql = `
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
        c.meta,
        NULLIF(c.meta->>'department', '') AS department,
        COALESCE(m.first_message_at, c.started_at) AS first_message_at,
        COALESCE(m.last_activity_at, c.ended_at, c.started_at) AS last_activity_at,
        COALESCE(m.actual_message_count, c.message_count, 0) AS actual_message_count,
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
        SELECT
          MIN(created_at) AS first_message_at,
          MAX(created_at) AS last_activity_at,
          COUNT(*)::int AS actual_message_count
        FROM messages m
        WHERE m.conversation_id = c.id
      ) m ON true
      LEFT JOIN LATERAL (
        SELECT
          search_type AS detected_intent
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
        SELECT
          COUNT(*)::int AS user_feedback_count
        FROM user_feedback uf
        WHERE uf.conversation_id = c.id
      ) uf ON true
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS error_count
        FROM error_events ee
        WHERE ee.conversation_id = c.id
      ) e ON true
      WHERE ${baseWhere.join(' AND ')}
    )
  `;

  const outerWhere = [];

  if (status) {
    params.push(status);
    outerWhere.push(`LOWER(COALESCE(base.status, '')) = LOWER($${params.length})`);
  }

  if (feedback) {
    params.push(feedback);
    outerWhere.push(`LOWER(COALESCE(base.feedback_state, '')) = LOWER($${params.length})`);
  }

  if (intent) {
    params.push(intent);
    outerWhere.push(`LOWER(COALESCE(base.detected_intent, '')) = LOWER($${params.length})`);
  }

  if (escalation) {
    params.push(escalation);
    outerWhere.push(`LOWER(COALESCE(base.escalation_state, '')) = LOWER($${params.length})`);
  }

  const outerWhereSql = outerWhere.length > 0 ? `WHERE ${outerWhere.join(' AND ')}` : '';

  try {
    const data = await withAnalyticsDb(async (client) => {
      const countRes = await safeQuery(
        client,
        `${baseSql} SELECT COUNT(*)::int AS total FROM base ${outerWhereSql}`,
        params,
        [{ total: 0 }]
      );

      const dataParams = [...params, pageSize, offset];
      const rowsRes = await safeQuery(
        client,
        `
          ${baseSql}
          SELECT
            base.id,
            base.id AS conversation_id,
            base.id AS session_id,
            base.user_id,
            base.department,
            base.started_at,
            base.ended_at,
            base.first_message_at,
            base.last_activity_at,
            EXTRACT(EPOCH FROM (COALESCE(base.last_activity_at, NOW()) - base.started_at))::int AS duration_seconds,
            base.message_count,
            base.actual_message_count,
            base.has_smart_search,
            base.has_error,
            base.success,
            base.detected_intent,
            base.status,
            base.feedback_state,
            base.escalation_state,
            base.meta
          FROM base
          ${outerWhereSql}
          ORDER BY ${sortColumn} ${sortDir}, base.started_at DESC
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
      },
      filters: {
        userId: userId || null,
        conversationId: conversationId || null,
        status: status || null,
        feedback: feedback || null,
        intent: intent || null,
        escalation: escalation || null,
        department: department || null
      },
      sort: {
        by: sortByRaw in sortColumnMap ? sortByRaw : 'started_at',
        dir: sortDir.toLowerCase()
      },
      fetchedAt: new Date().toISOString()
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
