import crypto from 'node:crypto';
import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';
const { Client } = pg;

// A session is considered "live" if it heartbeated within this window.
// The client pings every few seconds; the window leaves room for a couple
// of missed beats and brief tab throttling.
export const LIVE_WINDOW_MS = 5 * 60 * 1000;

let tablesReady = null;

function sslConfig() {
  return process.env.PGSSL_MODE === 'disable'
    ? false
    : { rejectUnauthorized: true, ...(process.env.SSL_ROOT_CERT ? { ca: process.env.SSL_ROOT_CERT } : {}) };
}

async function withDb(fn) {
  const client = new Client({ connectionString: DATABASE_URL, ssl: sslConfig() });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function ensureTables() {
  if (!tablesReady) {
    tablesReady = withDb(async (client) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS live_sessions (
          session_id TEXT PRIMARY KEY,
          conversation_id TEXT,
          user_id TEXT,
          label TEXT,
          last_path TEXT,
          user_agent TEXT,
          ip_address TEXT,
          ip_hash TEXT,
          takeover BOOLEAN NOT NULL DEFAULT false,
          started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await client.query('ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS ip_address TEXT');
      await client.query('ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS ip_hash TEXT');
      await client.query('CREATE INDEX IF NOT EXISTS idx_live_sessions_ip ON live_sessions (ip_hash)');
      await client.query(`
        CREATE TABLE IF NOT EXISTS session_inbox (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          conversation_id TEXT,
          sender TEXT NOT NULL DEFAULT 'operator',
          text TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          delivered_at TIMESTAMPTZ
        )
      `);
    }).catch((error) => {
      tablesReady = null;
      throw error;
    });
  }
  return tablesReady;
}

export function isLiveChatEnabled() {
  return Boolean(DATABASE_URL);
}

function hashIp(ip) {
  if (!ip) return null;
  try {
    return crypto.createHash('sha256').update(String(ip)).digest('hex').slice(0, 16);
  } catch {
    return null;
  }
}

function getClientIp(req) {
  if (!req) return null;
  try {
    const fwd = req.headers?.get?.('x-forwarded-for') || req.headers?.['x-forwarded-for'] || '';
    if (typeof fwd === 'string' && fwd) {
      return fwd.split(',')[0]?.trim();
    }
    const real = req.headers?.get?.('x-real-ip') || req.headers?.['x-real-ip'];
    if (real) return String(real).trim();
    const cf = req.headers?.get?.('cf-connecting-ip') || req.headers?.['cf-connecting-ip'];
    if (cf) return String(cf).trim();
  } catch {}
  return null;
}

/**
 * Records a heartbeat and returns the session row plus any undelivered
 * operator messages. `ackIds` are marked delivered first so a message is
 * rendered once even across multiple polls.
 */
export async function heartbeat({
  sessionId,
  conversationId = null,
  userId = null,
  path = null,
  userAgent = null,
  ackIds = [],
  ipAddress = null,
  req = null
} = {}) {
  const id = String(sessionId || '').trim().slice(0, 128);
  if (!DATABASE_URL || !id) {
    return { ok: false, messages: [], takeover: false };
  }

  const convId = conversationId ? String(conversationId).slice(0, 128) : null;
  const clientIp = ipAddress || getClientIp(req);
  const ipH = hashIp(clientIp);

  try {
    await ensureTables();
    return await withDb(async (client) => {
      await client.query(
        `INSERT INTO live_sessions (session_id, conversation_id, user_id, last_path, user_agent, ip_address, ip_hash, last_seen_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (session_id) DO UPDATE SET
           conversation_id = COALESCE(EXCLUDED.conversation_id, live_sessions.conversation_id),
           user_id = COALESCE(EXCLUDED.user_id, live_sessions.user_id),
           last_path = COALESCE(EXCLUDED.last_path, live_sessions.last_path),
           user_agent = COALESCE(EXCLUDED.user_agent, live_sessions.user_agent),
           ip_address = COALESCE(EXCLUDED.ip_address, live_sessions.ip_address),
           ip_hash = COALESCE(EXCLUDED.ip_hash, live_sessions.ip_hash),
           last_seen_at = NOW()`,
        [id, convId, userId ? String(userId).slice(0, 128) : null,
          path ? String(path).slice(0, 300) : null,
          userAgent ? String(userAgent).slice(0, 300) : null,
          clientIp ? String(clientIp).slice(0, 45) : null,
          ipH]
      );

      const acks = (Array.isArray(ackIds) ? ackIds : []).map(v => String(v || '').trim()).filter(Boolean);
      if (acks.length > 0) {
        await client.query(
          `UPDATE session_inbox SET delivered_at = NOW()
           WHERE session_id = $1 AND delivered_at IS NULL AND id = ANY($2::text[])`,
          [id, acks]
        );
      }

      const { rows: pending } = await client.query(
        `SELECT id, text, sender, created_at
         FROM session_inbox
         WHERE session_id = $1 AND delivered_at IS NULL
         ORDER BY created_at ASC
         LIMIT 20`,
        [id]
      );

      const { rows: session } = await client.query(
        'SELECT takeover FROM live_sessions WHERE session_id = $1',
        [id]
      );

      return {
        ok: true,
        takeover: Boolean(session[0]?.takeover),
        messages: pending.map(r => ({ id: r.id, text: r.text, sender: r.sender, createdAt: r.created_at }))
      };
    });
  } catch (error) {
    console.error('liveSessions.heartbeat failed', error?.message || error);
    return { ok: false, messages: [], takeover: false };
  }
}

export async function listLiveSessions({ windowMs = LIVE_WINDOW_MS } = {}) {
  if (!DATABASE_URL) return [];

  try {
    await ensureTables();
    const cutoff = new Date(Date.now() - windowMs);
    const { rows } = await withDb(async (client) => client.query(
      `SELECT
         s.session_id,
         s.conversation_id,
         s.user_id,
         s.label,
         s.last_path,
         s.user_agent,
         s.ip_address,
         s.ip_hash,
         s.takeover,
         s.started_at,
         s.last_seen_at,
         COALESCE(m.message_count, 0) AS message_count
       FROM live_sessions s
       LEFT JOIN (
         SELECT conversation_id, COUNT(*) AS message_count
         FROM messages
         GROUP BY conversation_id
       ) m ON m.conversation_id = s.conversation_id
       WHERE s.last_seen_at > $1
       ORDER BY s.last_seen_at DESC
       LIMIT 200`,
      [cutoff]
    ));
    return rows.map(r => ({
      sessionId: r.session_id,
      conversationId: r.conversation_id,
      userId: r.user_id,
      label: r.label,
      lastPath: r.last_path,
      userAgent: r.user_agent,
      ipAddress: r.ip_address,
      ipHash: r.ip_hash,
      takeover: Boolean(r.takeover),
      startedAt: r.started_at,
      lastSeenAt: r.last_seen_at,
      messageCount: Number(r.message_count || 0)
    }));
  } catch (error) {
    console.error('liveSessions.listLiveSessions failed', error?.message || error);
    return [];
  }
}

export async function getSession(sessionId) {
  if (!DATABASE_URL) return null;
  const id = String(sessionId || '').trim();
  if (!id) return null;

  try {
    await ensureTables();
    const { rows } = await withDb(async (client) => client.query(
      'SELECT * FROM live_sessions WHERE session_id = $1',
      [id]
    ));
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      sessionId: r.session_id,
      conversationId: r.conversation_id,
      userId: r.user_id,
      label: r.label,
      lastPath: r.last_path,
      userAgent: r.user_agent,
      takeover: Boolean(r.takeover),
      startedAt: r.started_at,
      lastSeenAt: r.last_seen_at
    };
  } catch (error) {
    console.error('liveSessions.getSession failed', error?.message || error);
    return null;
  }
}

export async function setTakeover(sessionId, takeover) {
  if (!DATABASE_URL) return false;
  const id = String(sessionId || '').trim();
  if (!id) return false;

  try {
    await ensureTables();
    const { rowCount } = await withDb(async (client) => client.query(
      'UPDATE live_sessions SET takeover = $2 WHERE session_id = $1',
      [id, Boolean(takeover)]
    ));
    return rowCount > 0;
  } catch (error) {
    console.error('liveSessions.setTakeover failed', error?.message || error);
    return false;
  }
}

/**
 * True when the conversation belongs to a live session currently under
 * admin takeover. Used by /api/chat to pause automatic bot replies.
 */
export async function isUnderTakeover(conversationId) {
  if (!DATABASE_URL || !conversationId) return false;
  try {
    await ensureTables();
    const cutoff = new Date(Date.now() - LIVE_WINDOW_MS);
    const { rows } = await withDb(async (client) => client.query(
      `SELECT 1 FROM live_sessions
       WHERE conversation_id = $1 AND takeover = true AND last_seen_at > $2
       LIMIT 1`,
      [String(conversationId), cutoff]
    ));
    return rows.length > 0;
  } catch {
    return false;
  }
}

export async function enqueueOperatorMessage({ sessionId, conversationId = null, text, sender = 'operator' }) {
  const id = String(sessionId || '').trim();
  const body = String(text || '').trim();
  if (!DATABASE_URL || !id || !body) return null;

  try {
    await ensureTables();
    const messageId = crypto.randomUUID();
    const convId = conversationId ? String(conversationId) : null;
    const environment = process.env.NODE_ENV === 'production' ? 'prod' : 'staging';

    return await withDb(async (client) => {
      // Make sure the conversation row exists so the message insert (FK) works
      // even if the visitor hasn't sent anything yet.
      if (convId) {
        await client.query(
          `INSERT INTO conversations (id, started_at, environment)
           VALUES ($1, NOW(), $2)
           ON CONFLICT (id) DO NOTHING`,
          [convId, environment]
        );
      }

      const { rows } = await client.query(
        `INSERT INTO session_inbox (id, session_id, conversation_id, sender, text)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, text, sender, created_at`,
        [messageId, id, convId, sender, body]
      );

      // Mirror into the analytics transcript so operators can see their own
      // replies in the conversation view and history.
      if (convId) {
        await client.query(
          `INSERT INTO messages (id, conversation_id, sender, text, tags)
           VALUES ($1, $2, 'bot', $3, $4::jsonb)`,
          [crypto.randomUUID(), convId, body, JSON.stringify({ operator: true, operatorSession: id })]
        );
        await client.query(
          'UPDATE conversations SET message_count = message_count + 1 WHERE id = $1',
          [convId]
        );
      }

      const r = rows[0];
      return { id: r.id, text: r.text, sender: r.sender, createdAt: r.created_at };
    });
  } catch (error) {
    console.error('liveSessions.enqueueOperatorMessage failed', error?.message || error);
    return null;
  }
}

/**
 * Recent transcript for a session's conversation, newest last.
 */
export async function getTranscript(conversationId, { limit = 50 } = {}) {
  if (!DATABASE_URL || !conversationId) return [];
  try {
    const { rows } = await withDb(async (client) => client.query(
      `SELECT id, sender, text, created_at, tags
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [String(conversationId), Math.min(Math.max(Number(limit) || 50, 1), 200)]
    ));
    return rows.reverse().map(r => ({
      id: r.id,
      sender: r.sender,
      text: r.text,
      createdAt: r.created_at,
      tags: r.tags
    }));
  } catch (error) {
    console.error('liveSessions.getTranscript failed', error?.message || error);
    return [];
  }
}
