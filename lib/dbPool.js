// Database connection for Cloudflare Workers via @neondatabase/serverless (HTTP)
// The Neon database stays exactly as-is — zero data loss, no schema changes.
// Only the client library changes from pg (Node.js-only) to neon (edge-safe).
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';

let sql = null;

export function getSql() {
  if (!DATABASE_URL) return null;

  if (!sql) {
    sql = neon(DATABASE_URL);
  }

  return sql;
}

export function hasDatabase() {
  return Boolean(DATABASE_URL);
}

export async function closePool() {
  // neon is HTTP-based, no persistent pool to close
  sql = null;
}
