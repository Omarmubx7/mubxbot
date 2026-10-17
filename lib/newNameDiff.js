import { normalizeName } from './updateList.js';

/**
 * Collects unique faculty display names from office_hours-style rows,
 * keyed by the shared normalized form so "Dr. Murad A. Yaghi" and
 * "Murad Yaghi" collapse to one entry.
 */
export function extractFacultyNames(rows) {
  const byKey = new Map();

  for (const row of Array.isArray(rows) ? rows : []) {
    const display = String(row?.faculty || row?.name || row?.professor || '').trim();
    if (!display) continue;
    const key = normalizeName(display);
    if (!key || byKey.has(key)) continue;
    byKey.set(key, display);
  }

  return byKey;
}

/**
 * Returns display names that appear in the new dataset but were absent from
 * the old one (compared on normalized form). Used to auto-tag newly appeared
 * instructors as NEW DATA after a data sync.
 */
export function diffNewNames(oldRows, newRows) {
  const oldNames = extractFacultyNames(oldRows);
  const newNames = extractFacultyNames(newRows);
  const added = [];

  for (const [key, display] of newNames) {
    if (!oldNames.has(key)) added.push(display);
  }

  return added.sort((a, b) => a.localeCompare(b));
}

export function mergeNames(existing = [], additions = []) {
  const merged = new Map();

  for (const name of Array.isArray(existing) ? existing : []) {
    const display = String(name || '').trim();
    if (!display) continue;
    merged.set(display.toLowerCase(), display);
  }

  const added = [];
  for (const name of Array.isArray(additions) ? additions : []) {
    const display = String(name || '').trim();
    if (!display) continue;
    const key = display.toLowerCase();
    if (merged.has(key)) continue;
    merged.set(key, display);
    added.push(display);
  }

  return { names: Array.from(merged.values()), added };
}
