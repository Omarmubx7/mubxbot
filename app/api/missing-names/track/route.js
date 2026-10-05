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
    const payload = await req.json().catch(() => ({}));
    const name = String(payload?.name || '').trim();
    if (!name || name.length > 200) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const record = await upsertSearch(name, { status: 'reported' });
    if (!record) {
      return NextResponse.json({ ok: false, ignored: true }, { status: 200 });
    }

    const searchCount = record.search_count || 0;

    return NextResponse.json({
      ok: true,
      name: record.display_name || name,
      nameKey: record.name_norm,
      searchCount,
      reportCount: record.report_count || 0,
      isHot: searchCount >= HOT_SEARCH_THRESHOLD,
      threshold: HOT_SEARCH_THRESHOLD,
      trackedAt: new Date().toISOString()
    }, { status: 200 });
  } catch (error) {
    console.warn('missing-name track failed', error?.message || error);
    return NextResponse.json({ error: 'Failed to track name' }, { status: 500 });
  }
}
