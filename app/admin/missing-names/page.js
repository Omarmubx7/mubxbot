"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { AnimatePresence, motion } from 'framer-motion';
import { ClipboardList, UserPlus, CheckCircle2, XCircle, Inbox, Search, Copy, Check, RefreshCw, Flame } from 'lucide-react';
import { AdminHeader } from '../../../components/AdminHeader.jsx';
import { useAutoSync, AutoSyncControls } from '../../../components/AutoSyncControls.jsx';
import InstructorForm, { ALL_DAYS } from '../../../components/InstructorForm.jsx';

function normalizeName(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(dr|doctor|eng|prof|professor)\.?\b/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

function Modal({ title, isOpen, onClose, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg glass-surface rounded-t-[28px] sm:rounded-[32px] shadow-2xl overflow-hidden border border-white/20 max-h-[92dvh]"
          >
            <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-black/[0.03] dark:border-white/[0.05] flex items-center justify-between bg-white/20 dark:bg-black/20">
              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text-primary)]">{title}</h3>
              <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-[var(--text-tertiary)]">✕</button>
            </div>
            <div className="px-4 sm:px-8 py-5 sm:py-8 overflow-y-auto max-h-[calc(92dvh-88px)] no-scrollbar">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

Modal.propTypes = {
  title: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired
};

function emptyHours() {
  return Object.fromEntries(ALL_DAYS.map(d => [d, '']));
}

export default function AdminMissingNamesPage() {
  const [reports, setReports] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [staleInstructors, setStaleInstructors] = useState([]);
  const [counts, setCounts] = useState({ new: 0, old: 0, missing: 0, total: 0 });
  const [hotMissing, setHotMissing] = useState([]);
  const [progress, setProgress] = useState(null);
  const [recentlyFilled, setRecentlyFilled] = useState([]);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modal, setModal] = useState(null); // { mode: 'fill'|'approve'|'update', title, submissionId, sourceName }
  const [formData, setFormData] = useState({ name: '', department: '', email: '', office: '', office_hours: emptyHours() });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedHot, setCopiedHot] = useState(false);
  const [flippedNames, setFlippedNames] = useState([]);
  const flippedAtRef = useRef({});

  const loadAll = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError('');

      const qs = new URLSearchParams({ category: 'missing_name', limit: '500' });
      const [feedbackRes, doctorsRes, submissionsRes, contributeRes] = await Promise.all([
        fetch(`/api/admin/feedback?${qs.toString()}`, { cache: 'no-store' }),
        fetch('/api/doctors', { cache: 'no-store' }),
        fetch('/api/admin/submissions?status=all', { cache: 'no-store' }),
        fetch('/api/contribute', { cache: 'no-store' })
      ]);

      if (feedbackRes.status === 401 || submissionsRes.status === 401) {
        handleSessionExpired();
        return;
      }
      if (!feedbackRes.ok || !submissionsRes.ok) {
        throw new Error(await readError(feedbackRes.ok ? submissionsRes : feedbackRes, 'Failed to load admin data'));
      }
      if (!doctorsRes.ok || !contributeRes.ok) {
        throw new Error('Failed to load data');
      }

      const feedback = await feedbackRes.json();
      const doctorsData = await doctorsRes.json();
      const subsData = await submissionsRes.json();
      const contributeData = await contributeRes.json();

      setReports(Array.isArray(feedback?.rows) ? feedback.rows : []);
      setDoctors(Array.isArray(doctorsData) ? doctorsData : []);
      setSubmissions(Array.isArray(subsData?.rows) ? subsData.rows : []);
      const stale = Array.isArray(contributeData?.staleInstructors) ? contributeData.staleInstructors : [];
      setStaleInstructors(stale);
      if (contributeData?.counts) setCounts(contributeData.counts);
      if (Array.isArray(contributeData?.hotMissing)) setHotMissing(contributeData.hotMissing);
      if (contributeData?.progress) setProgress(contributeData.progress);
      if (Array.isArray(contributeData?.newDataNames)) setRecentlyFilled(contributeData.newDataNames.slice(0, 10));

      const now = Date.now();
      setFlippedNames(prev => prev.filter(key =>
        now - (flippedAtRef.current[key] || 0) < 30000
      ));
    } catch (err) {
      if (!silent) setError(String(err?.message || err || 'Failed to load data'));
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
  } = useAutoSync(async () => await loadAll(true), 15);

  useEffect(() => {
    loadAll();
  }, []);

  const hotByKey = useMemo(() => {
    const map = new Map();
    for (const h of hotMissing) {
      const key = normalizeName(h?.name || '');
      if (key) map.set(key, h);
    }
    return map;
  }, [hotMissing]);

  const aggregated = useMemo(() => {
    const map = new Map();
    for (const row of reports) {
      const raw = String(row?.missing_name || '').trim();
      const key = normalizeName(raw);
      if (!key || key.length < 2) continue;

      if (!map.has(key)) {
        map.set(key, {
          key,
          name: raw,
          count: 0,
          last_reported: row.created_at,
          sample_message: row.message || null,
          resolved: false,
          searchCount: 0,
          isHot: false
        });
      }
      const item = map.get(key);
      item.count += 1;
      if (row.created_at && new Date(row.created_at) > new Date(item.last_reported || 0)) {
        item.last_reported = row.created_at;
      }
      if (!item.sample_message && row.message) item.sample_message = row.message;
    }

    const existingNames = new Set(doctors.map(d => normalizeName(d.name)));
    for (const item of map.values()) {
      item.resolved = existingNames.has(normalizeName(item.name));
      const metric = hotByKey.get(item.key);
      if (metric) {
        item.searchCount = metric.searchCount || 0;
        item.isHot = metric.isHot || false;
        item.lastSearched = metric.lastSeen || null;
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
      if (b.isHot !== a.isHot) return b.isHot ? 1 : -1;
      if (b.searchCount !== a.searchCount) return b.searchCount - a.searchCount;
      return new Date(b.last_reported || 0) - new Date(a.last_reported || 0);
    });
  }, [reports, doctors, hotByKey]);

  const filteredAggregated = useMemo(() => {
    if (priorityFilter === 'hot') return aggregated.filter(i => i.isHot && !i.resolved);
    if (priorityFilter === 'missing') return aggregated.filter(i => !i.resolved);
    if (priorityFilter === 'filled') return aggregated.filter(i => i.resolved);
    return aggregated;
  }, [aggregated, priorityFilter]);

  const pendingSubmissions = useMemo(() => submissions.filter(s => s?.status === 'pending'), [submissions]);
  const openCount = aggregated.filter(i => !i.resolved).length;
  const hotCount = aggregated.filter(i => i.isHot && !i.resolved).length;

  const doctorsByKey = useMemo(() => {
    const map = new Map();
    for (const d of doctors) map.set(normalizeName(d?.name || ''), d);
    return map;
  }, [doctors]);

  const flippedKeySet = useMemo(() => new Set(flippedNames), [flippedNames]);

  const flippedCards = useMemo(() => flippedNames
    .map(key => doctorsByKey.get(key))
    .filter(Boolean)
    .map(d => ({
      name: d.name,
      department: d.department,
      email: d.email,
      office: d.office,
      existingDays: Object.entries(d.office_hours || {})
        .filter(([, v]) => String(v).trim())
        .map(([day]) => day)
    })), [flippedNames, doctorsByKey]);

  const refreshItems = useMemo(() => {
    const map = new Map();
    for (const item of staleInstructors) {
      map.set(normalizeName(item.name), { ...item, flipped: false });
    }
    for (const card of flippedCards) {
      map.set(normalizeName(card.name), { ...card, flipped: true });
    }
    return Array.from(map.values());
  }, [staleInstructors, flippedCards]);

  const openFillModal = (name) => {
    setFormError('');
    setFormData({ name, department: '', email: '', office: '', office_hours: emptyHours() });
    setModal({ mode: 'fill', title: `Add data for ${name}`, submissionId: null, sourceName: name });
  };

  const openUpdateModal = (instructor) => {
    const doctor = doctorsByKey.get(normalizeName(instructor?.name || ''));
    setFormError('');
    setFormData({
      name: instructor?.name || '',
      department: instructor?.department || doctor?.department || '',
      email: instructor?.email || doctor?.email || '',
      office: instructor?.office || doctor?.office || '',
      office_hours: { ...emptyHours(), ...(doctor?.office_hours || {}) }
    });
    setModal({ mode: 'update', title: `Update data for ${instructor?.name}`, submissionId: null, sourceName: instructor?.name || '' });
  };

  const openApproveModal = (submission) => {
    setFormError('');
    setFormData({
      name: submission.name || '',
      department: submission.department || '',
      email: submission.email || '',
      office: submission.office || '',
      office_hours: { ...emptyHours(), ...(submission.office_hours || {}) }
    });
    setModal({ mode: 'approve', title: `Review submission: ${submission.name}`, submissionId: submission.id, sourceName: submission.name });
  };

  const readError = async (response, fallback = 'Request failed') => {
    let message = fallback;
    try {
      const body = await response.json();
      message = body?.error || body?.details || message;
    } catch {
      message = await response.text();
    }
    return message || fallback;
  };

  const isHtmlResponse = (response) => {
    const contentType = response?.headers?.get?.('content-type') || '';
    return contentType.includes('text/html');
  };

  const handleSessionExpired = () => {
    const loginUrl = new URL('/admin-login', globalThis.location.href);
    loginUrl.searchParams.set('next', '/admin/missing-names');
    globalThis.location.href = loginUrl.toString();
  };

  const throwForResponse = async (response, fallback = 'Request failed') => {
    if (response.status === 401) {
      handleSessionExpired();
      throw new Error('Session expired — please log in again');
    }
    if (!response.ok || isHtmlResponse(response)) {
      throw new Error(await readError(response, fallback));
    }
  };

  const requestDoctorMutation = async (payload, method = 'POST') => {
    const response = await fetch('/api/admin/doctors', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    await throwForResponse(response, 'Request failed');
    return response;
  };

  const updateSubmissionStatus = async (id, status) => {
    const response = await fetch('/api/admin/submissions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    });
    await throwForResponse(response, 'Failed to update submission');
    return response.json();
  };

  const markFlipped = (name) => {
    const key = normalizeName(name);
    if (!key) return;
    flippedAtRef.current[key] = Date.now();
    setFlippedNames(prev => prev.includes(key) ? prev : [...prev, key]);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setFormError('');

      if (modal?.mode === 'approve') {
        const putResponse = await fetch('/api/admin/doctors', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (putResponse.status === 404) {
          await requestDoctorMutation(formData, 'POST');
        } else {
          await throwForResponse(putResponse, 'Failed to update doctor');
        }
      } else {
        await requestDoctorMutation(formData, modal?.mode === 'update' ? 'PUT' : 'POST');
      }

      markFlipped(formData.name);

      if (modal?.mode === 'approve' && modal.submissionId) {
        await updateSubmissionStatus(modal.submissionId, 'approved').catch(() => {});
      }

      setModal(null);
      await loadAll(true);
    } catch (err) {
      const message = String(err?.message || err || 'Failed to save');
      setFormError(message.includes('already exists')
        ? `"${formData.name}" already exists in the directory. Edit the name or reject the submission.`
        : message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (submission) => {
    if (!confirm(`Reject submission for "${submission.name}"?`)) return;
    try {
      await updateSubmissionStatus(submission.id, 'rejected');
      await loadAll(true);
    } catch (err) {
      setError(String(err?.message || err || 'Failed to reject submission'));
    }
  };

  const copyAllNames = async () => {
    const text = aggregated.filter(i => !i.resolved).map(i => i.name).join('\n');
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setError('Could not copy to clipboard');
    }
  };

  const copyHotNames = async () => {
    const text = aggregated
      .filter(i => i.isHot && !i.resolved)
      .map(i => `${i.name} (${i.searchCount} lookups)`)
      .join('\n');
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedHot(true);
      setTimeout(() => setCopiedHot(false), 1600);
    } catch {
      setError('Could not copy to clipboard');
    }
  };

  return (
    <div className="h-dvh w-full overflow-y-auto no-scrollbar relative font-sans bg-[#F2F2F7] dark:bg-[#000000]">
      <div className="sticky top-0 z-50 px-4 sm:px-6 md:px-10 py-4 sm:py-6 glass-surface border-b border-black/[0.03] dark:border-white/[0.05] pt-safe backdrop-blur-3xl">
        <div className="max-w-6xl mx-auto">
          <AdminHeader
            title="Missing Names"
            onLogout={async () => {
              await fetch('/api/admin/auth/logout', { method: 'POST' });
              globalThis.location.href = '/admin-login';
            }}
          />
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-10 space-y-6 sm:space-y-8 pb-20 sm:pb-32">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/30 p-4">
            <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Still missing</div>
            <div className="text-[30px] font-black text-[#DC2626]">{openCount}</div>
          </div>
          <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/30 p-4">
            <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Unique reported</div>
            <div className="text-[30px] font-black text-[var(--text-primary)]">{aggregated.length}</div>
          </div>
          <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/30 p-4">
            <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Total reports</div>
            <div className="text-[30px] font-black text-[var(--text-primary)]">{reports.length}</div>
          </div>
          <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/30 p-4">
            <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Pending submissions</div>
            <div className="text-[30px] font-black text-[var(--text-primary)]">{pendingSubmissions.length}</div>
          </div>
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
            <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">Need a refresh</div>
            <div className="text-[30px] font-black text-amber-600 dark:text-amber-400">{counts.old}</div>
          </div>
        </div>

        {progress && (
          <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                Directory coverage
              </span>
              <span className="text-[13px] font-bold text-[var(--text-primary)]">
                {progress.filled} filled · {progress.missing} missing · {progress.percent}%
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#DC2626] transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
              />
            </div>
            {recentlyFilled.length > 0 && (
              <div className="mt-2 text-[12px] text-[var(--text-tertiary)]">
                Recently filled:{' '}
                <span className="font-semibold text-[var(--text-secondary)]">
                  {recentlyFilled.map(n => String(n).split('\n')[0]).filter(Boolean).slice(0, 6).join(', ')}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
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
          <div className="flex gap-1 p-1 rounded-2xl bg-black/5 dark:bg-white/10">
            {[
              { key: 'all', label: 'All' },
              { key: 'hot', label: `🔥 Hot${hotCount ? ` (${hotCount})` : ''}` },
              { key: 'missing', label: `Missing (${openCount})` },
              { key: 'filled', label: 'In directory' }
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setPriorityFilter(f.key)}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all ${priorityFilter === f.key ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        <button
          onClick={copyAllNames}
          disabled={openCount === 0}
          className="flex items-center gap-2 rounded-xl bg-black/5 dark:bg-white/10 px-4 py-2.5 text-[13px] font-bold text-[var(--text-primary)] hover:bg-black/10 dark:hover:bg-white/20 transition-all disabled:opacity-40"
        >
          {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
          {copied ? 'Copied' : 'Copy missing names'}
        </button>
        <button
          onClick={copyHotNames}
          disabled={hotCount === 0}
          className="flex items-center gap-2 rounded-xl bg-amber-500/15 px-4 py-2.5 text-[13px] font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 transition-all disabled:opacity-40"
        >
          <Flame size={15} />
          {copiedHot ? 'Copied hot list' : `Copy ${hotCount} hottest`}
        </button>
          <span className="text-[12px] text-[var(--text-tertiary)] font-medium">
            Share the missing names with students to gather office-hours data via /contribute
          </span>
        </div>

        {error && <div className="rounded-xl border border-red-300/40 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">{error}</div>}

        {pendingSubmissions.length > 0 && (
          <section className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/30 p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Inbox size={18} />
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Pending public submissions ({pendingSubmissions.length})</h2>
            </div>
            <div className="space-y-3">
              {pendingSubmissions.map((sub) => (
                <div key={sub.id} className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/20 p-4 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-black text-[var(--text-primary)]">{sub.name}</span>
                    <span className="text-[11px] text-[var(--text-tertiary)]">{formatDateTime(sub.created_at)}</span>
                    {(sub.missing_name_link || sub.missing_name_report_id) && (
                      <span className="text-[11px] px-2 py-1 rounded-md bg-[#DC2626]/10 text-[#B91C1C] dark:text-[#F87171] font-bold">
                        Linked: {sub.missing_name_link || sub.missing_name_report_id}
                      </span>
                    )}
                    {sub.origin && (
                      <span className="text-[11px] px-2 py-1 rounded-md bg-black/5 dark:bg-white/10 text-[var(--text-secondary)] font-bold">
                        via {sub.origin.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[13px] text-[var(--text-secondary)]">
                    <div>Dept: <span className="font-bold text-[var(--text-primary)]">{sub.department || '-'}</span></div>
                    <div>Email: <span className="font-bold text-[var(--text-primary)]">{sub.email || '-'}</span></div>
                    <div>Office: <span className="font-bold text-[var(--text-primary)]">{sub.office || '-'}</span></div>
                  </div>
                  <div className="text-[13px] text-[var(--text-secondary)]">
                    <span className="font-semibold">Office hours:</span>{' '}
                    {Object.entries(sub.office_hours || {}).filter(([, v]) => v).map(([d, v]) => `${d}: ${v}`).join(' | ') || '-'}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button onClick={() => openApproveModal(sub)}
                      className="flex items-center gap-2 rounded-xl bg-[#DC2626] text-white px-4 py-2.5 text-[13px] font-bold hover:scale-[1.02] active:scale-95 transition-all">
                      <CheckCircle2 size={15} /> Review & approve
                    </button>
                    <button onClick={() => handleReject(sub)}
                      className="flex items-center gap-2 rounded-xl bg-black/5 dark:bg-white/10 px-4 py-2.5 text-[13px] font-bold text-[var(--text-primary)] hover:bg-black/10 dark:hover:bg-white/20 transition-all">
                      <XCircle size={15} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {refreshItems.length > 0 && (
          <section className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <RefreshCw size={18} className="text-amber-600 dark:text-amber-400" />
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Office hours that need a refresh ({refreshItems.length})</h2>
              </div>
              <span className="text-[12px] font-medium text-[var(--text-tertiary)]">
                Flagged as outdated — update to latest data, then the badge turns green.
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {refreshItems.map((item) => (
                <div key={item.name} className={`rounded-xl border p-4 space-y-2 ${item.flipped ? 'border-green-500/25 bg-green-500/5' : 'border-amber-500/20 bg-white/60 dark:bg-black/20'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-black text-[var(--text-primary)]">{item.name}</span>
                    {item.flipped ? (
                      <span className="text-[11px] font-bold uppercase tracking-[0.12em] px-2 py-1 rounded-md bg-green-500/15 text-green-700 dark:text-green-400">New data</span>
                    ) : (
                      <span className="text-[11px] font-bold uppercase tracking-[0.12em] px-2 py-1 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400">Old data</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[12px] text-[var(--text-secondary)]">
                    <div>Dept: <span className="font-bold text-[var(--text-primary)]">{item.department || '-'}</span></div>
                    <div>Email: <span className="font-bold text-[var(--text-primary)]">{item.email || '-'}</span></div>
                    <div>Office: <span className="font-bold text-[var(--text-primary)]">{item.office || '-'}</span></div>
                  </div>
                  {item.existingDays?.length > 0 && (
                    <div className="text-[12px] text-[var(--text-secondary)]">
                      Hours on: {item.existingDays.join(', ')}
                    </div>
                  )}
                  {!item.flipped && (
                    <button onClick={() => openUpdateModal(item)}
                      className="flex items-center gap-2 rounded-xl bg-amber-600 text-white px-4 py-2.5 text-[13px] font-bold hover:scale-[1.02] active:scale-95 transition-all">
                      <RefreshCw size={15} /> Update
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/30 p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ClipboardList size={18} />
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Reported missing instructors</h2>
            </div>
            <div className="flex items-center gap-2 text-[12px] font-semibold text-[var(--text-tertiary)]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" /> missing</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> in directory</span>
            </div>
          </div>

          {loading && <div className="text-sm text-[var(--text-secondary)]">Loading...</div>}

          {!loading && filteredAggregated.length === 0 && (
            <div className="rounded-xl border border-black/10 dark:border-white/10 p-6 text-sm text-[var(--text-secondary)] flex items-center gap-2">
              <Search size={16} />
              {aggregated.length === 0 ? 'No missing-name reports yet.' : 'Nothing matches this filter.'}
            </div>
          )}

          {!loading && filteredAggregated.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredAggregated.map((item) => (
                <div key={item.key} className={`rounded-xl border p-4 space-y-2 ${item.resolved ? 'border-green-500/20 bg-green-500/5' : (item.isHot ? 'border-amber-500/30 bg-amber-500/10' : 'border-[#DC2626]/20 bg-[#DC2626]/5')}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-black text-[var(--text-primary)]">{item.name}</span>
                    <span className={`text-[11px] font-bold uppercase tracking-[0.12em] px-2 py-1 rounded-md ${item.resolved ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'bg-[#DC2626]/15 text-[#B91C1C] dark:text-[#F87171]'}`}>
                      {item.resolved ? 'In directory' : 'Missing'}
                    </span>
                    {item.isHot && !item.resolved && (
                      <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.12em] px-2 py-1 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300">
                        <Flame size={11} /> {item.searchCount} lookups
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-[var(--text-secondary)]">
                    {item.count} report{item.count > 1 ? 's' : ''} · last {formatDateTime(item.last_reported)}
                    {item.lastSearched ? ` · last searched ${formatDateTime(item.lastSearched)}` : ''}
                  </div>
                  {item.sample_message && (
                    <div className="text-[12px] text-[var(--text-secondary)] truncate">Note: {item.sample_message}</div>
                  )}
                  {!item.resolved && (
                    <button onClick={() => openFillModal(item.name)}
                      className="flex items-center gap-2 rounded-xl bg-[#DC2626] text-white px-4 py-2.5 text-[13px] font-bold hover:scale-[1.02] active:scale-95 transition-all">
                      <UserPlus size={15} /> Fill data
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Modal title={modal?.title || ''} isOpen={!!modal} onClose={() => setModal(null)}>
        {formError && <div className="mb-4 rounded-xl border border-red-300/40 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">{formError}</div>}
        <InstructorForm
          formData={formData}
          onChange={setFormData}
          onSubmit={handleSave}
          onCancel={() => setModal(null)}
          submitLabel={modal?.mode === 'approve' ? 'Approve & save' : modal?.mode === 'update' ? 'Save changes' : 'Add instructor'}
          cancelLabel="Cancel"
          submitting={submitting}
        />
      </Modal>
    </div>
  );
}
