/**
 * In-memory presence store.
 * A browser tab is "online" as long as it has sent a heartbeat within PRESENCE_TTL_MS.
 * The store resets on server restart (same trade-off as the in-memory chatMetricsStore).
 */
const PRESENCE_TTL_MS = 2 * 60 * 1000; // 2 minutes

/** Map<sessionId, lastSeenAt (ms timestamp)> */
const activeSessions = new Map();

function cleanupSessions() {
  const now = Date.now();
  for (const [id, ts] of activeSessions) {
    if (now - ts > PRESENCE_TTL_MS) activeSessions.delete(id);
  }
}

/**
 * Record a heartbeat for the given session ID.
 * Called by POST /api/presence.
 */
export function recordHeartbeat(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') return;
  // Clamp key length to prevent excessively long keys
  activeSessions.set(sessionId.slice(0, 128), Date.now());
  cleanupSessions();
}

/**
 * Return the current count of sessions that have heartbeated recently.
 * Called by GET /api/admin/overview.
 */
export function getOnlineCount() {
  cleanupSessions();
  return activeSessions.size;
}
