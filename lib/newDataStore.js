import fs from 'node:fs/promises';
import path from 'node:path';

const FILE_PATH = path.join(process.cwd(), 'data', 'new_data_names.json');

let cache = null;

export async function loadNewDataNames() {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(FILE_PATH, 'utf8');
    const cleaned = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
    const parsed = JSON.parse(cleaned || '[]');
    cache = Array.isArray(parsed)
      ? parsed.map(n => String(n || '').trim()).filter(Boolean)
      : [];
  } catch {
    cache = [];
  }
  return cache;
}

export async function markNewData(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return;
  const current = await loadNewDataNames();
  if (current.some(n => n.toLowerCase() === trimmed.toLowerCase())) return;
  const updated = [...current, trimmed];
  await fs.writeFile(FILE_PATH, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');
  cache = updated;
}

export async function removeNewDataName(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return;
  const current = await loadNewDataNames();
  const key = trimmed.toLowerCase();
  const updated = current.filter(n => n.toLowerCase() !== key);
  if (updated.length === current.length) return;
  await fs.writeFile(FILE_PATH, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');
  cache = updated;
}
