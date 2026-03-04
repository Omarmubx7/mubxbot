import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { isAdminAuthenticated } from '../../../../lib/auth';

const DATA_PATH = path.join(process.cwd(), 'public', 'doctors.json');

async function readData() {
  const raw = await fs.readFile(DATA_PATH, 'utf8');
  return JSON.parse(raw || '[]');
}

async function writeData(data) {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

export async function POST(req) {
  if (!isAdminAuthenticated(req)) return new NextResponse('Unauthorized', { status: 401 });
  const body = await req.json();
  const data = await readData();
  data.push(body);
  await writeData(data);
  return NextResponse.json({ ok: true, data }, { status: 201 });
}

export async function PUT(req) {
  if (!isAdminAuthenticated(req)) return new NextResponse('Unauthorized', { status: 401 });
  const body = await req.json();
  if (!body?.name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const data = await readData();
  const idx = data.findIndex(d => d.name === body.name);
  if (idx === -1) return NextResponse.json({ error: 'not found' }, { status: 404 });
  data[idx] = body;
  await writeData(data);
  return NextResponse.json({ ok: true, data });
}

export async function DELETE(req) {
  if (!isAdminAuthenticated(req)) return new NextResponse('Unauthorized', { status: 401 });
  const body = await req.json();
  if (!body?.name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const data = await readData();
  const filtered = data.filter(d => d.name !== body.name);
  await writeData(filtered);
  return NextResponse.json({ ok: true, data: filtered });
}
