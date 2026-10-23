'use strict';

/**
 * Tiny in-memory conversation memory.
 *
 * This makes pronoun follow-ups ("what is his email?") reliable in a normal
 * single-instance deployment. Clients also send `lastProfessor` as a fallback
 * for serverless or cold-start situations.
 */

const TTL_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 500;

const store = new Map();

function prune(now = Date.now()) {
  for (const [key, value] of store) {
    if (now - value.updatedAt > TTL_MS) store.delete(key);
  }

  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    store.delete(oldest);
  }
}

function rememberConversation(conversationId, patch = {}) {
  const id = String(conversationId || '').trim();
  if (!id) return null;

  prune();
  const previous = store.get(id) || {};
  const next = {
    ...previous,
    ...patch,
    updatedAt: Date.now()
  };

  store.set(id, next);
  return next;
}

function recallConversation(conversationId) {
  const id = String(conversationId || '').trim();
  if (!id) return null;

  const value = store.get(id);
  if (!value) return null;
  if (Date.now() - value.updatedAt > TTL_MS) {
    store.delete(id);
    return null;
  }

  return value;
}

function resetConversations() {
  store.clear();
}

module.exports = {
  TTL_MS,
  rememberConversation,
  recallConversation,
  resetConversations
};
