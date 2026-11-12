import { promises as fs } from 'fs';
import path from 'path';
import { getSql, hasDatabase } from './dbPool.js';
import { normalizeNameKey, isLikelyJunkName } from './names.js';

async function hasDatabaseDb() {
  try {
    return hasDatabase() && !!getSql();
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
  if (!(await hasDatabaseDb())) return null;
  const sql = getSql();
  if (!sql) return null;
  try {
    const rows = await sql`SELECT * FROM missing_name_metrics ORDER BY COALESCE(last_searched_at, last_reported_at, first_reported_at) DESC`;
    return rows.map(toRecord).filter(Boolean);
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
  if (await hasDatabaseDb()) {
    const sql = getSql();
    if (sql) {
      try {
        const rows = await sql`
          INSERT INTO missing_name_metrics (name_norm, display_name, search_count, first_searched_at, last_searched_at, status, updated_at)
          VALUES (${norm}, ${display}, 1, ${now}, ${now}, COALESCE(NULLIF(${opts.status || ''}, ''), 'reported'), ${now})
          ON CONFLICT (name_norm)
          DO UPDATE SET
            search_count = missing_name_metrics.search_count + 1,
            last_searched_at = GREATEST(missing_name_metrics.last_searched_at, ${now}),
            first_searched_at = COALESCE(missing_name_metrics.first_searched_at, ${now}),
            display_name = COALESCE(NULLIF(${display}, ''), missing_name_metrics.display_name),
            status = CASE WHEN missing_name_metrics.status = 'resolved' THEN 'reported' ELSE missing_name_metrics.status END,
            updated_at = ${now}
          RETURNING *
        `;
        if (rows && rows[0]) return toRecord(rows[0]);
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
  if (await hasDatabaseDb()) {
    const sql = getSql();
    if (sql) {
      try {
        const rows = await sql`
          INSERT INTO missing_name_metrics (name_norm, display_name, search_count, report_count, first_reported_at, last_reported_at, status, updated_at)
          VALUES (${norm}, ${display}, ${Number(opts.searchIncrement || 0)}, 1, ${now}, ${now}, COALESCE(NULLIF(${opts.status || ''}, ''), 'reported'), ${now})
          ON CONFLICT (name_norm)
          DO UPDATE SET
            report_count = missing_name_metrics.report_count + 1,
            last_reported_at = GREATEST(missing_name_metrics.last_reported_at, ${now}),
            first_reported_at = COALESCE(missing_name_metrics.first_reported_at, ${now}),
            display_name = COALESCE(NULLIF(${display}, ''), missing_name_metrics.display_name),
            status = CASE WHEN missing_name_metrics.status = 'resolved' THEN 'reported' ELSE missing_name_metrics.status END,
            updated_at = ${now}
          RETURNING *
        `;
        if (rows && rows[0]) return toRecord(rows[0]);
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
  if (await hasDatabaseDb()) {
    const sql = getSql();
    if (sql) {
      try {
        const rows = await sql`
          UPDATE missing_name_metrics
          SET status = 'resolved', resolved_at = ${now}, updated_at = ${now}
          WHERE name_norm = ${norm}
          RETURNING *
        `;
        if (rows && rows[0]) return toRecord(rows[0]);
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

export async function ignoreMissingName(name) {
  const norm = normalizeNameKey(name);
  if (!norm) return null;
  const now = nowIso();
  if (await hasDatabaseDb()) {
    const sql = getSql();
    if (sql) {
      try {
        const rows = await sql`
          UPDATE missing_name_metrics
          SET status = 'ignored', updated_at = ${now}
          WHERE name_norm = ${norm}
          RETURNING *
        `;
        if (rows && rows[0]) return toRecord(rows[0]);
        // try by display name as fallback
        try {
          const rows2 = await sql`
            UPDATE missing_name_metrics
            SET status = 'ignored', updated_at = ${now}
            WHERE lower(display_name) = lower(${String(name || '').trim()})
            RETURNING *
          `;
          if (rows2 && rows2[0]) return toRecord(rows2[0]);
        } catch {}
      } catch (e) {}
    }
  }
  const list = await readFileMetrics();
  const r = list.find(
    (x) =>
      x.name_norm === norm ||
      String(x.display_name || '').trim().toLowerCase() === String(name || '').trim().toLowerCase()
  );
  if (r) {
    r.status = 'ignored';
    r.updated_at = now;
    await writeFileMetrics(list);
    return r;
  }
  return null;
}

export async function ignoreMissingNames(names = []) {
  const results = [];
  for (const n of names) {
    const r = await ignoreMissingName(n);
    if (r) results.push(r);
  }
  return results;
}

export async function deleteMissingName(name) {
  const norm = normalizeNameKey(name);
  if (!norm) return false;
  if (await hasDatabaseDb()) {
    const sql = getSql();
    if (sql) {
      try {
        const rows = await sql`
          DELETE FROM missing_name_metrics WHERE name_norm = ${norm}
        `;
        // neon doesn't return rowCount directly; check if any rows were affected via RETURNING
        const rows2 = await sql`
          SELECT 1 FROM missing_name_metrics WHERE name_norm = ${norm} LIMIT 1
        `;
        if (rows2.length === 0) return true;
        try {
          const rows3 = await sql`
            DELETE FROM missing_name_metrics WHERE lower(display_name) = lower(${String(name || '').trim()})
          `;
          const rows4 = await sql`
            SELECT 1 FROM missing_name_metrics WHERE lower(display_name) = lower(${String(name || '').trim()}) LIMIT 1
          `;
          if (rows4.length === 0) return true;
        } catch {}
        return false;
      } catch (e) {}
    }
  }
  const list = await readFileMetrics();
  const before = list.length;
  const filtered = list.filter(
    (x) =>
      x.name_norm !== norm &&
      String(x.display_name || '').trim().toLowerCase() !== String(name || '').trim().toLowerCase()
  );
  if (filtered.length !== before) {
    await writeFileMetrics(filtered);
    return true;
  }
  return false;
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
