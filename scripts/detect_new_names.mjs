#!/usr/bin/env node
/**
 * Detects instructors that appeared in a freshly generated office_hours.json
 * but were absent from the previously committed version, and appends them to
 * data/new_data_names.json so they render as NEW DATA.
 *
 * Usage:
 *   node scripts/detect_new_names.mjs                 # old = git HEAD, new = data/office_hours.json
 *   node scripts/detect_new_names.mjs old.json new.json
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { diffNewNames, mergeNames } from '../lib/newNameDiff.js';

const REPO_ROOT = process.cwd();
const DATA_RELPATH = path.join('data', 'office_hours.json');
const DATA_GIT_PATH = DATA_RELPATH.split(path.sep).join('/');
const NAMES_PATH = path.join(REPO_ROOT, 'data', 'new_data_names.json');

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const cleaned = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
  const parsed = JSON.parse(cleaned || '[]');
  return Array.isArray(parsed) ? parsed : [];
}

function readCommittedRows() {
  try {
    const raw = execFileSync('git', ['show', `HEAD:${DATA_GIT_PATH}`], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024
    });
    const parsed = JSON.parse(raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return null;
  }
}

async function main() {
  const [, , oldArg, newArg] = process.argv;
  const newPath = newArg ? path.resolve(newArg) : path.join(REPO_ROOT, DATA_RELPATH);

  const newRows = await readJson(newPath);
  const oldRows = oldArg ? await readJson(path.resolve(oldArg)) : readCommittedRows();

  if (!oldRows) {
    console.log('No committed office_hours.json found — skipping NEW-name detection.');
    return;
  }

  const appeared = diffNewNames(oldRows, newRows);
  if (appeared.length === 0) {
    console.log('No newly appeared instructor names detected.');
    return;
  }

  const existing = await readJson(NAMES_PATH);
  const { names, added } = mergeNames(existing, appeared);

  if (added.length === 0) {
    console.log('Newly appeared names are already tagged as NEW DATA.');
    return;
  }

  await fs.writeFile(NAMES_PATH, `${JSON.stringify(names, null, 2)}\n`, 'utf8');

  console.log(`Tagged ${added.length} instructor(s) as NEW DATA:`);
  for (const name of added) console.log(`  + ${name}`);
}

main().catch((error) => {
  console.error('detect_new_names failed:', error?.message || error);
  process.exitCode = 1;
});
