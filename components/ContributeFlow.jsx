"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronLeft, Search, CheckCircle2, AlertTriangle, UserPlus, Flame } from 'lucide-react';
import InstructorForm from './InstructorForm';
import { useContribute } from '../lib/useContribute';

export default function ContributeFlow({
  variant = 'modal',
  open = false,
  onOpenChange,
  initialName = '',
  initialInstructor = null,
  initialTab = 'add',
  prefillFromUrl = false
}) {
  const {
    missingNames,
    hotMissing,
    staleInstructors,
    departments,
    counts,
    progress,
    recentlyFilled,
    loading,
    loadError,
    formData,
    submitting,
    formError,
    submitted,
    celebration,
    setFormData,
    pickName,
    pickInstructor,
    submit,
    resetForm
  } = useContribute({ prefillName: initialName, prefillFromUrl });

  const [step, setStep] = useState('pick');
  const [tab, setTab] = useState('add');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (variant === 'modal' && !open) return;
    const urlName = prefillFromUrl
      ? (new URLSearchParams(globalThis.location?.search || '')).get('name') || ''
      : '';
    if (initialInstructor?.name) {
      pickInstructor(initialInstructor);
      setStep('form');
    } else {
      setStep(initialName || urlName ? 'form' : 'pick');
    }
    if (initialTab === 'update' || initialTab === 'add') setTab(initialTab);
    setQuery('');
  }, [open, initialName, initialInstructor, initialTab, variant, prefillFromUrl, pickInstructor]);

  const close = () => {
    if (variant === 'modal' && onOpenChange) onOpenChange(false);
  };

  const handlePickMissing = (name, meta = {}) => {
    pickName(name, meta);
    setStep('form');
  };

  const handlePickStale = (instructor) => {
    pickInstructor(instructor);
    setStep('form');
  };

  const handleSubmit = async (e) => {
    const ok = await submit(e);
    if (ok) setStep('done');
  };

  const handleDone = () => {
    resetForm();
    if (variant === 'modal') {
      close();
    } else {
      setStep('pick');
    }
  };

  const addList = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return missingNames;
    return missingNames.filter(item =>
      String(item.name || '').toLowerCase().includes(q) ||
      String(item.department || '').toLowerCase().includes(q)
    );
  }, [missingNames, query]);

  const hotList = useMemo(() => {
    const q = query.trim().toLowerCase();
    return hotMissing.filter(item => {
      if (item.resolved) return false;
      if (!q) return true;
      return String(item.name || '').toLowerCase().includes(q);
    });
  }, [hotMissing, query]);

  const coldList = useMemo(() => {
    const hotKeys = new Set(hotList.map(item => String(item.name || '').toLowerCase()));
    return addList.filter(item => !hotKeys.has(String(item.name || '').toLowerCase()));
  }, [addList, hotList]);

  const totalMissing = Math.max(counts.missing || 0, missingNames.length);
  const filledCount = Math.max(0, (counts.total || 0));
  const progressPercent = progress?.percent ?? (filledCount + totalMissing > 0
    ? Math.round((filledCount / (filledCount + totalMissing)) * 100)
    : 100);

  const updateList = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staleInstructors;
    return staleInstructors.filter(item =>
      String(item.name || '').toLowerCase().includes(q) ||
      String(item.department || '').toLowerCase().includes(q)
    );
  }, [staleInstructors, query]);

  const title = step === 'pick' ? 'Help keep the directory fresh' : (formData.name?.trim() || 'Office hours');

  const header = (
    <>
      <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-black/10 dark:bg-white/15 sm:hidden" />
      <div className="flex items-center gap-2 px-4 sm:px-6 py-3">
        {step !== 'pick' && (
          <button
            type="button"
            onClick={() => { resetForm(); setStep('pick'); }}
            aria-label="Back"
            className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-black tracking-tight text-[var(--text-primary)] truncate">{title}</div>
          {step === 'pick' && (
            <div className="text-[12px] font-medium text-[var(--text-tertiary)]">
              {counts.missing} missing · {counts.old} outdated · {counts.new} up to date
            </div>
          )}
        </div>
        {variant === 'modal' && (
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </>
  );

  const pickBody = (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 pt-1 chat-scroll">
      {loading && <div className="text-[13px] text-[var(--text-tertiary)] py-2">Loading...</div>}
      {loadError && <div className="text-[13px] text-[var(--text-tertiary)] py-2">{loadError}</div>}
      {!loading && !loadError && (
        <>
          <div className="flex gap-1 p-1 rounded-2xl bg-black/5 dark:bg-white/10 mb-3">
            <button
              type="button"
              onClick={() => setTab('add')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                tab === 'add' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-[#B91C1C] dark:text-[#F87171]' : 'text-[var(--text-secondary)]'
              }`}
            >
              Add new
              {counts.missing > 0 && (
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${tab === 'add' ? 'bg-[#DC2626]/10 text-[#DC2626]' : 'bg-black/5 dark:bg-white/10'}`}>{counts.missing}</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setTab('update')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                tab === 'update' ? 'bg-white dark:bg-[#2C2C2E] shadow-sm text-amber-600 dark:text-amber-400' : 'text-[var(--text-secondary)]'
              }`}
            >
              Update old
              {counts.old > 0 && (
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${tab === 'update' ? 'bg-amber-500/10 text-amber-600' : 'bg-black/5 dark:bg-white/10'}`}>{counts.old}</span>
              )}
            </button>
          </div>

          <div className="relative mb-3">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === 'update' ? 'Search instructors to update…' : 'Search names…'}
              className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-full py-3 pl-10 pr-4 text-[15px] outline-none focus:ring-2 focus:ring-[var(--primary)]/30 transition-all text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
            />
          </div>

          {tab === 'add' && (
            <div className="mb-3 rounded-2xl border border-black/5 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[12px] font-bold text-[var(--text-secondary)]">
                  {filledCount} filled · {totalMissing} still missing
                </span>
                <span className="text-[12px] font-bold text-[#B91C1C] dark:text-[#F87171]">{progressPercent}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#DC2626] transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                />
              </div>
              {recentlyFilled.length > 0 && (
                <div className="mt-2 text-[12px] text-[var(--text-tertiary)]">
                  Recently filled:{' '}
                  <span className="font-semibold text-[var(--text-secondary)]">
                    {recentlyFilled.map(n => String(n).split('\n')[0]).filter(Boolean).slice(0, 3).join(', ')}
                  </span>
                </div>
              )}
            </div>
          )}

          {tab === 'add' && hotList.length > 0 && (
            <div className="space-y-1 mb-3">
              <div className="flex items-center gap-1.5 px-1 pb-1">
                <Flame size={14} className="text-amber-500" />
                <span className="text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  Most searched — help these first
                </span>
              </div>
              {hotList.map((item) => (
                <button
                  key={`hot-${item.name}`}
                  type="button"
                  onClick={() => handlePickMissing(item.name, { isHot: true })}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/10 active:scale-[0.99] transition-all text-left"
                >
                  <div className="w-10 h-10 shrink-0 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-[15px]">
                    {String(item.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-bold text-[var(--text-primary)] truncate">{item.name}</div>
                    <div className="text-[12px] text-[var(--text-tertiary)]">
                      {item.searchCount > 0
                        ? `${item.searchCount} ${item.searchCount === 1 ? 'person' : 'people'} looked this up`
                        : 'Reported as missing'}
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                    🔥 {item.searchCount || 1}
                  </span>
                </button>
              ))}
            </div>
          )}

          {tab === 'add' && coldList.length > 0 && (
            <div className="space-y-1">
              {coldList.map((item) => (
                <button
                  key={item.key || item.name}
                  type="button"
                  onClick={() => handlePickMissing(item.name)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 active:scale-[0.99] transition-all text-left"
                >
                  <div className="w-10 h-10 shrink-0 rounded-full bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center font-bold text-[15px]">
                    {String(item.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-bold text-[var(--text-primary)] truncate">{item.name}</div>
                    <div className="text-[12px] text-[var(--text-tertiary)]">Not in the directory yet</div>
                  </div>
                  <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-[#DC2626]/10 text-[#B91C1C] dark:text-[#F87171]">Missing</span>
                </button>
              ))}
            </div>
          )}

          {tab === 'add' && coldList.length === 0 && hotList.length === 0 && (
            <div className="text-center py-8">
              {query.trim()
                ? <div className="text-[14px] font-bold text-[var(--text-primary)]">No matches for "{query.trim()}"</div>
                : <div className="text-[14px] font-bold text-[var(--text-primary)]">All caught up 🎉</div>}
              <div className="text-[13px] text-[var(--text-tertiary)] mt-1">
                {query.trim()
                  ? 'Add this name to the directory.'
                  : hotMissing.length === 0
                    ? 'Everyone is listed. You can still submit updates.'
                    : 'Everyone on the list is already filled in. Nice work.'}
              </div>
              <button
                type="button"
                onClick={() => { pickName(query.trim()); setStep('form'); }}
                className="inline-flex items-center gap-1.5 mt-3 px-4 py-2.5 rounded-full bg-[#DC2626] text-white text-[13px] font-bold hover:scale-[1.02] active:scale-95 transition-all"
              >
                <UserPlus size={15} /> {query.trim() ? `Add "${query.trim()}"` : 'Add someone else'}
              </button>
            </div>
          )}

          {tab === 'update' && updateList.length > 0 && (
            <div className="space-y-1">
              {updateList.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => handlePickStale(item)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 active:scale-[0.99] transition-all text-left"
                >
                  <div className="w-10 h-10 shrink-0 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-[15px]">
                    {String(item.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-bold text-[var(--text-primary)] truncate">{item.name}</div>
                    <div className="text-[12px] text-[var(--text-tertiary)] truncate">
                      {item.department || 'Faculty'}{item.existingDays?.length ? ` · hours on ${item.existingDays.join(', ')}` : ''}
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">Update</span>
                </button>
              ))}
            </div>
          )}

          {tab === 'update' && updateList.length === 0 && (
            <div className="text-center py-8">
              <div className="text-[14px] font-bold text-[var(--text-primary)]">
                {query.trim() ? `No matches for "${query.trim()}"` : 'All data is up to date 🎉'}
              </div>
              <div className="text-[13px] text-[var(--text-tertiary)] mt-1">
                Nothing flagged as outdated right now.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  const formBody = (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4 pt-2 chat-scroll">
      {celebration && (
        <div className="rounded-xl border border-[#DC2626]/25 bg-[#DC2626]/5 p-3 flex items-start gap-2.5 mb-3">
          <Flame size={18} className="text-[#DC2626] flex-shrink-0 mt-0.5" />
          <div className="text-[13px] text-[var(--text-secondary)]">
            <span className="font-bold">{celebration.message}</span>{' '}
            <span className="opacity-80">{celebration.thanks}</span>
          </div>
        </div>
      )}

      {submitted && !celebration && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 flex items-start gap-2.5 mb-3">
          <CheckCircle2 size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
          <div className="text-[13px] text-[#1F2937] dark:text-[#E5E7EB]">
            <span className="font-bold">Thank you!</span> Sent for review — the team will publish it to the bot shortly.
          </div>
        </div>
      )}

      {formError && (
        <div className="rounded-xl border border-red-300/40 bg-red-50 dark:bg-red-900/20 p-3 flex items-start gap-2.5 mb-3">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-[13px] text-red-700 dark:text-red-300">{formError}</div>
        </div>
      )}

      <InstructorForm
        formData={formData}
        onChange={setFormData}
        onSubmit={handleSubmit}
        submitLabel="Submit for review"
        submitting={submitting}
        departments={departments}
        requiredFields={['name', 'email']}
        stickyActions
      />
    </div>
  );

  const doneBody = (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 text-center">
      <div className="w-16 h-16 rounded-full bg-green-500/15 text-green-500 flex items-center justify-center mb-4">
        <CheckCircle2 size={32} />
      </div>
      <div className="text-[18px] font-black text-[var(--text-primary)]">
        {celebration ? "You're a hero 🎉" : 'Sent for review'}
      </div>
      <div className="text-[13px] text-[var(--text-tertiary)] mt-1 max-w-[280px]">
        {celebration
          ? celebration.thanks
          : 'The team checks every entry before it goes live in the bot.'}
      </div>
      <button
        type="button"
        onClick={handleDone}
        className="mt-6 px-8 py-3.5 rounded-full bg-[#DC2626] text-white text-[14px] font-bold hover:scale-[1.02] active:scale-95 transition-all"
      >
        Done
      </button>
    </div>
  );

  const body = (
    <>
      {header}
      {step === 'pick' && pickBody}
      {step === 'form' && formBody}
      {step === 'done' && doneBody}
    </>
  );

  if (variant === 'inline') {
    return (
      <div className="h-full flex flex-col overflow-hidden rounded-[24px] sm:rounded-[32px] glass-surface border border-black/[0.03] dark:border-white/[0.05]">
        {body}
      </div>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[160] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="relative w-full sm:max-w-lg h-[88dvh] sm:h-auto sm:max-h-[85dvh] sm:min-h-0 rounded-t-[28px] sm:rounded-[32px] glass-surface overflow-hidden flex flex-col shadow-2xl"
          >
            {body}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
