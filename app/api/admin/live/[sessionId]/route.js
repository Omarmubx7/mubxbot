import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '../../../../../lib/adminAuth.js';
import {
  getSession,
  getTranscript,
  setTakeover,
  enqueueOperatorMessage
} from '../../../../../lib/liveSessions.js';

function unauthorized(req) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value || '';
  return !verifyAdminSessionToken(token);
}

/**
 * GET /api/admin/live/[sessionId]
 * Session detail + recent transcript for that conversation.
 */
export async function GET(req, { params }) {
  if (unauthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionId } = await params;
  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const transcript = session.conversationId
    ? await getTranscript(session.conversationId, { limit: 100 })
    : [];

  return NextResponse.json({ session, transcript });
}

/**
 * POST /api/admin/live/[sessionId]
 * Body: { text }
 * Queues an operator message that the target tab will render as a bot reply.
 */
export async function POST(req, { params }) {
  if (unauthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionId } = await params;
  const body = await req.json().catch(() => ({}));
  const text = String(body?.text || '').trim();
  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const message = await enqueueOperatorMessage({
    sessionId: session.sessionId,
    conversationId: session.conversationId,
    text
  });

  if (!message) {
    return NextResponse.json({ error: 'Failed to queue message' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message });
}

/**
 * PATCH /api/admin/live/[sessionId]
 * Body: { takeover: boolean }
 * While takeover is on, the bot stops auto-replying to this conversation.
 */
export async function PATCH(req, { params }) {
  if (unauthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionId } = await params;
  const body = await req.json().catch(() => ({}));
  if (typeof body?.takeover !== 'boolean') {
    return NextResponse.json({ error: 'takeover must be a boolean' }, { status: 400 });
  }

  const updated = await setTakeover(sessionId, body.takeover);
  if (!updated) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, takeover: body.takeover });
}
