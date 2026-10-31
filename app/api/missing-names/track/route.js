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

/**
 * POST /api/missing-names/track
 * Body: { name, source? }
 *
 * Records that someone searched for an instructor we do not have, and echoes
 * back whether the name has crossed the "hot" threshold so the chat can prompt
 * for contributions.
 */
export async function POST(req) {
  if (rateLimited(req)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const record = await upsertSearch(name);
    const searchCount = Number(record?.search_count || 0);

    return NextResponse.json({
      ok: true,
      name: String(record?.display_name || name),
      searchCount,
      reportCount: Number(record?.report_count || 0),
      isHot: searchCount >= HOT_SEARCH_THRESHOLD,
      threshold: HOT_SEARCH_THRESHOLD
    }, { status: 200 });
  } catch (error) {
    console.warn('missing-name track failed', error?.message || error);
    return NextResponse.json({ error: 'Failed to track name' }, { status: 500 });
  }
}
