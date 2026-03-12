"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Plus, Trash2, Edit2, RefreshCw } from 'lucide-react';

const emptyForm = {
  id: null,
  trigger: '',
  response: '',
  audience: 'user',
  is_active: true
};

export default function AdminStaticResponsesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);

  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [syncIntervalSec, setSyncIntervalSec] = useState(15);
  const [syncCountdown, setSyncCountdown] = useState(15);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const loadRows = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError('');

      const response = await fetch('/api/admin/static-responses', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to load static responses');

      const data = await response.json();
      setRows(Array.isArray(data) ? data : []);
      setLastSyncedAt(new Date());
      setSyncCountdown(syncIntervalSec);
    } catch (err) {
      if (!silent) setError(err.message || 'Failed to load static responses');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!autoSyncEnabled) {
      setSyncCountdown(syncIntervalSec);
      return;
    }
    setSyncCountdown(syncIntervalSec);
    const timer = setInterval(() => {
      if (globalThis.document.hidden) return;
      setSyncCountdown((prev) => {
        if (prev <= 1) {
          loadRows(true);
          return syncIntervalSec;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSyncEnabled, syncIntervalSec]);

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!form.trigger.trim() || !form.response.trim()) {
      setError('Trigger and response are required.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const method = form.id ? 'PUT' : 'POST';
      const payload = {
        ...form,
        trigger: form.trigger.trim(),
        response: form.response.trim()
      };

      const response = await fetch('/api/admin/static-responses', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || body?.details || 'Save failed');
      }

      setForm(emptyForm);
      await loadRows();
    } catch (err) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (row) => {
    setForm({
      id: row.id,
      trigger: row.trigger || '',
      response: row.response || '',
      audience: row.audience || 'user',
      is_active: row.is_active !== false
    });
  };

  const onDelete = async (id) => {
    if (!confirm('Delete this static response?')) return;

    try {
      const response = await fetch('/api/admin/static-responses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || body?.details || 'Delete failed');
      }

      if (form.id === id) setForm(emptyForm);
      await loadRows();
    } catch (err) {
      setError(err.message || 'Delete failed');
    }
  };

  return (
    <main className="h-dvh w-full overflow-y-auto bg-[#F2F2F7] dark:bg-black p-4 sm:p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-bold text-[#DC2626] hover:opacity-80 mb-2">
              <ArrowLeft size={16} /> Back to Admin
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)]">Bot Static Responses</h1>
            <p className="text-sm mt-1 text-[var(--text-secondary)]">Manage fixed bot replies for users, saved to database.</p>
          </div>
        </div>

        {error && <div className="rounded-xl border border-red-300/40 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">{error}</div>}

        <section className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/30 p-4 sm:p-6">
          <h2 className="text-lg font-bold mb-4 text-[var(--text-primary)]">Add / Update</h2>
          <form onSubmit={onSubmit} className="space-y-4">
            <input
              value={form.trigger}
              onChange={(e) => setForm((p) => ({ ...p, trigger: e.target.value }))}
              placeholder="Trigger phrase (example: campus wifi)"
              className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20 px-4 py-3 outline-none"
            />
            <textarea
              value={form.response}
              onChange={(e) => setForm((p) => ({ ...p, response: e.target.value }))}
              placeholder="Bot response shown to users"
              rows={5}
              className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20 px-4 py-3 outline-none"
            />
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <select
                value={form.audience}
                onChange={(e) => setForm((p) => ({ ...p, audience: e.target.value }))}
                className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/20 px-3 py-2"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="all">All</option>
              </select>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                />
                Active
              </label>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#DC2626] px-4 py-2 text-white font-bold disabled:opacity-60"
              >
                {form.id ? <Save size={16} /> : <Plus size={16} />}
                {saving ? 'Saving...' : form.id ? 'Update' : 'Create'}
              </button>
              {form.id && (
                <button
                  type="button"
                  onClick={() => setForm(emptyForm)}
                  className="rounded-xl bg-black/5 dark:bg-white/10 px-4 py-2 font-bold"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/30 p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-0 sm:mr-auto">Current Rows</h2>
            
            <button onClick={() => loadRows(false)} className="rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 px-3 py-2 text-[12px] font-bold inline-flex items-center gap-1.5 text-[var(--text-primary)] transition-all">
              <RefreshCw size={14} /> Refresh
            </button>
            
            <button
              onClick={() => setAutoSyncEnabled((prev) => !prev)}
              className={`rounded-xl px-3 py-2 text-[12px] font-bold inline-flex items-center gap-1.5 transition-all ${autoSyncEnabled ? 'bg-[#DC2626] text-white shadow-[0_2px_8px_rgba(220,38,38,0.3)]' : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[var(--text-primary)]'}`}
            >
              {autoSyncEnabled ? 'Live Sync On' : 'Live Sync Off'}
            </button>

            <select
              value={syncIntervalSec}
              onChange={(e) => setSyncIntervalSec(Number.parseInt(e.target.value, 10) || 15)}
              className="rounded-xl bg-black/5 dark:bg-white/10 border border-transparent px-2 py-2 text-[12px] text-[var(--text-primary)] font-bold outline-none hover:bg-black/10 dark:hover:bg-white/15 transition-all w-[70px] text-center"
            >
              <option value="5" className="text-black">5s</option>
              <option value="10" className="text-black">10s</option>
              <option value="15" className="text-black">15s</option>
              <option value="30" className="text-black">30s</option>
            </select>
            
            <div className="text-[11px] font-medium text-[var(--text-secondary)] w-full sm:w-auto text-right">
              {autoSyncEnabled ? `Next: ${syncCountdown}s` : 'Paused'}
              {lastSyncedAt ? ` • Last: ${lastSyncedAt.toLocaleTimeString('en-US', {hour: 'numeric', minute:'2-digit', second:'2-digit', hour12:true})}` : ''}
            </div>
          </div>
          {loading ? (
            <div className="text-sm text-[var(--text-secondary)]">Loading...</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-[var(--text-secondary)]">No static responses yet.</div>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row.id} className="rounded-xl border border-black/10 dark:border-white/10 p-4 bg-white/70 dark:bg-black/20">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm uppercase tracking-wide opacity-60">Trigger</div>
                      <div className="font-bold break-words">{row.trigger}</div>
                      <div className="mt-2 text-sm uppercase tracking-wide opacity-60">Response</div>
                      <div className="text-sm break-words whitespace-pre-wrap">{row.response}</div>
                      <div className="mt-2 text-xs opacity-70">audience: {row.audience || 'user'} | active: {row.is_active ? 'yes' : 'no'}</div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => onEdit(row)} className="rounded-lg bg-black/5 dark:bg-white/10 p-2" aria-label="Edit row">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => onDelete(row.id)} className="rounded-lg bg-red-500/10 text-red-600 p-2" aria-label="Delete row">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
