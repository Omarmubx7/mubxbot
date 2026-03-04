import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'public', 'doctors.json');

export async function GET() {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf8');
    return new NextResponse(raw, { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to read doctors data' }, { status: 500 });
  }
}
