"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { AdminHeader } from '../../../components/AdminHeader.jsx';
import {
  Radio,
  Send,
  RefreshCw,
  UserCheck,
  User,
  Bot,
  MessageSquare,
  Clock,
  AlertTriangle
} from 'lucide-react';

const POLL_MS = 1000;

function timeAgo(value) {
  if (!value) return '—';
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return '—';
  const diff = Math.max(0, Date.now() - ts);
  const secs = Math.round(diff / 1000);
  if (secs < 10) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs}h ago`;
}

function formatClock(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function sessionLabel(session) {
  if (session?.label) return session.label;
  if (session?.ipAddress) {
    const ip = String(session.ipAddress);
    return ip.length > 15 ? `${ip.slice(0, 12)}...` : ip;
  }
  const conv = session?.conversationId || '';
  return conv ? `Visitor ${conv.slice(0, 6)}` : `Visitor ${String(session?.sessionId || '').slice(0, 6)}`;
}

function SessionRow({ session, active, onSelect }) {
  const label = sessionLabel(session);
  return (
    <button
      type="button"
      onClick={() => onSelect(session.sessionId)}
      className={`w-full text-left rounded-2xl border p-2.5 sm:p-3 transition-all duration-200 active:scale-[0.99] ${
        active
          ? 'border-[#DC2626]/40 bg-[#DC2626]/10'
          : 'border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/30 hover:bg-black/[0.03] dark:hover:bg-white/[0.06]'
      }`}
    >
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center font-black text-[14px] sm:text-[15px] shrink-0">
          {label.charAt(0).toUpperCase()}
          <span className="absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500 border-2 border-white dark:border-black" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="font-bold text-[13px] sm:text-[14px] truncate text-[var(--text-primary)]">{label}</span>
            {session.takeover && (
              <span className="shrink-0 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[8px] sm:text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5">
                Live
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-[var(--text-tertiary)]">
            <Clock size={10} className="sm:w-[11px] sm:h-[11px]" />
            <span>{timeAgo(session.lastSeenAt)}</span>
            <span className="opacity-40">•</span>
            <MessageSquare size={10} className="sm:w-[11px] sm:h-[11px]" />
            <span>{session.messageCount} msgs</span>
          </div>
        </div>
      </div>
    </button>
  );
}

SessionRow.propTypes = {
  session: PropTypes.object.isRequired,
  active: PropTypes.bool,
  onSelect: PropTypes.func.isRequired
};

function TranscriptBubble({ message }) {
  const isUser = message.sender === 'user';
  const isOperator = Boolean(message.tags?.operator) || message.sender === 'operator';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-[#DC2626] text-white rounded-br-md'
            : isOperator
              ? 'bg-amber-500/15 text-[var(--text-primary)] border border-amber-500/30 rounded-bl-md'
              : 'bg-black/5 dark:bg-white/10 text-[var(--text-primary)] rounded-bl-md'
        }`}
      >
        <div className="flex items-center gap-1.5 mb-1 opacity-80">
          {isUser ? <User size={11} /> : isOperator ? <UserCheck size={11} /> : <Bot size={11} />}
          <span className="text-[10px] font-black uppercase tracking-widest">
            {isUser ? 'Visitor' : isOperator ? 'Operator' : 'Bot'}
          </span>
          <span className="text-[10px] font-medium opacity-70">· {formatClock(message.createdAt)}</span>
        </div>
        {message.text}
      </div>
    </div>
  );
}

TranscriptBubble.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.string,
    sender: PropTypes.string,
    text: PropTypes.string,
    createdAt: PropTypes.string,
    tags: PropTypes.object
  }).isRequired
};

export default function AdminLiveChatPage() {
  const [sessions, setSessions] = useState([]);
  const [enabled, setEnabled] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [session, setSession] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const groupedSessions = useMemo(() => {
    const groups = new Map();
    for (const s of sessions) {
      const key = s.ipHash || s.ipAddress || s.sessionId;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          ipAddress: s.ipAddress,
          ipHash: s.ipHash,
          sessions: [],
          lastSeenAt: s.lastSeenAt,
          messageCount: 0,
          takeover: false
        });
      }
      const g = groups.get(key);
      g.sessions.push(s);
      if (new Date(s.lastSeenAt) > new Date(g.lastSeenAt)) g.lastSeenAt = s.lastSeenAt;
      g.messageCount += Number(s.messageCount || 0);
      if (s.takeover) g.takeover = true;
    }
    const result = Array.from(groups.values());
    result.sort((a, b) => new Date(b.lastSeenAt) - new Date(a.lastSeenAt));
    return result;
  }, [sessions]);

  const scrollRef = useRef(null);
  const selectedIdRef = useRef(null);
  selectedIdRef.current = selectedId;

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/live', { cache: 'no-store' });
      if (res.status === 401) {
        globalThis.location.href = '/admin-login';
        return;
      }
      const data = await res.json().catch(() => ({}));
      setEnabled(data?.enabled !== false);
      const list = Array.isArray(data?.sessions) ? data.sessions : [];
      setSessions(list);
      setLoading(false);
      setSelectedId(prev => {
        if (prev && list.some(s => s.sessionId === prev)) return prev;
        // Keep existing selection if possible, otherwise pick most recent
        if (list.length === 0) return null;
        return list[0]?.sessionId || null;
      });
    } catch {
      setLoading(false);
    }
  }, []);

  const loadSession = useCallback(async (sessionId) => {
    if (!sessionId) {
      setSession(null);
      setTranscript([]);
      return;
    }
    try {
      const res = await fetch(`/api/admin/live/${encodeURIComponent(sessionId)}`, { cache: 'no-store' });
      if (res.status === 404) {
        setSession(null);
        setTranscript([]);
        return;
      }
      const data = await res.json().catch(() => ({}));
      setSession(data?.session || null);
      setTranscript(Array.isArray(data?.transcript) ? data.transcript : []);
    } catch {
      // keep previous view on transient errors
    }
  }, []);

  useEffect(() => {
    loadSessions();
    const interval = globalThis.setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadSessions();
      }
    }, POLL_MS);
    return () => globalThis.clearInterval(interval);
  }, [loadSessions]);

  useEffect(() => {
    if (!selectedId) return undefined;
    loadSession(selectedId);
    const interval = globalThis.setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadSession(selectedId);
      }
    }, POLL_MS);
    return () => globalThis.clearInterval(interval);
  }, [selectedId, loadSession]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [transcript]);

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || !selectedId || sending) return;
    setSending(true);
    setError('');
    const optimisticId = `opt-${Date.now()}`;
    setTranscript(prev => [...prev, {
      id: optimisticId,
      sender: 'operator',
      text,
      createdAt: new Date().toISOString(),
      tags: { operator: true }
    }]);
    setDraft('');
    try {
      const res = await fetch(`/api/admin/live/${encodeURIComponent(selectedId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to send');
      }
      await loadSession(selectedId);
      await loadSessions();
    } catch (err) {
      setError(err.message || 'Failed to send');
      setTranscript(prev => prev.filter(m => m.id !== optimisticId));
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  const toggleTakeover = async () => {
    if (!selectedId || !session) return;
    const next = !session.takeover;
    setSession(prev => (prev ? { ...prev, takeover: next } : prev));
    try {
      const res = await fetch(`/api/admin/live/${encodeURIComponent(selectedId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ takeover: next })
      });
      if (!res.ok) throw new Error('Failed to update takeover');
      loadSessions();
    } catch (err) {
      setSession(prev => (prev ? { ...prev, takeover: !next } : prev));
      setError(err.message || 'Failed to update takeover');
    }
  };

  const liveCount = useMemo(() => sessions.length, [sessions]);

  return (
    <div className="h-dvh w-full overflow-hidden flex flex-col relative font-sans bg-[#F2F2F7] dark:bg-[#000000]">
      <div className="sticky top-0 z-50 px-4 sm:px-6 md:px-10 py-4 sm:py-6 glass-surface border-b border-black/[0.03] dark:border-white/[0.05] pt-safe backdrop-blur-3xl">
        <div className="max-w-6xl mx-auto">
          <AdminHeader
            title="Live Chat"
            onLogout={async () => {
              await fetch('/api/admin/auth/logout', { method: 'POST' });
              globalThis.location.href = '/admin-login';
            }}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 w-full max-w-6xl mx-auto p-1.5 sm:p-3 md:p-5 lg:p-8 xl:p-10">
        {!enabled ? (
          <div className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-6 flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-[var(--text-primary)]">Live chat needs a database</div>
              <p className="text-[13px] text-[var(--text-secondary)] mt-1">
                Set <code className="font-mono">DATABASE_URL</code> (or <code className="font-mono">STORAGE_DATABASE_URL</code>) so sessions and operator messages can be shared across instances.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-1.5 sm:gap-3 md:gap-4 h-full min-h-0">
            {/* Sessions list */}
            <div className={`${selectedId ? 'hidden lg:flex' : 'flex'} rounded-2xl sm:rounded-3xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-black/25 p-2 sm:p-3 flex-col min-h-0 max-h-full`}>
              <div className="flex items-center justify-between px-1 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[12px] font-black uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                    Live now · {liveCount}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={loadSessions}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-95"
                  title="Refresh"
                >
                  <RefreshCw size={14} />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-1 sm:space-y-1.5">
                {loading ? (
                  <div className="text-center text-[13px] text-[var(--text-tertiary)] py-10">Loading…</div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-10 px-4">
                    <Radio size={22} className="mx-auto text-[var(--text-tertiary)] mb-2" />
                    <div className="text-[13px] font-semibold text-[var(--text-secondary)]">No one is online right now</div>
                    <p className="text-[12px] text-[var(--text-tertiary)] mt-1">
                      Visitors appear here as soon as they open the bot.
                    </p>
                  </div>
                ) : (
                  sessions.map(s => (
                    <SessionRow
                      key={s.sessionId}
                      session={s}
                      active={s.sessionId === selectedId}
                      onSelect={setSelectedId}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Conversation panel */}
            <div className={`${selectedId ? 'flex' : 'hidden lg:flex'} rounded-2xl sm:rounded-3xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-black/25 flex flex-col min-h-0`}>
              {!session ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-8">
                  <MessageSquare size={26} className="text-[var(--text-tertiary)] mb-3" />
                  <div className="font-bold text-[var(--text-primary)]">Select a session</div>
                  <p className="text-[13px] text-[var(--text-tertiary)] mt-1 max-w-xs">
                    Pick someone from the list (grouped by IP) to watch their conversation and reply as the bot.
                  </p>
                </div>
              ) : (
                <>
                  {/* Panel header */}
                  <div className="px-2 sm:px-4 py-2 sm:py-3 border-b border-black/5 dark:border-white/10 flex items-center justify-between gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => setSelectedId(null)}
                        className="lg:hidden w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10 active:scale-95"
                        aria-label="Back to sessions"
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M11.25 14.25L5.25 9L11.25 3.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <div className="min-w-0">
                        <div className="font-bold text-[14px] sm:text-[15px] text-[var(--text-primary)] truncate">{sessionLabel(session)}</div>
                        <div className="text-[10px] sm:text-[11px] text-[var(--text-tertiary)] truncate flex items-center gap-1.5">
                          {session.ipAddress && <span className="font-mono">{session.ipAddress}</span>}
                          {session.ipAddress && session.conversationId && <span>•</span>}
                          {session.conversationId ? `Conv ${String(session.conversationId).slice(0, 8)}` : (!session.ipAddress ? 'No conversation yet' : null)}
                          <span>•</span>
                          <span>seen {timeAgo(session.lastSeenAt)}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={toggleTakeover}
                      role="switch"
                      aria-checked={Boolean(session.takeover)}
                      className={`shrink-0 inline-flex items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-[12px] font-black uppercase tracking-wider transition-all duration-200 active:scale-95 ${
                        session.takeover
                          ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
                          : 'bg-black/5 dark:bg-white/10 text-[var(--text-secondary)] hover:bg-black/10 dark:hover:bg-white/15'
                      }`}
                      title={session.takeover ? 'Bot paused — you are answering' : 'Take over the chat (pause the bot)'}
                    >
                      <UserCheck size={14} />
                      <span className="hidden xs:inline sm:inline">{session.takeover ? 'Answering' : 'Take over'}</span>
                    </button>
                  </div>

                  {session.takeover && (
                    <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-[12px] font-semibold text-amber-700 dark:text-amber-400">
                      Bot replies are paused for this visitor while takeover is on.
                    </div>
                  )}

                  {/* Transcript */}
                  <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-2 sm:p-4 space-y-2 sm:space-y-3">
                    {transcript.length === 0 ? (
                      <div className="text-center text-[13px] text-[var(--text-tertiary)] py-10">
                        No messages in this conversation yet.
                      </div>
                    ) : (
                      transcript.map(m => <TranscriptBubble key={m.id} message={m} />)
                    )}
                  </div>

                  {/* Composer */}
                  <div className="p-2 sm:p-3 border-t border-black/5 dark:border-white/10">
                    {error && (
                      <div className="mb-2 text-[12px] font-semibold text-[#B91C1C] dark:text-[#F87171]">{error}</div>
                    )}
                    <div className="flex items-end gap-2">
                      <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        rows={1}
                        placeholder="Reply as the bot…"
                        className="flex-1 resize-none rounded-xl sm:rounded-2xl border border-black/10 dark:border-white/15 bg-white/70 dark:bg-black/30 px-3 sm:px-3.5 py-2 sm:py-2.5 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[#DC2626]/40 max-h-32"
                      />
                      <button
                        type="button"
                        onClick={sendMessage}
                        disabled={sending || !draft.trim()}
                        className="shrink-0 inline-flex items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-[13px] px-3 sm:px-4 py-2 sm:py-2.5 transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-red-500/20"
                      >
                        <Send size={15} />
                        <span className="hidden sm:inline">Send</span>
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
                      Sent messages appear in the visitor&apos;s chat as a normal bot reply.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
