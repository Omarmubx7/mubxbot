"use client";

import React, { useEffect, useMemo, useState } from 'react';
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

export default function AdminFeedbackPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('all');

  const loadRows = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError('');

      const qs = new URLSearchParams({ category, limit: '300' });
      const response = await fetch(`/api/admin/feedback?${qs.toString()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to load feedback');

      const data = await response.json();
      setRows(Array.isArray(data?.rows) ? data.rows : []);
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

        {error && <div className="rounded-xl border border-red-300/40 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">{error}</div>}

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
            <div className="text-sm text-[var(--text-secondary)]">Loading feedback...</div>
          )}

          {!loading && rows.length === 0 && (
            <div className="rounded-xl border border-black/10 dark:border-white/10 p-6 text-sm text-[var(--text-secondary)] flex items-center gap-2">
              <MessageSquareWarning size={16} />
              No feedback items yet.
            </div>
          )}

          {!loading && rows.length > 0 && (
            <div className="space-y-3">
              {rows.map((row) => (
                <article key={row.id} className="rounded-xl border border-black/10 dark:border-white/10 p-4 bg-white/70 dark:bg-black/20 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] px-2 py-1 rounded-md bg-black/5 dark:bg-white/10">
                      {row.category === 'missing_name' ? 'Missing Name' : 'General'}
                    </span>
                    <span className="text-[12px] text-[var(--text-tertiary)]">{formatDateTime(row.created_at)}</span>
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
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}