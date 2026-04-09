import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const { Client } = pg;
const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';
const FILE_PATH = path.join(process.cwd(), 'data', 'feedback_submissions.json');
const ALLOWED_CATEGORIES = new Set(['missing_name', 'general']);

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

async function readFileRows() {
  const raw = await fs.readFile(FILE_PATH, 'utf8').catch(() => '[]');
  const parsed = JSON.parse(raw || '[]');
  return Array.isArray(parsed) ? parsed : [];
}

async function writeFileRows(rows) {
  await fs.writeFile(FILE_PATH, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
}

function normalizePayload(payload) {
  const category = String(payload?.category || 'general').trim().toLowerCase();
  const missingName = String(payload?.missingName || '').trim();
  const message = String(payload?.message || '').trim();

  if (!ALLOWED_CATEGORIES.has(category)) {
    return { error: 'Invalid category' };
  }

  if (category === 'missing_name' && !missingName) {
    return { error: 'Missing name is required for missing-name feedback' };
  }

  if (category === 'general' && !message) {
    return { error: 'Message is required for general feedback' };
  }

  return {
    value: {
      id: crypto.randomUUID(),
      category,
      message,
      missing_name: missingName || null,
      user_query: String(payload?.userQuery || '').trim() || null,
      request_label: String(payload?.requestLabel || '').trim() || null,
      conversation_id: String(payload?.conversationId || '').trim() || null,
      user_id: String(payload?.userId || '').trim() || null,
      source_path: String(payload?.sourcePath || '').trim() || null,
      source: 'chat',
      created_at: new Date().toISOString()
    }
  };
}

async function insertDbRecord(record) {
  return withDb(async (client) => {
    const result = await client.query(
      `
        INSERT INTO user_feedback (
          id,
          category,
          message,
          missing_name,
          user_query,
          request_label,
          conversation_id,
          user_id,
          source_path,
          source
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING id, category, message, missing_name, user_query, request_label, conversation_id, user_id, source_path, source, created_at
      `,
      [
        record.id,
        record.category,
        record.message,
        record.missing_name,
        record.user_query,
        record.request_label,
        record.conversation_id,
        record.user_id,
        record.source_path,
        record.source
      ]
    );

    return result.rows[0];
  });
}

export async function POST(req) {
  try {
    const payload = await req.json();
    const normalized = normalizePayload(payload);

    if (normalized.error) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }

    const record = normalized.value;

    if (DATABASE_URL) {
      try {
        const created = await insertDbRecord(record);
        return NextResponse.json(created, { status: 201 });
      } catch (error) {
        if (error?.code !== '42P01' && error?.code !== '42703') {
          throw error;
        }
        // Fall back to file mode when table/column migration has not been applied yet.
      }
    }

    const rows = await readFileRows();
    const created = { ...record, id: record.id || String(Date.now()) };
    await writeFileRows([created, ...rows]);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to submit feedback', details: error.message },
      { status: 500 }
    );
  }
}