import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { notifyFeedbackSubmission } from '../../../lib/notifications';

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

async function ensureUserFeedbackTable() {
  return withDb(async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_feedback (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL CHECK (category IN ('missing_name', 'general')),
        message TEXT,
        missing_name TEXT,
        user_query TEXT,
        request_label TEXT,
        conversation_id TEXT,
        user_id TEXT,
        source_path TEXT,
        source TEXT NOT NULL DEFAULT 'chat',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query('CREATE INDEX IF NOT EXISTS idx_user_feedback_category ON user_feedback (category)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback (created_at)');
  });
}

async function ensureLegacyConversation(client, conversationId, userId) {
  if (!conversationId) return;

  await client.query(
    `
      INSERT INTO conversations (id, user_id, started_at, environment)
      VALUES ($1, $2, NOW(), 'prod')
      ON CONFLICT (id) DO NOTHING
    `,
    [conversationId, userId || null]
  );
}

function buildLegacyReason(record) {
  return JSON.stringify({
    category: record.category,
    message: record.message || '',
    missing_name: record.missing_name || null,
    user_query: record.user_query || null,
    request_label: record.request_label || null,
    source_path: record.source_path || null,
    source: record.source || 'chat'
  });
}

async function insertLegacyFeedbackEvent(record) {
  return withDb(async (client) => {
    await ensureLegacyConversation(client, record.conversation_id, record.user_id);

    await client.query(
      `
        INSERT INTO feedback_events (id, conversation_id, message_id, feedback, reason)
        VALUES ($1, $2, NULL, 'down', $3)
      `,
      [record.id, record.conversation_id, buildLegacyReason(record)]
    );

    return {
      id: record.id,
      category: record.category,
      message: record.message,
      missing_name: record.missing_name,
      user_query: record.user_query,
      request_label: record.request_label,
      conversation_id: record.conversation_id,
      user_id: record.user_id,
      source_path: record.source_path,
      source: record.source,
      created_at: new Date().toISOString(),
      storage: 'feedback_events'
    };
  });
}

async function tryPersistToDb(record) {
  if (!DATABASE_URL) return null;

  try {
    return await insertDbRecord(record);
  } catch (error) {
    if (error?.code !== '42P01' && error?.code !== '42703') {
      throw error;
    }
  }

  try {
    await ensureUserFeedbackTable();
    return await insertDbRecord(record);
  } catch (error) {
    console.warn('user_feedback bootstrap failed; trying legacy fallback', error?.code || error?.message || error);
  }

  try {
    if (record.conversation_id) {
      return await insertLegacyFeedbackEvent(record);
    }
  } catch (error) {
    console.warn('legacy feedback_events insert failed; trying file fallback', error?.code || error?.message || error);
  }

  return null;
}

export async function POST(req) {
  try {
    const payload = await req.json();
    const normalized = normalizePayload(payload);

    if (normalized.error) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }

    const record = normalized.value;

    const dbCreated = await tryPersistToDb(record);
    const createdRecord = dbCreated || null;

    let responseRecord = createdRecord;
    if (!responseRecord) {
      try {
        const rows = await readFileRows();
        responseRecord = { ...record, id: record.id || String(Date.now()) };
        await writeFileRows([responseRecord, ...rows]);
      } catch (fileError) {
        if (fileError?.code === 'EROFS' || fileError?.code === 'EPERM') {
          return NextResponse.json(
            { error: 'Feedback storage is not writable in this deployment. Please enable DB table user_feedback.' },
            { status: 503 }
          );
        }
        throw fileError;
      }
    }

    notifyFeedbackSubmission(responseRecord).catch((error) => {
      console.warn('feedback notification email failed', error?.message || error);
    });

    return NextResponse.json(responseRecord, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to submit feedback', details: error.message },
      { status: 500 }
    );
  }
}