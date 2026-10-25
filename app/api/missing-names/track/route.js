import { NextResponse } from 'next/server';
import { upsertSearch } from '../../../../lib/missingNameMetrics.js';

export const dynamic = 'force-dynamic';

const HOT_SEARCH_THRESHOLD = Number(process.env.MISSING_NAME_HOT_THRESHOLD || 3);
const ipHits = new Map();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 30;

function clientIp(req) {
  const fwd = req.headers.get('x-forwarded-for') || '';
  return fwd.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

function rateLimited(req) {
  const ip = clientIp(req);
  const now = Date.now();
  const hits = (ipHits.get(ip) || []).filter(t => t > now - WINDOW_MS);
  ipHits.set(ip, hits);
  if (hits.length >= MAX_PER_WINDOW) return true;
  ipHits.set(ip, [...hits, now]);
  return false;
}

export async function POST(req) {
  if (rateLimited(req)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
  } catch (error) {
    console.warn('missing-name track failed', error?.message || error);
    return NextResponse.json({ error: 'Failed to track name' }, { status: 500 });
  }
}
