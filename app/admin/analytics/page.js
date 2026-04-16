"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Download } from 'lucide-react';
import { AdminHeader } from '../../../components/AdminHeader.jsx';
import { useAutoSync, AutoSyncControls } from '../../../components/AutoSyncControls.jsx';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'conversations', label: 'Conversations' },
  { key: 'search', label: 'Search Analytics' },
  { key: 'quality', label: 'Quality & Errors' },
  { key: 'performance', label: 'Performance' }
];

const PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom' }
];

function cn(...parts) {
  return parts.filter(Boolean).join(' ');
}

function toDateInputValue(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function formatDateTime(v) {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit',
    hour12: true
  });
}

function formatTimeOnly(v) {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', second: '2-digit',
    hour12: true
  });
}

function SparkBars({ rows = [], keys = [], colors = [] }) {
  const max = rows.reduce((m, row) => Math.max(m, ...keys.map((k) => Number(row[k] || 0))), 0);
  return (
    <div className="space-y-2">
      {rows.slice(-8).map((row) => (
        <div key={row.day} className="space-y-1">
          <div className="text-[11px] font-bold text-[var(--text-tertiary)]">{row.day}</div>
          <div className="flex gap-1">
            {keys.map((key, i) => {
              const value = Number(row[key] || 0);
              const width = max > 0 ? Math.max(3, (value / max) * 100) : 0;
              return (
                <div key={key} className="h-2 rounded-full" style={{ width: `${width}%`, backgroundColor: colors[i] || '#DC2626' }} title={`${key}: ${value}`} />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

SparkBars.propTypes = {
  rows: PropTypes.array,
  keys: PropTypes.array,
  colors: PropTypes.array
};

function formatHourLabel(hour) {
  const h = Number(hour || 0);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const normalized = h % 12 === 0 ? 12 : h % 12;
  return `${normalized}${suffix}`;
}

function UsageHeatmap({ rows = [], summary = null }) {
  const dayRows = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const viewMap = new Map();
  let maxViews = 0;
  for (const row of rows) {
    const dayIndex = Number(row.dayIndex);
    const hour = Number(row.hour);
    const views = Number(row.views || 0);
    if (Number.isNaN(dayIndex) || Number.isNaN(hour)) continue;
    viewMap.set(`${dayIndex}-${hour}`, views);
    if (views > maxViews) maxViews = views;
  }

  const colorForViews = (views) => {
    if (views <= 0 || maxViews <= 0) return 'rgba(220, 38, 38, 0.08)';
    const ratio = views / maxViews;
    const alpha = 0.15 + (ratio * 0.8);
    return `rgba(220, 38, 38, ${alpha.toFixed(3)})`;
  };

  return (
    <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="text-[12px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Usage Heatmap (Views by Day & Hour)</div>
        <div className="text-[12px] font-medium text-[var(--text-secondary)]">
          {summary?.peakDay ? `Peak: ${summary.peakDay} at ${formatHourLabel(summary.peakHour)} (${summary.peakHourViews || 0} views)` : 'No usage data in selected range'}
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[52px_repeat(24,minmax(20px,1fr))] gap-1 text-[10px] text-[var(--text-tertiary)] mb-1">
            <div />
            {hours.map((hour) => (
              <div key={`label-${hour}`} className="text-center">
                {hour % 3 === 0 ? formatHourLabel(hour) : ''}
              </div>
            ))}
          </div>

          {dayRows.map((day, dayIndex) => (
            <div key={day} className="grid grid-cols-[52px_repeat(24,minmax(20px,1fr))] gap-1 mb-1">
              <div className="text-[11px] font-bold text-[var(--text-tertiary)] flex items-center">{day}</div>
              {hours.map((hour) => {
                const views = viewMap.get(`${dayIndex}-${hour}`) || 0;
                return (
                  <div
                    key={`${day}-${hour}`}
                    className="h-5 rounded-[4px] border border-black/5 dark:border-white/10"
                    style={{ backgroundColor: colorForViews(views) }}
                    title={`${day} ${formatHourLabel(hour)}: ${views} views`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-[var(--text-secondary)]">
        <div>Total views: {summary?.totalViews || 0}</div>
        <div className="flex items-center gap-2">
          <span>Low</span>
          <div className="w-16 h-2 rounded-full" style={{ background: 'linear-gradient(to right, rgba(220,38,38,0.08), rgba(220,38,38,0.95))' }} />
          <span>High</span>
        </div>
      </div>
    </div>
  );
}

UsageHeatmap.propTypes = {
  rows: PropTypes.array,
  summary: PropTypes.object
};

function KpiCard({ title, value, subtitle, delta }) {
  let tone = 'text-[var(--text-tertiary)]';
  if (delta != null) {
    tone = delta >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]';
  }
  return (
    <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 p-4 space-y-1.5">
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">{title}</div>
      <div className="text-[26px] font-black tracking-tight text-[var(--text-primary)]">{value}</div>
      <div className="text-[12px] font-medium text-[var(--text-secondary)]">{subtitle || '\u00a0'}</div>
      <div className={cn('text-[12px] font-bold', tone)}>
        {delta != null && `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}% vs previous`}
        {delta == null && '\u00a0'}
      </div>
    </div>
  );
}

KpiCard.propTypes = {
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.node]),
  subtitle: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  delta: PropTypes.number
};

function Table({ columns, rows, empty = 'No data available' }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20">
      <table className="w-full text-left border-collapse min-w-[760px]">
        <thead>
          <tr className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/10">
            {columns.map((c) => (
              <th key={c.key} className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5 dark:divide-white/10">
          {rows.length === 0 && (
            <tr>
              <td className="px-4 py-8 text-[14px] text-[var(--text-secondary)]" colSpan={columns.length}>{empty}</td>
            </tr>
          )}
          {rows.map((row, idx) => (
            <tr key={row.id || row.conversation_id || row.day || idx} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3 text-[13px] text-[var(--text-primary)] align-top">
                  {c.render ? c.render(row[c.key], row) : String(row[c.key] ?? '\u2014')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

Table.propTypes = {
  columns: PropTypes.array,
  rows: PropTypes.array,
  empty: PropTypes.string
};

export default function AdminAnalyticsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [preset, setPreset] = useState('last7');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [conversationFilters, setConversationFilters] = useState({
    userId: '',
    conversationId: '',
    status: '',
    feedback: '',
    intent: '',
    escalation: '',
    department: ''
  });

  const [overview, setOverview] = useState(null);
  const [conversations, setConversations] = useState({ rows: [], total: 0 });
  const [search, setSearch] = useState(null);
  const [quality, setQuality] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);

  const tabRequestConfig = useMemo(() => ({
    overview: {
      path: '/api/admin/analytics/overview',
      extra: '&page=1&pageSize=20',
      assign: setOverview,
      errorMessage: 'Failed to load overview analytics'
    },
    conversations: {
      path: '/api/admin/analytics/conversations',
      extra: '&page=1&pageSize=50',
      assign: setConversations,
      errorMessage: 'Failed to load conversations'
    },
    search: {
      path: '/api/admin/analytics/search',
      extra: '&page=1&pageSize=30',
      assign: setSearch,
      errorMessage: 'Failed to load search analytics'
    },
    quality: {
      path: '/api/admin/analytics/quality',
      extra: '&page=1&pageSize=30',
      assign: setQuality,
      errorMessage: 'Failed to load quality analytics'
    },
    performance: {
      path: '/api/admin/analytics/performance',
      extra: '',
      assign: setPerformance,
      errorMessage: 'Failed to load performance analytics'
    }
  }), []);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('preset', preset);
    if (preset === 'custom' && from && to) {
      params.set('from', `${from}T00:00:00.000Z`);
      params.set('to', `${to}T23:59:59.999Z`);
    }
    return params.toString();
  }, [preset, from, to]);

  const selectedRangeLabel = useMemo(() => {
    if (preset === 'custom') return 'Custom range';
    const selected = PRESETS.find((item) => item.value === preset);
    return selected?.label || 'Selected range';
  }, [preset]);

  const conversationQueryString = useMemo(() => {
    const params = new URLSearchParams(queryString);
    if (conversationFilters.userId.trim()) params.set('userId', conversationFilters.userId.trim());
    if (conversationFilters.conversationId.trim()) params.set('conversationId', conversationFilters.conversationId.trim());
    if (conversationFilters.status.trim()) params.set('status', conversationFilters.status.trim());
    if (conversationFilters.feedback.trim()) params.set('feedback', conversationFilters.feedback.trim());
    if (conversationFilters.intent.trim()) params.set('intent', conversationFilters.intent.trim());
    if (conversationFilters.escalation.trim()) params.set('escalation', conversationFilters.escalation.trim());
    if (conversationFilters.department.trim()) params.set('department', conversationFilters.department.trim());
    return params.toString();
  }, [conversationFilters, queryString]);

  const requestQueryString = activeTab === 'conversations' ? conversationQueryString : queryString;

  const fetchTabData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const config = tabRequestConfig[activeTab];
      if (config) {
        const res = await fetch(`${config.path}?${requestQueryString}${config.extra}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(config.errorMessage);
        config.assign(await res.json());
      }
    } catch (e) {
      setError(e.message || 'Failed to load analytics data');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [activeTab, requestQueryString, tabRequestConfig]);

  const {
    autoSyncEnabled,
    setAutoSyncEnabled,
    syncIntervalSec,
    setSyncIntervalSec,
    syncCountdown,
    lastSyncedAt,
    syncing,
    performSync
  } = useAutoSync(async () => await fetchTabData({ silent: true }), 15);

  useEffect(() => {
    fetchTabData();
  }, [fetchTabData]);

  const loadConversationDetail = async (id) => {
    try {
      const res = await fetch(`/api/admin/analytics/conversations/${id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load conversation detail');
      setSelectedConversation(await res.json());
    } catch (e) {
      setError(e.message || 'Failed to load conversation detail');
    }
  };

  const conversationSummary = useMemo(() => {
    const rows = Array.isArray(conversations.rows) ? conversations.rows : [];
    const counts = rows.reduce((acc, row) => {
      const status = String(row?.status || '').toLowerCase();
      const feedbackState = String(row?.feedback_state || '').toLowerCase();
      const escalationState = String(row?.escalation_state || '').toLowerCase();

      if (status === 'live') acc.live += 1;
      else if (status === 'resolved') acc.resolved += 1;
      else if (status === 'needs_review') acc.needsReview += 1;

      if (feedbackState === 'reviewed') acc.reviewed += 1;
      if (escalationState === 'escalated') acc.escalated += 1;
      return acc;
    }, { live: 0, resolved: 0, needsReview: 0, reviewed: 0, escalated: 0 });

    return counts;
  }, [conversations.rows]);

  const dataAgeSeconds = lastSyncedAt ? Math.max(0, Math.floor((Date.now() - lastSyncedAt.getTime()) / 1000)) : null;
  const isStale = dataAgeSeconds != null && dataAgeSeconds > Math.max(30, syncIntervalSec * 2);
  let freshnessLabel = 'Waiting for stream';
  if (lastSyncedAt) {
    freshnessLabel = formatTimeOnly(lastSyncedAt);
    if (isStale) {
      freshnessLabel += ' · stale';
    }
  }

  const resetConversationFilters = () => {
    setConversationFilters({
      userId: '',
      conversationId: '',
      status: '',
      feedback: '',
      intent: '',
      escalation: '',
      department: ''
    });
  };

  const conversationRows = Array.isArray(conversations.rows) ? conversations.rows : [];
  const isConversationDetailOpen = Boolean(selectedConversation?.conversation?.id);

  const updateConversationFilter = (key, value) => {
    setConversationFilters((prev) => ({ ...prev, [key]: value }));
  };

  const statePillClass = (state) => {
    const normalized = String(state || '').toLowerCase();
    if (normalized === 'live' || normalized === 'positive') return 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]';
    if (normalized === 'resolved' || normalized === 'reviewed') return 'bg-[#DBEAFE] text-[#1D4ED8] border-[#BFDBFE]';
    if (normalized === 'needs_review' || normalized === 'escalated') return 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]';
    return 'bg-black/5 dark:bg-white/10 text-[var(--text-secondary)] border-black/10 dark:border-white/10';
  };

  return (
    <div className="h-dvh w-full overflow-y-auto no-scrollbar relative font-sans bg-[#F2F2F7] dark:bg-[#000000] text-[var(--text-primary)]">
      <div className="sticky top-0 z-50 px-4 sm:px-6 md:px-10 py-4 sm:py-6 glass-surface border-b border-black/[0.03] dark:border-white/[0.05] pt-safe backdrop-blur-3xl">
        <div className="max-w-[1280px] mx-auto">
          <AdminHeader 
            title="Analytics & Quality" 
            onLogout={async () => {
              await fetch('/api/admin/auth/logout', { method: 'POST' });
              globalThis.location.href = '/admin-login';
            }} 
          />
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto p-4 sm:p-6 md:p-8 pb-20 sm:pb-32">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          <aside className="w-full lg:w-48 xl:w-64 rounded-3xl border border-black/5 dark:border-white/10 glass-card p-3 sm:p-4 h-fit sticky top-28 z-40 hidden md:block">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)] mb-2 px-3">Views</div>
            <div className="space-y-1.5">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'w-full text-left rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all',
                    activeTab === tab.key
                      ? 'bg-[#DC2626] text-white shadow-[0_2px_8px_rgba(220,38,38,0.3)]'
                      : 'hover:bg-black/5 dark:hover:bg-white/10 text-[var(--text-primary)]'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </aside>

          {/* Mobile Tabs */}
          <div className="md:hidden flex overflow-x-auto gap-2 pb-2 -mx-4 px-4 chat-scroll">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'whitespace-nowrap rounded-xl px-4 py-3 text-[13px] font-bold transition-all shrink-0',
                  activeTab === tab.key
                    ? 'bg-[#DC2626] text-white shadow-[0_2px_8px_rgba(220,38,38,0.3)]'
                    : 'bg-black/5 dark:bg-white/10 text-[var(--text-secondary)]'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <main className="flex-1 space-y-4">
            <div className="rounded-[24px] sm:rounded-[32px] border border-black/5 dark:border-white/10 glass-card p-4 sm:p-6">
              <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center w-full">
                <div className="flex flex-wrap items-end gap-3 flex-1">
                  <div>
                    <label htmlFor="analytics-date-range" className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Date range</label>
                    <select
                      id="analytics-date-range"
                      className="mt-1 block rounded-xl bg-black/5 dark:bg-white/10 border border-transparent hover:border-black/5 dark:hover:border-white/10 px-3 py-[10px] text-[13px] font-bold outline-none transition-all"
                      value={preset}
                      onChange={(e) => setPreset(e.target.value)}
                    >
                      {PRESETS.map((item) => <option key={item.value} value={item.value} className="text-black">{item.label}</option>)}
                    </select>
                  </div>

                  {preset === 'custom' && (
                    <>
                      <div>
                        <label htmlFor="analytics-date-from" className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">From</label>
                        <input id="analytics-date-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block rounded-xl bg-black/5 dark:bg-white/10 border border-transparent px-3 py-2 text-[13px] font-bold outline-none font-mono" />
                      </div>
                      <div>
                        <label htmlFor="analytics-date-to" className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">To</label>
                        <input id="analytics-date-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block rounded-xl bg-black/5 dark:bg-white/10 border border-transparent px-3 py-2 text-[13px] font-bold outline-none font-mono" />
                      </div>
                    </>
                  )}

                  <a href={`/api/admin/analytics/export/conversations?${queryString}`} className="rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 px-4 py-[10px] text-[13px] font-bold inline-flex items-center gap-2 transition-all">
                    <Download size={14} /> <span className="hidden sm:inline">Export CSV</span>
                  </a>
                </div>

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
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                <span className="rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/10 px-3 py-1">Live polling only</span>
                <span className="rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/10 px-3 py-1">Historical query: {selectedRangeLabel}</span>
                <span className="rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/10 px-3 py-1">Freshness required on every widget</span>
              </div>
              <div className="text-[12px] text-[var(--text-secondary)] mt-3 font-medium">
                All charts and tables respect this date range. If data is delayed or missing, the UI must show that state instead of guessing.
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B] px-4 py-3 text-[13px]">{error}</div>
            )}

            {loading && <div className="text-[13px] font-medium text-[var(--text-secondary)]">Loading analytics...</div>}

            {!loading && activeTab === 'overview' && overview && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  <KpiCard title="Total Messages" value={overview.kpis.totalMessages?.value || 0} delta={overview.kpis.totalMessages?.deltaPct} />
                  <KpiCard title="Total Views" value={overview.kpis.totalViews?.value || overview.kpis.totalConversations?.value || 0} subtitle="Conversation starts" delta={overview.kpis.totalViews?.deltaPct ?? overview.kpis.totalConversations?.deltaPct} />
                  <KpiCard title="Unique Users" value={overview.kpis.uniqueUsers?.value || 0} delta={overview.kpis.uniqueUsers?.deltaPct} />
                  <KpiCard title="Smart Searches" value={overview.kpis.smartSearches?.value || 0} subtitle={`${(overview.kpis.smartSearches?.rate || 0).toFixed(1)}%`} delta={overview.kpis.smartSearches?.deltaPct} />
                  <KpiCard title="Error Rate" value={`${(overview.kpis.errorRateConversations?.value || 0).toFixed(1)}%`} delta={overview.kpis.errorRateConversations?.deltaPct} />
                  <KpiCard title="Goal Completion Rate" value={`${(overview.kpis.conversationSuccessRate?.value || 0).toFixed(1)}%`} delta={overview.kpis.conversationSuccessRate?.deltaPct} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 p-4">
                    <div className="text-[12px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-3">Messages Per Day (User/Bot)</div>
                    <SparkBars rows={overview.charts.messagesPerDay || []} keys={['user', 'bot']} colors={['#2563EB', '#DC2626']} />
                  </div>
                  <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 p-4">
                    <div className="text-[12px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-3">Error Rate Per Day (%)</div>
                    <SparkBars rows={(overview.charts.errorRatePerDay || []).map((r) => ({ ...r, errorRate: r.rate }))} keys={['errorRate']} colors={['#DC2626']} />
                  </div>
                </div>

                <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 p-4">
                  <div className="text-[12px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-3">Search Events Per Day (Name / Smart / Other)</div>
                  <SparkBars rows={overview.charts.searchByTypePerDay || []} keys={['name', 'smart', 'other']} colors={['#0EA5E9', '#16A34A', '#F59E0B']} />
                </div>

                <UsageHeatmap rows={overview.charts.usageHeatmap || []} summary={overview.usageSummary || null} />

                <Table
                  columns={[
                    { key: 'id', label: 'Conversation ID', render: (v, row) => <button className="underline text-[#DC2626]" onClick={() => loadConversationDetail(row.id)}>{v}</button> },
                    { key: 'user_id', label: 'User ID' },
                    { key: 'started_at', label: 'Started At', render: (v) => formatDateTime(v) },
                    { key: 'success', label: 'Success' },
                    { key: 'has_error', label: 'Has Error' },
                    { key: 'message_count', label: 'Messages' }
                  ]}
                  rows={overview.recentConversations || []}
                />
              </div>
            )}

            {!loading && activeTab === 'conversations' && (
              <div className="space-y-4">
                <section className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="space-y-1">
                      <h2 className="text-lg font-black tracking-tight text-[var(--text-primary)]">Conversations</h2>
                      <p className="text-[13px] text-[var(--text-secondary)]">
                        One row per stored conversation. Session, intent, feedback, and transcript detail are read only from persisted backend records.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={`/api/admin/analytics/export/conversations?${conversationQueryString}`}
                        className="rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 px-4 py-3 text-[13px] font-bold inline-flex items-center gap-2 transition-all"
                      >
                        <Download size={14} /> Export CSV
                      </a>
                      <button
                        type="button"
                        onClick={resetConversationFilters}
                        className="rounded-xl border border-black/10 dark:border-white/10 px-4 py-3 text-[13px] font-bold text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-all"
                      >
                        Clear filters
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
                    <KpiCard title="Live sessions" value={conversationSummary.live} subtitle="Rows with active backend conversations" />
                    <KpiCard title="Resolved" value={conversationSummary.resolved} subtitle="Ended with success=true" />
                    <KpiCard title="Needs review" value={conversationSummary.needsReview} subtitle="Ended with has_error=true" />
                    <KpiCard title="Reviewed feedback" value={conversationSummary.reviewed} subtitle="Linked user feedback exists" />
                    <KpiCard title="Escalated" value={conversationSummary.escalated} subtitle="Backend error or error events present" />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="conversation-filter-user" className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">User ID</label>
                      <input
                        id="conversation-filter-user"
                        value={conversationFilters.userId}
                        onChange={(e) => updateConversationFilter('userId', e.target.value)}
                        placeholder="Filter by stored user id"
                        className="mt-1 w-full rounded-xl bg-black/5 dark:bg-white/10 border border-transparent px-3 py-2.5 text-[13px] font-bold outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="conversation-filter-session" className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Session ID</label>
                      <input
                        id="conversation-filter-session"
                        value={conversationFilters.conversationId}
                        onChange={(e) => updateConversationFilter('conversationId', e.target.value)}
                        placeholder="Filter by conversation/session id"
                        className="mt-1 w-full rounded-xl bg-black/5 dark:bg-white/10 border border-transparent px-3 py-2.5 text-[13px] font-bold outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="conversation-filter-status" className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Status</label>
                      <select
                        id="conversation-filter-status"
                        value={conversationFilters.status}
                        onChange={(e) => updateConversationFilter('status', e.target.value)}
                        className="mt-1 w-full rounded-xl bg-black/5 dark:bg-white/10 border border-transparent px-3 py-2.5 text-[13px] font-bold outline-none"
                      >
                        <option value="">All statuses</option>
                        <option value="live">Live</option>
                        <option value="resolved">Resolved</option>
                        <option value="needs_review">Needs review</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="conversation-filter-feedback" className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Feedback</label>
                      <select
                        id="conversation-filter-feedback"
                        value={conversationFilters.feedback}
                        onChange={(e) => updateConversationFilter('feedback', e.target.value)}
                        className="mt-1 w-full rounded-xl bg-black/5 dark:bg-white/10 border border-transparent px-3 py-2.5 text-[13px] font-bold outline-none"
                      >
                        <option value="">All feedback states</option>
                        <option value="none">No feedback</option>
                        <option value="positive">Positive</option>
                        <option value="reviewed">Reviewed</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="conversation-filter-intent" className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Intent</label>
                      <select
                        id="conversation-filter-intent"
                        value={conversationFilters.intent}
                        onChange={(e) => updateConversationFilter('intent', e.target.value)}
                        className="mt-1 w-full rounded-xl bg-black/5 dark:bg-white/10 border border-transparent px-3 py-2.5 text-[13px] font-bold outline-none"
                      >
                        <option value="">All intents</option>
                        <option value="general">General</option>
                        <option value="smart">Smart</option>
                        <option value="error">Error</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="conversation-filter-escalation" className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Escalation</label>
                      <select
                        id="conversation-filter-escalation"
                        value={conversationFilters.escalation}
                        onChange={(e) => updateConversationFilter('escalation', e.target.value)}
                        className="mt-1 w-full rounded-xl bg-black/5 dark:bg-white/10 border border-transparent px-3 py-2.5 text-[13px] font-bold outline-none"
                      >
                        <option value="">All escalation states</option>
                        <option value="normal">Normal</option>
                        <option value="escalated">Escalated</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="conversation-filter-department" className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Department</label>
                      <input
                        id="conversation-filter-department"
                        value={conversationFilters.department}
                        onChange={(e) => updateConversationFilter('department', e.target.value)}
                        placeholder="Not yet stored in analytics"
                        className="mt-1 w-full rounded-xl bg-black/5 dark:bg-white/10 border border-dashed border-black/10 dark:border-white/10 px-3 py-2.5 text-[13px] font-bold outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                    <span className="rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/10 px-3 py-1">Source: conversations, messages, feedback_events, user_feedback</span>
                    <span className={`rounded-full border px-3 py-1 ${isStale ? 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]' : 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]'}`}>
                      {isStale ? 'Stale' : 'Live'} · {freshnessLabel}
                    </span>
                    <span className="rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/10 px-3 py-1">Backend total: {conversations.total || 0}</span>
                    <span className="rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/10 px-3 py-1">
                      {conversations.fetchedAt ? `Fetched ${formatDateTime(conversations.fetchedAt)}` : 'No live data'}
                    </span>
                  </div>
                </section>

                {conversations.warning && (
                  <div className="rounded-2xl border border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B] px-4 py-3 text-[13px]">
                    {conversations.warning}
                  </div>
                )}

                {!conversations.warning && conversationRows.length === 0 && (
                  <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 p-6 text-[13px] text-[var(--text-secondary)]">
                    No live data or no conversations matched the selected filters. Waiting for stream or backend query results.
                  </div>
                )}

                {conversationRows.length > 0 && (
                  <Table
                    columns={[
                      {
                        key: 'session_id',
                        label: 'Session ID',
                        render: (v, row) => <button className="underline text-[#DC2626] font-bold" onClick={() => loadConversationDetail(row.id)}>{v || row.id}</button>
                      },
                      { key: 'user_id', label: 'User ID' },
                      { key: 'first_message_at', label: 'First Message', render: (v) => formatDateTime(v) },
                      { key: 'last_activity_at', label: 'Last Activity', render: (v) => formatDateTime(v) },
                      { key: 'message_count', label: 'Messages' },
                      { key: 'detected_intent', label: 'Detected Intent', render: (v) => String(v || 'unknown') },
                      { key: 'status', label: 'Status', render: (v) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${statePillClass(v)}`}>{String(v || 'unknown')}</span> },
                      { key: 'feedback_state', label: 'Feedback', render: (v) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${statePillClass(v)}`}>{String(v || 'none')}</span> },
                      { key: 'escalation_state', label: 'Escalation', render: (v) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${statePillClass(v)}`}>{String(v || 'normal')}</span> },
                      { key: 'id', label: 'Transcript', render: (v, row) => <button className="rounded-lg bg-black/5 dark:bg-white/10 px-3 py-2 text-[12px] font-bold text-[var(--text-primary)]" onClick={() => loadConversationDetail(row.id)}>Open</button> }
                    ]}
                    rows={conversationRows}
                    empty="No live data"
                  />
                )}
              </div>
            )}

            {!loading && activeTab === 'search' && search && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                  <KpiCard title="Total Searches" value={search.kpis.totalSearches || 0} />
                  <KpiCard title="Smart Searches" value={search.kpis.smartSearches || 0} subtitle={`${(search.kpis.smartSearchRate || 0).toFixed(1)}%`} />
                  <KpiCard title="Name Searches" value={search.kpis.nameSearches || 0} />
                  <KpiCard title="Overall Success" value={`${(search.kpis.overallSuccessRate || 0).toFixed(1)}%`} />
                </div>

                <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 p-4">
                  <div className="text-[12px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-3">Search Volume Trend</div>
                  <SparkBars rows={search.trends || []} keys={['name', 'smart', 'other']} colors={['#0EA5E9', '#16A34A', '#F59E0B']} />
                </div>

                <Table
                  columns={[
                    { key: 'normalized_name', label: 'Name' },
                    { key: 'search_count', label: 'Count' },
                    { key: 'result_count_avg', label: 'Avg Results' },
                    { key: 'success_rate', label: 'Success Rate %' }
                  ]}
                  rows={search.topNames || []}
                />

                <Table
                  columns={[
                    { key: 'query', label: 'Query' },
                    { key: 'search_type', label: 'Type' },
                    { key: 'count', label: 'Count' },
                    { key: 'success_rate', label: 'Success Rate %' }
                  ]}
                  rows={search.topQueries || []}
                />
              </div>
            )}

            {!loading && activeTab === 'quality' && quality && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                  <KpiCard title="Error Rate / Conv" value={`${(quality.kpis.errorRatePerConversation || 0).toFixed(1)}%`} />
                  <KpiCard title="Error Rate / Msg" value={`${(quality.kpis.errorRatePerMessage || 0).toFixed(1)}%`} />
                  <KpiCard title="Fallback Rate" value={`${(quality.kpis.fallbackRate || 0).toFixed(1)}%`} />
                  <KpiCard title="Goal Completion" value={`${(quality.kpis.conversationSuccessRate || 0).toFixed(1)}%`} />
                  <KpiCard title="Error Events" value={quality.kpis.totalErrorEvents || 0} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 p-4">
                    <div className="text-[12px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-3">Error Rate Per Day</div>
                    <SparkBars rows={(quality.errorRatePerDay || []).map((r) => ({ ...r, errorRate: r.rate }))} keys={['errorRate']} colors={['#DC2626']} />
                  </div>
                  <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 p-4">
                    <div className="text-[12px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-3">Error Type Distribution</div>
                    <Table
                      columns={[
                        { key: 'error_type', label: 'Error Type' },
                        { key: 'count', label: 'Count' }
                      ]}
                      rows={quality.errorTypeDistribution || []}
                    />
                  </div>
                </div>

                <Table
                  columns={[
                    { key: 'created_at', label: 'Created', render: (v) => formatDateTime(v) },
                    { key: 'conversation_id', label: 'Conversation', render: (v) => <button className="underline text-[#DC2626]" onClick={() => loadConversationDetail(v)}>{v}</button> },
                    { key: 'error_type', label: 'Type' },
                    { key: 'user_text_at_error', label: 'User Text' },
                    { key: 'bot_reply_snippet', label: 'Bot Reply Snippet' }
                  ]}
                  rows={quality.recentErrors || []}
                />

                <Table
                  columns={[
                    { key: 'user_text_at_error', label: 'Repeated User Text' },
                    { key: 'count', label: 'Count' },
                    { key: 'last_occurrence', label: 'Last Seen', render: (v) => formatDateTime(v) },
                    { key: 'most_recent_error_type', label: 'Common Type' }
                  ]}
                  rows={quality.topErrorMessages || []}
                />
              </div>
            )}

            {!loading && activeTab === 'performance' && performance && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                  <KpiCard title="Avg Latency" value={`${(performance.kpis.avgLatencyMs || 0).toFixed(0)} ms`} />
                  <KpiCard title="P95 Latency" value={`${(performance.kpis.p95LatencyMs || 0).toFixed(0)} ms`} />
                  <KpiCard title="Avg Model Latency" value={`${(performance.kpis.avgModelLatencyMs || 0).toFixed(0)} ms`} />
                  <KpiCard title="Total Requests" value={performance.kpis.totalRequests || 0} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 p-4">
                    <div className="text-[12px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-3">Average Latency Per Day</div>
                    <SparkBars rows={(performance.avgLatencyPerDay || []).map((r) => ({ ...r, avg: r.value }))} keys={['avg']} colors={['#2563EB']} />
                  </div>
                  <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/50 dark:bg-black/20 p-4">
                    <div className="text-[12px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-3">P95 Latency Per Day</div>
                    <SparkBars rows={(performance.p95LatencyPerDay || []).map((r) => ({ ...r, p95: r.value }))} keys={['p95']} colors={['#F59E0B']} />
                  </div>
                </div>

                <Table
                  columns={[
                    { key: 'bucket', label: 'Bucket' },
                    { key: 'count', label: 'Count' }
                  ]}
                  rows={performance.histogram || []}
                />
              </div>
            )}
          </main>
        </div>
      </div>

      {isConversationDetailOpen && (
        <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm p-4 sm:p-8 overflow-y-auto">
          <button
            type="button"
            aria-label="Close transcript dialog"
            className="absolute inset-0 cursor-default bg-transparent"
            onClick={() => setSelectedConversation(null)}
          />
          <dialog open className="relative max-w-4xl mx-auto rounded-3xl bg-white dark:bg-[#171717] border border-black/10 dark:border-white/10 shadow-2xl w-full p-0">
            <div className="px-5 py-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase font-bold tracking-widest text-[var(--text-tertiary)]">Transcript drill-down</div>
                <div className="text-[14px] font-bold text-[var(--text-primary)]">{selectedConversation.conversation?.id || 'Unknown'}</div>
              </div>
              <button className="text-[13px] font-bold text-[#DC2626]" onClick={() => setSelectedConversation(null)}>Close</button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/10 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Session ID</div>
                  <div className="mt-1 text-[13px] font-bold text-[var(--text-primary)] break-all">{selectedConversation.conversation?.session_id || selectedConversation.conversation?.id || 'Unknown'}</div>
                </div>
                <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/10 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">User ID</div>
                  <div className="mt-1 text-[13px] font-bold text-[var(--text-primary)] break-all">{selectedConversation.conversation?.user_id || 'No live data'}</div>
                </div>
                <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/10 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Status</div>
                  <div className="mt-1 text-[13px] font-bold text-[var(--text-primary)]">{selectedConversation.conversation?.status || 'unknown'}</div>
                </div>
                <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/10 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">Freshness</div>
                  <div className="mt-1 text-[13px] font-bold text-[var(--text-primary)]">{freshnessLabel}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 text-[13px] text-[var(--text-secondary)]">
                <div>First message: <span className="font-bold text-[var(--text-primary)]">{formatDateTime(selectedConversation.conversation?.first_message_at)}</span></div>
                <div>Last activity: <span className="font-bold text-[var(--text-primary)]">{formatDateTime(selectedConversation.conversation?.last_activity_at)}</span></div>
                <div>Detected intent: <span className="font-bold text-[var(--text-primary)]">{selectedConversation.conversation?.detected_intent || 'unknown'}</span></div>
                <div>Feedback state: <span className="font-bold text-[var(--text-primary)]">{selectedConversation.conversation?.feedback_state || 'none'}</span></div>
              </div>

              <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/10 p-4 space-y-2">
                <div className="text-[12px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Exact transcript</div>
                <div className="space-y-2 max-h-[40dvh] overflow-y-auto">
                  {(selectedConversation.messages || []).map((m) => (
                    <div key={m.id} className={cn('rounded-xl px-3 py-2 text-[13px] border', m.sender === 'user' ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100' : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100')}>
                      <div className="text-[10px] font-bold uppercase tracking-widest opacity-70">{m.sender} • {formatDateTime(m.created_at)}</div>
                      <div className="mt-1 whitespace-pre-wrap font-medium">{m.text}</div>
                    </div>
                  ))}
                  {(selectedConversation.messages || []).length === 0 && (
                    <div className="rounded-xl border border-black/10 dark:border-white/10 p-4 text-[13px] text-[var(--text-secondary)]">
                      No live data for this transcript.
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Table
                  columns={[
                    { key: 'search_type', label: 'Type' },
                    { key: 'query', label: 'Query' },
                    { key: 'result_count', label: 'Results' },
                    { key: 'success', label: 'Success' }
                  ]}
                  rows={selectedConversation.searchEvents || []}
                  empty="No search events"
                />
                <Table
                  columns={[
                    { key: 'error_type', label: 'Error Type' },
                    { key: 'user_text_at_error', label: 'User Text' },
                    { key: 'created_at', label: 'At', render: (v) => formatDateTime(v) }
                  ]}
                  rows={selectedConversation.errorEvents || []}
                  empty="No errors"
                />
              </div>

              <Table
                columns={[
                  { key: 'category', label: 'Feedback Category' },
                  { key: 'message', label: 'Message' },
                  { key: 'request_label', label: 'Request Label' },
                  { key: 'created_at', label: 'Created', render: (v) => formatDateTime(v) }
                ]}
                rows={selectedConversation.feedbackEvents || []}
                empty="No feedback events"
              />
            </div>
          </dialog>
        </div>
      )}
    </div>
  );
}
