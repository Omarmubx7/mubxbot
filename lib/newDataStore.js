import fs from 'node:fs/promises';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';

const FILE_PATH = path.join(process.cwd(), 'data', 'new_data_names.json');
const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';

let sql = null;

function getSql() {
  if (!sql && DATABASE_URL) {
    sql = neon(DATABASE_URL);
  }
  return sql;
}

// The JSON file is the local/single-instance source of truth. On serverless
// deploys (Vercel) the filesystem is read-only, so the DB table takes over.
// A short TTL keeps multiple serverless instances reasonably in sync.
const DB_CACHE_TTL_MS = 30 * 1000;

let fileCache = null;
let dbCache = { data: null, loadedAt: 0 };
let tableReady = null;

function normalizeKey(value = '') {
  return String(value || '').trim().toLowerCase();
}

async function readFileNames() {
  if (fileCache) return fileCache;
  try {
    const raw = await fs.readFile(FILE_PATH, 'utf8');
    const cleaned = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
    const parsed = JSON.parse(cleaned || '[]');
    fileCache = Array.isArray(parsed)
      ? parsed.map((n) => String(n || '').trim()).filter(Boolean)
      : [];
  } catch {
    fileCache = [];
  }
  return fileCache;
}

async function writeFileNames(names) {
  await fs.writeFile(FILE_PATH, `${JSON.stringify(names, null, 2)}\n`, 'utf8');
  fileCache = names;
}

async function ensureTable() {
  if (!tableReady) {
    tableReady = (async () => {
      const sqlInstance = getSql();
      if (!sqlInstance) throw new Error('Database not configured');
      await sqlInstance`
        CREATE TABLE IF NOT EXISTS new_data_names (
          name TEXT PRIMARY KEY,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
    })().catch((error) => {
      tableReady = null;
      throw error;
    });
  }
  return tableReady;
}

export async function loadNewDataNames() {
  if (!DATABASE_URL) {
    return readFileNames();
  }

  if (dbCache.data && Date.now() - dbCache.loadedAt < DB_CACHE_TTL_MS) {
    return dbCache.data;
  }

  try {
    await ensureTable();
    const sqlInstance = getSql();
    if (!sqlInstance) return readFileNames();
    const rows = await sqlInstance`SELECT name FROM new_data_names ORDER BY name`;
    const names = rows.map((r) => String(r.name || '').trim()).filter(Boolean);
    dbCache = { data: names, loadedAt: Date.now() };
    return names;
  } catch (error) {
    console.error(
      'loadNewDataNames: database read failed, falling back to file',
      error?.message || error
    );
    return readFileNames();
  }
}

export async function markNewData(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return;
  const key = normalizeKey(trimmed);

  if (DATABASE_URL) {
    try {
      await ensureTable();
      const sqlInstance = getSql();
      if (!sqlInstance) throw new Error('Database not configured');
      await sqlInstance`
        INSERT INTO new_data_names (name) VALUES (${trimmed})
        ON CONFLICT (name) DO NOTHING
      `;
      const current = await loadNewDataNames();
      if (!current.some((n) => normalizeKey(n) === key)) {
        dbCache = { data: [...current, trimmed], loadedAt: Date.now() };
      } else {
        dbCache.loadedAt = 0;
      }
      return;
    } catch (error) {
      console.error('markNewData: database write failed', error?.message || error);
    }
  }

  const current = await readFileNames();
  if (current.some((n) => normalizeKey(n) === key)) return;
  try {
    await writeFileNames([...current, trimmed]);
  } catch (error) {
    console.error('markNewData: file write failed', error?.message || error);
  }
}

export async function removeNewDataName(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return;
  const key = normalizeKey(trimmed);

  if (DATABASE_URL) {
    try {
      await ensureTable();
      const sqlInstance = getSql();
      if (!sqlInstance) throw new Error('Database not configured');
      await sqlInstance`DELETE FROM new_data_names WHERE lower(name) = ${key}`;
      const current = await loadNewDataNames();
      dbCache = { data: current.filter((n) => normalizeKey(n) !== key), loadedAt: Date.now() };
      return;
    } catch (error) {
      console.error('removeNewDataName: database delete failed', error?.message || error);
    }
  }

  const current = await readFileNames();
  const updated = current.filter((n) => normalizeKey(n) !== key);
  if (updated.length === current.length) return;
  try {
    await writeFileNames(updated);
  } catch (error) {
    console.error('removeNewDataName: file write failed', error?.message || error);
  }
}
