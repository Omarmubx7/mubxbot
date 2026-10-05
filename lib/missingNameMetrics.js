import { promises as fs } from 'fs';
import path from 'path';
import { getPool } from './dbPool.js';
import { normalizeNameKey, isLikelyJunkName } from './names.js';

async function hasDatabase() {
  try {
    return !!getPool();
  } catch {
    return false;
  }
}

const METRICS_FILE = path.join(process.cwd(), 'data', 'missing_name_metrics.json');

function nowIso() {
  return new Date().toISOString();
}

async function ensureFile(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (e) {}
}

async function readFileMetrics() {
  try {
    const raw = await fs.readFile(METRICS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch (e) {
    return [];
  }
}

async function writeFileMetrics(list) {
  try {
    await ensureFile(path.dirname(METRICS_FILE));
    await fs.writeFile(METRICS_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {}
}

function toRecord(row) {
  if (!row) return null;
  const norm = row.name_norm || row.namenorm || '';
  return {
    name_norm: norm,
    display_name: row.display_name || row.displayname || '',
    search_count: Number(row.search_count || row.searchcount || 0),
    report_count: Number(row.report_count || row.reportcount || 0),
    first_reported_at: row.first_reported_at || row.firstreportedat || null,
    last_reported_at: row.last_reported_at || row.lastreportedat || null,
    first_searched_at: row.first_searched_at || row.firstsearchedat || null,
    last_searched_at: row.last_searched_at || row.lastsearchedat || null,
    resolved_at: row.resolved_at || row.resolvedat || null,
    status: row.status || 'reported',
    updated_at: row.updated_at || row.updatedat || nowIso(),
  };
}

export async function getMetricsDb() {
  if (!(await hasDatabase())) return null;
  const pool = getPool();
  if (!pool) return null;
  try {
    const res = await pool.query('SELECT * FROM missing_name_metrics ORDER BY COALESCE(last_searched_at, last_reported_at, first_reported_at) DESC');
    return res.rows.map(toRecord).filter(Boolean);
  } catch (e) {
    return null;
  }
}

export async function getAllMissingNameMetrics() {
  const db = await getMetricsDb();
  if (db) return db;
  return readFileMetrics();
}

export async function upsertSearch(name, opts = {}) {
  const norm = normalizeNameKey(name);
  if (!norm || norm.length < 2) return null;
  if (isLikelyJunkName(name)) return null;
  const display = String(name || '').trim().slice(0, 200);
  const now = nowIso();
  if (await hasDatabase()) {
    const pool = getPool();
    if (pool) {
      try {
        const res = await pool.query(
          `INSERT INTO missing_name_metrics (name_norm, display_name, search_count, first_searched_at, last_searched_at, status, updated_at)
           VALUES ($1,$2,1,$3,$3,COALESCE(NULLIF($4,''),'reported'),$3)
           ON CONFLICT (name_norm)
           DO UPDATE SET
             search_count = missing_name_metrics.search_count + 1,
             last_searched_at = GREATEST(missing_name_metrics.last_searched_at, $3),
             first_searched_at = COALESCE(missing_name_metrics.first_searched_at, $3),
             display_name = COALESCE(NULLIF($2,''), missing_name_metrics.display_name),
             status = CASE WHEN missing_name_metrics.status='resolved' THEN 'reported' ELSE missing_name_metrics.status END,
             updated_at = $3
           RETURNING *`,
          [norm, display, now, opts.status || '']
        );
        if (res.rows && res.rows[0]) return toRecord(res.rows[0]);
      } catch (e) {}
    }
  }
  const list = await readFileMetrics();
  const idx = list.findIndex((r) => r.name_norm === norm);
  if (idx >= 0) {
    const r = list[idx];
    r.search_count = (Number(r.search_count) || 0) + 1;
    r.last_searched_at = now;
    if (!r.first_searched_at) r.first_searched_at = now;
    if (r.status === 'resolved') r.status = 'reported';
    if (display && !r.display_name) r.display_name = display;
    r.updated_at = now;
  } else {
    list.push({
      name_norm: norm,
      display_name: display,
      search_count: 1,
      report_count: 0,
      first_reported_at: null,
      last_reported_at: null,
      first_searched_at: now,
      last_searched_at: now,
      resolved_at: null,
      status: 'reported',
      updated_at: now,
    });
  }
  await writeFileMetrics(list);
  return list.find((r) => r.name_norm === norm) || null;
}

export async function upsertReport(name, opts = {}) {
  const norm = normalizeNameKey(name);
  if (!norm || norm.length < 2) return null;
  if (isLikelyJunkName(name)) return null;
  const display = String(name || '').trim().slice(0, 200);
  const now = nowIso();
  if (await hasDatabase()) {
    const pool = getPool();
    if (pool) {
      try {
        const res = await pool.query(
          `INSERT INTO missing_name_metrics (name_norm, display_name, search_count, report_count, first_reported_at, last_reported_at, status, updated_at)
           VALUES ($1,$2,$3,1,$4,$4,COALESCE(NULLIF($5,''),'reported'),$4)
           ON CONFLICT (name_norm)
           DO UPDATE SET
             report_count = missing_name_metrics.report_count + 1,
             last_reported_at = GREATEST(missing_name_metrics.last_reported_at, $4),
             first_reported_at = COALESCE(missing_name_metrics.first_reported_at, $4),
             display_name = COALESCE(NULLIF($2,''), missing_name_metrics.display_name),
             status = CASE WHEN missing_name_metrics.status='resolved' THEN 'reported' ELSE missing_name_metrics.status END,
             updated_at = $4
           RETURNING *`,
          [norm, display, Number(opts.searchIncrement || 0), now, opts.status || '']
        );
        if (res.rows && res.rows[0]) return toRecord(res.rows[0]);
      } catch (e) {}
    }
  }
  const list = await readFileMetrics();
  const idx = list.findIndex((r) => r.name_norm === norm);
  if (idx >= 0) {
    const r = list[idx];
    r.report_count = (Number(r.report_count) || 0) + 1;
    r.last_reported_at = now;
    if (!r.first_reported_at) r.first_reported_at = now;
    if (r.status === 'resolved') r.status = 'reported';
    if (display && !r.display_name) r.display_name = display;
    r.updated_at = now;
  } else {
    list.push({
      name_norm: norm,
      display_name: display,
      search_count: Number(opts.searchIncrement || 0),
      report_count: 1,
      first_reported_at: now,
      last_reported_at: now,
      first_searched_at: now,
      last_searched_at: now,
      resolved_at: null,
      status: 'reported',
      updated_at: now,
    });
  }
  await writeFileMetrics(list);
  return list.find((r) => r.name_norm === norm) || null;
}

export async function markResolved(name) {
  const norm = normalizeNameKey(name);
  if (!norm) return null;
  const now = nowIso();
  if (await hasDatabase()) {
    const pool = getPool();
    if (pool) {
      try {
        const res = await pool.query(
          `UPDATE missing_name_metrics SET status='resolved', resolved_at=$2, updated_at=$2 WHERE name_norm=$1 RETURNING *`,
          [norm, now]
        );
        if (res.rows && res.rows[0]) return toRecord(res.rows[0]);
      } catch (e) {}
    }
  }
  const list = await readFileMetrics();
  const r = list.find((x) => x.name_norm === norm);
  if (r) {
    r.status = 'resolved';
    r.resolved_at = now;
    r.updated_at = now;
    await writeFileMetrics(list);
  }
  return r || null;
}

export async function getHotMissing({ limit = 50, minSearch = 1, days = 30 } = {}) {
  const all = await getAllMissingNameMetrics();
  const cutoff = new Date(Date.now() - days * 86400000);
  const items = all
    .filter((r) => (r.status || 'reported') !== 'resolved' && (r.status || 'reported') !== 'ignored')
    .filter((r) => (Number(r.search_count) || 0) >= minSearch || (Number(r.report_count) || 0) >= 1)
    .map((r) => {
      const last = r.last_searched_at || r.last_reported_at || r.first_reported_at;
      const lastTs = last ? Date.now() - new Date(last).getTime() : 1e9;
      const hotScore = (Number(r.search_count) || 0) * 2 + (Number(r.report_count) || 0) * 1.5 - Math.min(lastTs / 86400000, 14);
      return { ...r, hotScore, lastTs };
    })
    .filter((r) => {
      if (!r.last_searched_at && !r.last_reported_at) return true;
      const l = new Date(r.last_searched_at || r.last_reported_at);
      return l >= cutoff || (Number(r.search_count) || 0) >= minSearch;
    })
    .sort((a, b) => b.hotScore - a.hotScore)
    .slice(0, limit);
  return items;
}
