import { recordHeartbeat } from '../../../../lib/presence.js';
import { heartbeat, isLiveChatEnabled } from '../../../../lib/liveSessions.js';

export const dynamic = 'force-dynamic';

// How often the server checks for new operator work. The client is woken up
// immediately on a change instead of waiting for its own poll interval.
const POLL_MS = 1000;
const KEEP_ALIVE_MS = 15000;

/**
 * GET /api/presence/stream?sessionId=&conversationId=&userId=&path=
 *
 * Server-sent events channel for the chat tab. Each tick reuses the regular
 * presence heartbeat (so the visitor stays online in the admin console) and
 * emits an event only when something changed: a queued operator reply or a
 * takeover flip. The client reacts by running its normal /api/presence tick,
 * which owns message acknowledgement — the stream is only the wake-up call.
 *
 * The client falls back to plain polling if this endpoint is unavailable.
 */
export async function GET(req) {
  const url = new URL(req.url);
  const sessionId = String(url.searchParams.get('sessionId') || '').trim();
  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'sessionId required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!isLiveChatEnabled()) {
    return new Response(JSON.stringify({ error: 'live chat disabled' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const heartbeatArgs = {
    sessionId,
    conversationId: url.searchParams.get('conversationId') || '',
    userId: url.searchParams.get('userId') || '',
    path: url.searchParams.get('path') || '/',
    userAgent: req.headers.get('user-agent') || '',
    req
  };

  const encoder = new TextEncoder();
  let closed = false;
  let pollTimer = null;
  let keepAliveTimer = null;

  const cleanup = () => {
    closed = true;
    if (pollTimer) globalThis.clearInterval(pollTimer);
    if (keepAliveTimer) globalThis.clearInterval(keepAliveTimer);
    pollTimer = null;
    keepAliveTimer = null;
  };

  const stream = new ReadableStream({
    start(controller) {
      let lastTakeover = false;
      let lastError = null;

      const send = (payload) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          cleanup();
        }
      };

      const run = async () => {
        if (closed) return;
        try {
          recordHeartbeat(sessionId);
          const result = await heartbeat(heartbeatArgs);
          const pending = Array.isArray(result?.messages) ? result.messages.length : 0;
          const takeover = Boolean(result?.takeover);
          const error = result?.ok === false ? 'Live channel unavailable' : null;

          const changed = error !== lastError || takeover !== lastTakeover || pending > 0;
          lastError = error;
          lastTakeover = takeover;
          if (changed) send({ pending, takeover, error });
        } catch {
          if (lastError !== 'Live channel unavailable') {
            lastError = 'Live channel unavailable';
            send({ pending: 0, takeover: lastTakeover, error: lastError });
          }
        }
      };

      // First frame tells the client to sweep for anything it missed.
      send({ pending: 0, takeover: false, error: null, initial: true });
      void run();

      pollTimer = globalThis.setInterval(() => { void run(); }, POLL_MS);
      keepAliveTimer = globalThis.setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          cleanup();
        }
      }, KEEP_ALIVE_MS);

      const onAbort = () => {
        cleanup();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      if (req.signal) {
        if (req.signal.aborted) onAbort();
        else req.signal.addEventListener('abort', onAbort, { once: true });
      }
    },
    cancel() {
      cleanup();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}
