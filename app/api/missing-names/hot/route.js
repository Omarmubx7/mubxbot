import { NextResponse } from 'next/server';
import { getHotMissing, getAllMissingNameMetrics } from '../../../../lib/missingNameMetrics.js';
import { normalizeNameKey } from '../../../../lib/names';

export const dynamic = 'force-dynamic';

const HOT_SEARCH_THRESHOLD = Number(process.env.MISSING_NAME_HOT_THRESHOLD || 3);

function fuzzyScore(queryKey, targetKey) {
  if (!queryKey || !targetKey) return 0;
  if (queryKey === targetKey) return 1;
  if (targetKey.includes(queryKey) || queryKey.includes(targetKey)) return 0.85;

  const queryTokens = new Set(queryKey.split(' ').filter(Boolean));
  const targetTokens = targetKey.split(' ').filter(Boolean);
  if (!queryTokens.size || !targetTokens.length) return 0;

  let hits = 0;
  for (const token of targetTokens) {
    if (queryTokens.has(token)) hits += 1;
  }
  return hits / targetTokens.length;
}

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const query = String(url.searchParams.get('q') || '').trim();
    const limit = Math.min(50, Math.max(1, Number.parseInt(url.searchParams.get('limit') || '20', 10) || 20));

    return NextResponse.json({
      hotMissing: [],
      threshold: HOT_SEARCH_THRESHOLD,
      generatedAt: new Date().toISOString()
    }, { status: 200 });
  } catch (error) {
    console.warn('missing-names hot lookup failed', error?.message || error);
    return NextResponse.json({ error: 'Failed to load hot names' }, { status: 500 });
  }
}
