import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '../../../../lib/adminAuth.js';
import { chatMetricsStore, pendingDisambiguationsStore } from '../../../../lib/chatMetricsStore.js';
import { getOnlineCount } from '../../../../lib/presence.js';

const { Client } = pg;
const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';
const OH_PATH = path.join(process.cwd(), 'data', 'office_hours.json');
const STATIC_PATH = path.join(process.cwd(), 'data', 'static_responses.json');

async function withDb(fn) {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function getDbMetrics() {
  return withDb(async (client) => {
    const [chatRes, instrRes, staticRes] = await Promise.all([
      client.query(`
        SELECT
          COUNT(*)::int                                                                               AS total_requests,
          COUNT(*) FILTER (WHERE outcome = 'smart_response')::int                                   AS smart_responses,
          COUNT(*) FILTER (WHERE outcome = 'no_results')::int                                       AS no_results,
          COUNT(*) FILTER (WHERE outcome = 'help')::int                                             AS help_responses,
          COUNT(*) FILTER (WHERE outcome = 'error')::int                                            AS errors,
          COUNT(*) FILTER (WHERE disambiguation_issued    = true)::int                              AS disambiguations_issued,
          COUNT(*) FILTER (WHERE disambiguation_resolved  = true)::int                              AS disambiguations_resolved,
          COUNT(*) FILTER (WHERE disambiguation_expired   = true)::int                              AS disambiguations_expired,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int                   AS today_requests,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour')::int                     AS last_hour_requests
        FROM chat_request_logs
      `),
      client.query(`
        SELECT
          COUNT(DISTINCT faculty)::int                                                               AS instructor_count,
          COUNT(DISTINCT department) FILTER (WHERE department IS NOT NULL AND department <> '')::int AS department_count
        FROM office_hours_entries
      `),
      client.query(`
        SELECT
          COUNT(*)::int                                                    AS total,
          COUNT(*) FILTER (WHERE is_active = true)::int                   AS active,
          COUNT(*) FILTER (WHERE audience = 'user')::int                  AS audience_user,
          COUNT(*) FILTER (WHERE audience = 'admin')::int                 AS audience_admin,
          COUNT(*) FILTER (WHERE audience = 'all')::int                   AS audience_all,
          COUNT(*) FILTER (WHERE audience NOT IN ('user','admin','all'))::int AS audience_other
        FROM bot_static_responses
      `)
    ]);

    const c = chatRes.rows[0] || {};
    const i = instrRes.rows[0] || {};
    const s = staticRes.rows[0] || {};

    return {
      chatMetrics: {
        totalRequests:            c.total_requests            || 0,
        smartResponses:           c.smart_responses           || 0,
        disambiguationsIssued:    c.disambiguations_issued    || 0,
        disambiguationsResolved:  c.disambiguations_resolved  || 0,
        disambiguationsExpired:   c.disambiguations_expired   || 0,
        noResults:                c.no_results                || 0,
        helpResponses:            c.help_responses            || 0,
        errors:                   c.errors                    || 0,
        pendingDisambiguations:   pendingDisambiguationsStore.size
      },
      todayRequests:    c.today_requests     || 0,
      lastHourRequests: c.last_hour_requests || 0,
      instructorCount:  i.instructor_count   || 0,
      departmentCount:  i.department_count   || 0,
      staticResponses: {
        total:  s.total          || 0,
        active: s.active         || 0,
        byAudience: {
          user:  s.audience_user  || 0,
          admin: s.audience_admin || 0,
          all:   s.audience_all   || 0,
          other: s.audience_other || 0
        }
      }
    };
  });
}

async function getFileMetrics() {
  const [ohRaw, srRaw] = await Promise.all([
    fs.readFile(OH_PATH,     'utf8').catch(() => '[]'),
    fs.readFile(STATIC_PATH, 'utf8').catch(() => '[]')
  ]);

  const ohRows  = Array.isArray(JSON.parse(ohRaw  || '[]')) ? JSON.parse(ohRaw  || '[]') : [];
  const srRows  = Array.isArray(JSON.parse(srRaw  || '[]')) ? JSON.parse(srRaw  || '[]') : [];

  const faculties   = new Set(ohRows.map(r => String(r?.faculty || r?.name || '').trim()).filter(Boolean));
  const departments = new Set(ohRows.map(r => String(r?.department || '').trim()).filter(Boolean));

  const byAudience = { user: 0, admin: 0, all: 0, other: 0 };
  for (const row of srRows) {
    const a = String(row?.audience || '').toLowerCase();
    if (a === 'user')  byAudience.user  += 1;
    else if (a === 'admin') byAudience.admin += 1;
    else if (a === 'all')   byAudience.all   += 1;
    else                    byAudience.other  += 1;
  }

  return {
    chatMetrics: {
      ...chatMetricsStore,
      pendingDisambiguations: pendingDisambiguationsStore.size
    },
    // Without DB we cannot slice by time window — show null so the UI renders "—"
    todayRequests:    null,
    lastHourRequests: null,
    instructorCount:  faculties.size,
    departmentCount:  departments.size,
    staticResponses: {
      total:  srRows.length,
      active: srRows.filter(r => r?.is_active !== false).length,
      byAudience
    }
  };
}

/**
 * GET /api/admin/overview
 * Returns a single aggregated payload used by the admin dashboard to drive
 * all live-status cards and metrics panels in one round-trip.
 * Requires a valid admin session cookie.
 */
export async function GET(req) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value || '';
  if (!verifyAdminSessionToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const metrics = DATABASE_URL
      ? await getDbMetrics()
      : await getFileMetrics();

    return NextResponse.json({
      ...metrics,
      onlineDevices: getOnlineCount(),
      refreshedAt: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load overview', details: error.message },
      { status: 500 }
    );
  }
}
