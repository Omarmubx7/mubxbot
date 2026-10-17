import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '../../../../lib/adminAuth.js';
import { listLiveSessions, isLiveChatEnabled } from '../../../../lib/liveSessions.js';

function unauthorized(req) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value || '';
  return !verifyAdminSessionToken(token);
}

/**
 * GET /api/admin/live
 * Returns the sessions currently using the bot (heartbeated in the last
 * LIVE_WINDOW_MS) so the admin console can show who is online.
 */
export async function GET(req) {
  if (unauthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isLiveChatEnabled()) {
    return NextResponse.json({ sessions: [], enabled: false });
  }

  const sessions = await listLiveSessions();
  return NextResponse.json({ sessions, enabled: true });
}
