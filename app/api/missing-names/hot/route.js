import { NextResponse } from 'next/server';
import { getHotMissing } from '../../../../lib/missingNameMetrics.js';

export const dynamic = 'force-dynamic';

const HOT_SEARCH_THRESHOLD = Number(process.env.MISSING_NAME_HOT_THRESHOLD || 3);

/**
 * GET /api/missing-names/hot?q=&limit=
 * Returns the instructors students keep searching for without a result,
 * ranked by how often they come up. Used for hot-list surfaces.
 */
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const query = String(url.searchParams.get('q') || '').trim().toLowerCase();
    const limit = Math.min(50, Math.max(1, Number.parseInt(url.searchParams.get('limit') || '20', 10) || 20));

    const hot = await getHotMissing({ limit, minSearch: HOT_SEARCH_THRESHOLD });
    const hotMissing = hot
      .map((record) => {
        const name = String(record.display_name || record.name_norm || '').trim();
        const searchCount = Number(record.search_count) || 0;
        return {
          name,
          searchCount,
          reportCount: Number(record.report_count) || 0,
          isHot: searchCount >= HOT_SEARCH_THRESHOLD,
          resolved: (record.status || 'reported') === 'resolved',
          lastSeen: record.last_searched_at || record.last_reported_at || null
        };
      })
      .filter((item) => item.name && (!query || item.name.toLowerCase().includes(query)));

    return NextResponse.json({
      hotMissing,
      threshold: HOT_SEARCH_THRESHOLD,
      generatedAt: new Date().toISOString()
    }, { status: 200 });
  } catch (error) {
    console.warn('missing-names hot lookup failed', error?.message || error);
    return NextResponse.json({ error: 'Failed to load hot names' }, { status: 500 });
  }
}
