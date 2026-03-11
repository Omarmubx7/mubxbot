import { NextResponse } from 'next/server';
import { recordHeartbeat } from '../../../lib/presence.js';

/**
 * POST /api/presence
 * Body: { sessionId: string }
 * Records a heartbeat for the calling browser tab so the admin can see
 * how many devices are actively using the bot.
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = String(body?.sessionId ?? '').trim();
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }
    recordHeartbeat(sessionId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
