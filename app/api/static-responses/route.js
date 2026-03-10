import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const { Client } = pg;
const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';
const FILE_PATH = path.join(process.cwd(), 'data', 'static_responses.json');

async function readFileRows() {
  const raw = await fs.readFile(FILE_PATH, 'utf8').catch(() => '[]');
  const parsed = JSON.parse(raw || '[]');
  return Array.isArray(parsed) ? parsed : [];
}

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

export async function GET() {
  try {
    if (DATABASE_URL) {
      const rows = await withDb(async (client) => {
        const result = await client.query(
          `
            SELECT id, trigger, response, audience, is_active
            FROM bot_static_responses
            WHERE is_active = true
            ORDER BY id DESC
          `
        );
        return result.rows;
      });
      return NextResponse.json(rows);
    }

    const rows = await readFileRows();
    return NextResponse.json(rows.filter((row) => row.is_active !== false));
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load public static responses', details: error.message }, { status: 500 });
  }
}
