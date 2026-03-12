import pg from 'pg';

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';

let _pool = null;

function getPool() {
  if (!_pool && DATABASE_URL) {
    _pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
    });
  }
  return _pool;
}

export function hasAnalyticsDb() {
  return Boolean(DATABASE_URL);
}

export async function withAnalyticsDb(fn) {
  const pool = getPool();
  if (!pool) {
    throw new Error('DATABASE_URL is not configured');
  }

  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

export async function safeQuery(client, sql, params = [], fallbackRows = []) {
  try {
    return await client.query(sql, params);
  } catch (error) {
    // Missing-table / missing-column guard for gradual rollout.
    if (error?.code === '42P01' || error?.code === '42703') {
      return { rows: fallbackRows };
    }
    throw error;
  }
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function parseDateRange(searchParams) {
  const preset = String(searchParams.get('preset') || 'last7');
  const fromRaw = searchParams.get('from');
  const toRaw = searchParams.get('to');

  if (preset === 'custom' && fromRaw && toRaw) {
    const from = new Date(fromRaw);
    const to = new Date(toRaw);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && from <= to) {
      return {
        from: startOfDay(from),
        to: endOfDay(to),
        preset: 'custom'
      };
    }
  }

  const now = new Date();
  const todayStart = startOfDay(now);

  if (preset === 'today') {
    return { from: todayStart, to: now, preset };
  }

  if (preset === 'yesterday') {
    const y = new Date(todayStart.getTime() - DAY_MS);
    return { from: y, to: endOfDay(y), preset };
  }

  if (preset === 'last30') {
    return { from: new Date(todayStart.getTime() - 29 * DAY_MS), to: now, preset };
  }

  return { from: new Date(todayStart.getTime() - 6 * DAY_MS), to: now, preset: 'last7' };
}

export function previousDateRange(from, to) {
  const spanMs = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - spanMs);
  return { from: prevFrom, to: prevTo };
}

export function percentDelta(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function formatCsv(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value) => {
    const raw = value == null ? '' : String(value);
    if (/[",\n]/.test(raw)) {
      return `"${raw.replace(/"/g, '""')}"`;
    }
    return raw;
  };

  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(','));
  }
  return lines.join('\n');
}

export function coercePage(searchParams) {
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('pageSize') || '20', 10) || 20));
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}
