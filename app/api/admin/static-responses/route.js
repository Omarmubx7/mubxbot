import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';
const FILE_PATH = path.join(process.cwd(), 'data', 'static_responses.json');

let sql = null;

function getSql() {
  if (!sql && DATABASE_URL) {
    sql = neon(DATABASE_URL);
  }
  return sql;
}

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

export async function GET() {
  try {
    if (DATABASE_URL) {
      const sqlInstance = getSql();
      if (!sqlInstance) {
        const rows = await readFileRows();
        return NextResponse.json(rows);
      }
      const rows = await sqlInstance`
        SELECT id, trigger, response, audience, is_active, created_at, updated_at
        FROM bot_static_responses
        ORDER BY id DESC
      `;
      return NextResponse.json(rows);
    }

    const rows = await readFileRows();
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load static responses', details: error.message },
      { status: 500 }
    );
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
      const sqlInstance = getSql();
      if (!sqlInstance) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
      }

      const rows = await sqlInstance`
        INSERT INTO bot_static_responses (trigger, response, audience, is_active)
        VALUES (${nextRecord.trigger}, ${nextRecord.response}, ${nextRecord.audience}, ${nextRecord.is_active})
        RETURNING id, trigger, response, audience, is_active, created_at, updated_at
      `;
      return NextResponse.json(rows[0], { status: 201 });
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
    return NextResponse.json(
      { error: 'Failed to create static response', details: error.message },
      { status: 500 }
    );
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
      const sqlInstance = getSql();
      if (!sqlInstance) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
      }

      const rows = await sqlInstance`
        UPDATE bot_static_responses
        SET trigger = ${nextRecord.trigger},
            response = ${nextRecord.response},
            audience = ${nextRecord.audience},
            is_active = ${nextRecord.is_active},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, trigger, response, audience, is_active, created_at, updated_at
      `;

      if (!rows[0]) return NextResponse.json({ error: 'Record not found' }, { status: 404 });
      return NextResponse.json(rows[0]);
    }

    const fileRows = await readFileRows();
    const idx = fileRows.findIndex((row) => Number(row.id) === id);
    if (idx === -1) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

    fileRows[idx] = {
      ...fileRows[idx],
      ...nextRecord,
      updated_at: new Date().toISOString()
    };
    await writeFileRows(fileRows);
    return NextResponse.json(fileRows[idx]);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update static response', details: error.message },
      { status: 500 }
    );
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
      const sqlInstance = getSql();
      if (!sqlInstance) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
      }

      const rows = await sqlInstance`
        DELETE FROM bot_static_responses WHERE id = ${id} RETURNING id
      `;

      if (!rows[0]) return NextResponse.json({ error: 'Record not found' }, { status: 404 });
      return NextResponse.json({ ok: true });
    }

    const fileRows = await readFileRows();
    const nextRows = fileRows.filter((row) => Number(row.id) !== id);
    if (nextRows.length === fileRows.length)
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });

    await writeFileRows(nextRows);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete static response', details: error.message },
      { status: 500 }
    );
  }
}
