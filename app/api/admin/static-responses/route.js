import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const { Client } = pg;
const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';
const FILE_PATH = path.join(process.cwd(), 'data', 'static_responses.json');

function toBool(value, fallback = true) {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

async function readFileRows() {
  const raw = await fs.readFile(FILE_PATH, 'utf8').catch(() => '[]');
  const parsed = JSON.parse(raw || '[]');
  return Array.isArray(parsed) ? parsed : [];
}

async function writeFileRows(rows) {
  await fs.writeFile(FILE_PATH, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') return 'Invalid body';
  if (!String(payload.trigger || '').trim()) return 'Trigger is required';
  if (!String(payload.response || '').trim()) return 'Response is required';
  return null;
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
            SELECT id, trigger, response, audience, is_active, created_at, updated_at
            FROM bot_static_responses
            ORDER BY id DESC
          `
        );
        return result.rows;
      });
      return NextResponse.json(rows);
    }

    const rows = await readFileRows();
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load static responses', details: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const payload = await req.json();
    const invalid = validatePayload(payload);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

    const nextRecord = {
      trigger: String(payload.trigger).trim(),
      response: String(payload.response).trim(),
      audience: String(payload.audience || 'user').trim() || 'user',
      is_active: toBool(payload.is_active, true)
    };

    if (DATABASE_URL) {
      const created = await withDb(async (client) => {
        const result = await client.query(
          `
            INSERT INTO bot_static_responses (trigger, response, audience, is_active)
            VALUES ($1, $2, $3, $4)
            RETURNING id, trigger, response, audience, is_active, created_at, updated_at
          `,
          [nextRecord.trigger, nextRecord.response, nextRecord.audience, nextRecord.is_active]
        );
        return result.rows[0];
      });
      return NextResponse.json(created, { status: 201 });
    }

    const rows = await readFileRows();
    const created = {
      id: Date.now(),
      ...nextRecord,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const nextRows = [created, ...rows];
    await writeFileRows(nextRows);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create static response', details: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const payload = await req.json();
    const id = Number(payload.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Valid id is required' }, { status: 400 });
    }

    const invalid = validatePayload(payload);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

    const nextRecord = {
      trigger: String(payload.trigger).trim(),
      response: String(payload.response).trim(),
      audience: String(payload.audience || 'user').trim() || 'user',
      is_active: toBool(payload.is_active, true)
    };

    if (DATABASE_URL) {
      const updated = await withDb(async (client) => {
        const result = await client.query(
          `
            UPDATE bot_static_responses
            SET trigger = $1,
                response = $2,
                audience = $3,
                is_active = $4,
                updated_at = NOW()
            WHERE id = $5
            RETURNING id, trigger, response, audience, is_active, created_at, updated_at
          `,
          [nextRecord.trigger, nextRecord.response, nextRecord.audience, nextRecord.is_active, id]
        );
        return result.rows[0] || null;
      });

      if (!updated) return NextResponse.json({ error: 'Record not found' }, { status: 404 });
      return NextResponse.json(updated);
    }

    const rows = await readFileRows();
    const idx = rows.findIndex((row) => Number(row.id) === id);
    if (idx === -1) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

    rows[idx] = {
      ...rows[idx],
      ...nextRecord,
      updated_at: new Date().toISOString()
    };
    await writeFileRows(rows);
    return NextResponse.json(rows[idx]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update static response', details: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const payload = await req.json();
    const id = Number(payload.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Valid id is required' }, { status: 400 });
    }

    if (DATABASE_URL) {
      const deleted = await withDb(async (client) => {
        const result = await client.query('DELETE FROM bot_static_responses WHERE id = $1 RETURNING id', [id]);
        return result.rows[0] || null;
      });

      if (!deleted) return NextResponse.json({ error: 'Record not found' }, { status: 404 });
      return NextResponse.json({ ok: true });
    }

    const rows = await readFileRows();
    const nextRows = rows.filter((row) => Number(row.id) !== id);
    if (nextRows.length === rows.length) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

    await writeFileRows(nextRows);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete static response', details: error.message }, { status: 500 });
  }
}
