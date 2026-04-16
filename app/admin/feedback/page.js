"use client";

import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { MessageSquareWarning, MessageCircleMore } from 'lucide-react';
import { AdminHeader } from '../../../components/AdminHeader.jsx';
import { useAutoSync, AutoSyncControls } from '../../../components/AutoSyncControls.jsx';

function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit',
    hour12: true
  });
}

function FeedbackCard({ row, onOpenTranscript }) {
  return (
    <article className="rounded-xl border border-black/10 dark:border-white/10 p-4 bg-white/70 dark:bg-black/20 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] px-2 py-1 rounded-md bg-black/5 dark:bg-white/10">
          {row.category === 'missing_name' ? 'Missing Name' : 'General'}
        </span>
        <span className="text-[12px] text-[var(--text-tertiary)]">{formatDateTime(row.created_at)}</span>
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] px-2 py-1 rounded-md bg-black/5 dark:bg-white/10">
          {row.source || 'chat'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px]">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Conversation</div>
          <div className="font-bold text-[var(--text-primary)] break-all">{row.conversation_id || 'No live data'}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">User ID</div>
          <div className="font-bold text-[var(--text-primary)] break-all">{row.user_id || 'No live data'}</div>
        </div>
      </div>

      {row.missing_name && (
        <div className="text-[14px] text-[var(--text-primary)]">
          <span className="font-semibold">Instructor:</span> {row.missing_name}
        </div>
      )}

      {row.message && (
        <div className="text-[14px] whitespace-pre-wrap text-[var(--text-primary)]">{row.message}</div>
      )}

      <div className="text-[12px] text-[var(--text-secondary)]">
        {row.request_label ? `Intent: ${row.request_label}` : 'Intent: -'}
        {' | '}
        {row.user_query ? `Query: ${row.user_query}` : 'Query: -'}
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={() => onOpenTranscript(row.conversation_id)}
          disabled={!row.conversation_id}
          className="rounded-lg bg-black/5 dark:bg-white/10 px-3 py-2 text-[12px] font-bold text-[var(--text-primary)] disabled:opacity-40"
        >
          Open transcript
        </button>
      </div>
    </article>
  );
}

FeedbackCard.propTypes = {
  row: PropTypes.object.isRequired,
  onOpenTranscript: PropTypes.func.isRequired
};

export default function AdminFeedbackPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('all');
  const [sourceInfo, setSourceInfo] = useState({ fetchedAt: null, source: null });
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversationError, setConversationError] = useState('');

  const loadRows = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      setConversationError('');

      const qs = new URLSearchParams({ category, limit: '300' });
      const response = await fetch(`/api/admin/feedback?${qs.toString()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to load feedback');

      const data = await response.json();
      setRows(Array.isArray(data?.rows) ? data.rows : []);
      setSourceInfo({ fetchedAt: data?.fetchedAt || null, source: data?.source || null });
    } catch (err) {
      if (!silent) setError(String(err?.message || err || 'Failed to load feedback'));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const {
    autoSyncEnabled,
    setAutoSyncEnabled,
    syncIntervalSec,
    setSyncIntervalSec,
    syncCountdown,
    lastSyncedAt,
    syncing,
    performSync
  } = useAutoSync(async () => await loadRows(true), 15);

  useEffect(() => {
    loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const totals = useMemo(() => {
    let missingName = 0;
    let general = 0;
    for (const row of rows) {
      if (row?.category === 'missing_name') missingName += 1;
      else general += 1;
    }
    return {
      total: rows.length,
      missingName,
      general
    };
  }, [rows]);

  const freshnessLabel = sourceInfo.fetchedAt ? formatDateTime(sourceInfo.fetchedAt) : 'Waiting for stream';

  const openTranscript = async (conversationId) => {
    if (!conversationId) return;
    try {
      setConversationError('');
      const response = await fetch(`/api/admin/analytics/conversations/${conversationId}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to load transcript');
      setSelectedConversation(await response.json());
    } catch (err) {
      setConversationError(String(err?.message || err || 'Failed to load transcript'));
    }
  };

  return (
    <div className="h-dvh w-full overflow-y-auto no-scrollbar relative font-sans bg-[#F2F2F7] dark:bg-[#000000]">
      <div className="sticky top-0 z-50 px-4 sm:px-6 md:px-10 py-4 sm:py-6 glass-surface border-b border-black/[0.03] dark:border-white/[0.05] pt-safe backdrop-blur-3xl">
        <div className="max-w-6xl mx-auto">
          <AdminHeader
            title="User Feedback"
            onLogout={async () => {
              await fetch('/api/admin/auth/logout', { method: 'POST' });
              globalThis.location.href = '/admin-login';
            }}
          />
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-10 space-y-6 sm:space-y-8 pb-20 sm:pb-32">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/30 p-4">
            <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Total</div>
            <div className="text-[30px] font-black text-[var(--text-primary)]">{totals.total}</div>
          </div>
          <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/30 p-4">
            <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Missing Name</div>
            <div className="text-[30px] font-black text-[var(--text-primary)]">{totals.missingName}</div>
          </div>
          <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/30 p-4">
            <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">General</div>
            <div className="text-[30px] font-black text-[var(--text-primary)]">{totals.general}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
          <span className="rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/10 px-3 py-1">Source: conversation-linked feedback queue</span>
          <span className="rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/10 px-3 py-1">Fetched: {freshnessLabel}</span>
          <span className="rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/10 px-3 py-1">Mode: {sourceInfo.source || 'database/file'}</span>
        </div>

        {error && <div className="rounded-xl border border-red-300/40 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">{error}</div>}
        {conversationError && <div className="rounded-xl border border-red-300/40 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">{conversationError}</div>}

        <section className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/30 p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MessageCircleMore size={18} />
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Feedback Queue</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20 px-3 py-2 text-sm"
              >
                <option value="all">All types</option>
                <option value="missing_name">Missing name</option>
                <option value="general">General</option>
              </select>

              <AutoSyncControls
                autoSyncEnabled={autoSyncEnabled}
                setAutoSyncEnabled={setAutoSyncEnabled}
                syncIntervalSec={syncIntervalSec}
                setSyncIntervalSec={setSyncIntervalSec}
                syncCountdown={syncCountdown}
                lastSyncedAt={lastSyncedAt}
                syncing={syncing}
                onRefresh={performSync}
              />
            </div>
          </div>

          {loading && (
            <div className="text-sm text-[var(--text-secondary)]">Waiting for stream...</div>
          )}

          {!loading && rows.length === 0 && (
            <div className="rounded-xl border border-black/10 dark:border-white/10 p-6 text-sm text-[var(--text-secondary)] flex items-center gap-2">
              <MessageSquareWarning size={16} />
              No live data for the selected feedback filter.
            </div>
          )}

          {!loading && rows.length > 0 && (
            <div className="space-y-3">
              {rows.map((row) => (
                <FeedbackCard key={row.id} row={row} onOpenTranscript={openTranscript} />
              ))}
            </div>
          )}
        </section>

        {selectedConversation?.conversation?.id && (
          <dialog open className="w-full max-w-4xl rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#171717] shadow-2xl p-0">
            <div className="px-5 py-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase font-bold tracking-widest text-[var(--text-tertiary)]">Transcript drill-down</div>
                <div className="text-[14px] font-bold text-[var(--text-primary)]">{selectedConversation.conversation?.id || 'Unknown'}</div>
              </div>
              <button className="text-[13px] font-bold text-[#DC2626]" onClick={() => setSelectedConversation(null)}>Close</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 text-[13px] text-[var(--text-secondary)]">
                <div>Session: <span className="font-bold text-[var(--text-primary)]">{selectedConversation.conversation?.id || 'Unknown'}</span></div>
                <div>User: <span className="font-bold text-[var(--text-primary)]">{selectedConversation.conversation?.user_id || 'No live data'}</span></div>
                <div>Status: <span className="font-bold text-[var(--text-primary)]">{selectedConversation.conversation?.status || 'unknown'}</span></div>
                <div>Freshness: <span className="font-bold text-[var(--text-primary)]">{selectedConversation.conversation?.started_at ? formatDateTime(selectedConversation.conversation.started_at) : 'Waiting for stream'}</span></div>
              </div>

              <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/10 p-4 space-y-2">
                <div className="text-[12px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Exact transcript</div>
                <div className="space-y-2 max-h-[40dvh] overflow-y-auto">
                  {(selectedConversation.messages || []).map((m) => (
                    <div key={m.id} className="rounded-xl px-3 py-2 text-[13px] border bg-white/60 dark:bg-black/20 border-black/10 dark:border-white/10">
                      <div className="text-[10px] font-bold uppercase tracking-widest opacity-70">{m.sender} • {formatDateTime(m.created_at)}</div>
                      <div className="mt-1 whitespace-pre-wrap font-medium text-[var(--text-primary)]">{m.text}</div>
                    </div>
                  ))}
                  {(selectedConversation.messages || []).length === 0 && (
                    <div className="rounded-xl border border-black/10 dark:border-white/10 p-4 text-[13px] text-[var(--text-secondary)]">No live data for this transcript.</div>
                  )}
                </div>
              </div>
            </div>
          </dialog>
        )}
      </div>
    </div>
  );
}