// Non-blocking analytics logging queue to avoid blocking chat responses
// Logs are queued and flushed asynchronously

import pg from 'pg';

const { Client } = pg;
const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';

const BATCH_SIZE = 25;
const FLUSH_INTERVAL_MS = 2000;

let queue = [];
let flushTimer = null;

export function queueAnalyticsLog(type, data) {
  if (!DATABASE_URL) return;
  
  queue.push({ type, data, timestamp: Date.now() });
  
  if (queue.length >= BATCH_SIZE) {
    flushQueue();
  } else if (!flushTimer) {
    flushTimer = setTimeout(flushQueue, FLUSH_INTERVAL_MS);
  }
}

async function flushQueue() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (queue.length === 0) return;

  const itemsToFlush = queue.splice(0, BATCH_SIZE);
  
  // Process asynchronously without blocking
  setImmediate(async () => {
    const client = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    try {
      await client.connect();

      for (const item of itemsToFlush) {
        try {
          if (item.type === 'conversation') {
            await client.query(
              `INSERT INTO conversations (id, user_id, started_at, environment)
               VALUES ($1, $2, NOW(), $3)
               ON CONFLICT (id) DO UPDATE SET user_id = COALESCE(conversations.user_id, EXCLUDED.user_id)`,
              [item.data.conversationId, item.data.userId || null, item.data.environment]
            );
          } else if (item.type === 'message') {
            await client.query(
              `INSERT INTO messages (id, conversation_id, sender, text, is_error_trigger, tags)
               VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
              [item.data.id, item.data.conversationId, item.data.sender, item.data.text, item.data.isErrorTrigger, JSON.stringify(item.data.tags)]
            );
          } else if (item.type === 'search') {
            await client.query(
              `INSERT INTO search_events (id, conversation_id, user_id, search_type, query, normalized_name, result_count, success, environment)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [item.data.id, item.data.conversationId, item.data.userId, item.data.searchType, item.data.query, item.data.normalizedName, item.data.resultCount, item.data.success, item.data.environment]
            );
          } else if (item.type === 'error') {
            await client.query(
              `INSERT INTO error_events (id, conversation_id, message_id, user_id, error_type, trigger_source, user_text_at_error, bot_reply_snippet, environment)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [item.data.id, item.data.conversationId, item.data.messageId, item.data.userId, item.data.errorType, item.data.triggerSource, item.data.userTextAtError, item.data.botReplySnippet, item.data.environment]
            );
          } else if (item.type === 'performance') {
            await client.query(
              `INSERT INTO performance_events (id, conversation_id, total_latency_ms, model_latency_ms, environment)
               VALUES ($1, $2, $3, $4, $5)`,
              [item.data.id, item.data.conversationId, item.data.totalLatencyMs, item.data.modelLatencyMs, item.data.environment]
            );
          }
        } catch (err) {
          console.warn(`Analytics flush error for ${item.type}:`, err.message);
        }
      }
    } finally {
      await client.end();
    }
  });
}

// Flush on graceful shutdown
if (typeof process !== 'undefined') {
  process.on('SIGTERM', flushQueue);
  process.on('SIGINT', flushQueue);
}
