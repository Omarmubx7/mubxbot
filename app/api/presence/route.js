import { NextResponse } from 'next/server';
import { recordHeartbeat } from '../../../lib/presence.js';
import { heartbeat, isLiveChatEnabled } from '../../../lib/liveSessions.js';

/**
 * POST /api/presence
 * Body: { sessionId, conversationId?, userId?, path?, ackIds? }
 *
 * Records a heartbeat for the calling browser tab. Beyond the simple online
 * count, this registers the tab in the live_sessions table and returns any
 * operator messages queued for it by the admin "Live Chat" console. The
 * client renders them and acks on the next beat.
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = String(body?.sessionId ?? '').trim();
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    // In-memory online counter (fast path, unchanged behaviour).
    recordHeartbeat(sessionId);

    if (!isLiveChatEnabled()) {
      return NextResponse.json({ ok: true, messages: [], takeover: false });
    }

    const result = await heartbeat({
      sessionId,
      conversationId: body?.conversationId,
      userId: body?.userId,
      path: body?.path,
      userAgent: req.headers.get('user-agent') || '',
      ackIds: body?.ackIds,
      req
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
