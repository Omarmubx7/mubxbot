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

    if (query) {
      const queryKey = normalizeNameKey(query);
      if (!queryKey) {
        return NextResponse.json({ hotMissing: [], matched: null, threshold: HOT_SEARCH_THRESHOLD }, { status: 200 });
      }

      const all = await getAllMissingNameMetrics();
      let best = null;
      for (const row of all) {
        const status = row.status || 'reported';
        if (status === 'resolved' || status === 'ignored') continue;
        const score = fuzzyScore(queryKey, row.name_norm);
        if (score < 0.6) continue;
        const searchCount = Number(row.search_count) || 0;
        const reportCount = Number(row.report_count) || 0;
        const candidate = {
          name: row.display_name || row.name_norm,
          nameKey: row.name_norm,
          searchCount,
          reportCount,
          matchScore: score,
          isHot: searchCount >= HOT_SEARCH_THRESHOLD,
          lastSeen: row.last_searched_at || row.last_reported_at || null
        };
        if (!best || candidate.matchScore > best.matchScore || (candidate.matchScore === best.matchScore && searchCount > best.searchCount)) {
          best = candidate;
        }
      }

      return NextResponse.json({
        hotMissing: best ? [best] : [],
        matched: best,
        threshold: HOT_SEARCH_THRESHOLD,
        generatedAt: new Date().toISOString()
      }, { status: 200 });
    }

    const hotMissing = await getHotMissing({ limit, minSearch: 1, days: 30 });

    return NextResponse.json({
      hotMissing: hotMissing.map(h => ({
        name: h.display_name || h.name_norm,
        nameKey: h.name_norm,
        searchCount: h.search_count || 0,
        reportCount: h.report_count || 0,
        isHot: (h.search_count || 0) >= HOT_SEARCH_THRESHOLD,
        lastSeen: h.last_searched_at || h.last_reported_at || null
      })),
      threshold: HOT_SEARCH_THRESHOLD,
      generatedAt: new Date().toISOString()
    }, { status: 200 });
  } catch (error) {
    console.warn('missing-names hot lookup failed', error?.message || error);
    return NextResponse.json({ error: 'Failed to load hot names' }, { status: 500 });
  }
}
