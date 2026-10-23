"use client";

import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import calendar from '../lib/academicCalendar';

const TONES = {
  red: {
    bar: 'bg-[var(--accent)]',
    text: 'text-[var(--accent)]',
    chip: 'border-[var(--accent)]/35 text-[var(--accent)] bg-[var(--accent)]/[0.06]',
    dot: 'bg-[var(--accent)]'
  },
  amber: {
    bar: 'bg-amber-600',
    text: 'text-amber-700 dark:text-amber-400',
    chip: 'border-amber-600/35 text-amber-700 dark:text-amber-400 bg-amber-500/[0.08]',
    dot: 'bg-amber-500'
  },
  green: {
    bar: 'bg-emerald-700',
    text: 'text-emerald-700 dark:text-emerald-400',
    chip: 'border-emerald-700/35 text-emerald-700 dark:text-emerald-400 bg-emerald-500/[0.08]',
    dot: 'bg-emerald-600'
  },
  blue: {
    bar: 'bg-blue-700',
    text: 'text-blue-700 dark:text-blue-400',
    chip: 'border-blue-700/35 text-blue-700 dark:text-blue-400 bg-blue-500/[0.08]',
    dot: 'bg-blue-600'
  },
  ink: {
    bar: 'bg-[var(--ink)] dark:bg-[var(--ink)]',
    text: 'text-[var(--ink)]',
    chip: 'border-[var(--ink)]/30 text-[var(--ink)] bg-[var(--ink)]/[0.05]',
    dot: 'bg-[var(--ink)]'
  }
};

function useNow() {
  const [now, setNow] = useState(null);

  useEffect(() => {
    const update = () => setNow(new Date());
    update();

    const interval = globalThis.setInterval(update, 30000);
    const onVisibility = () => {
      if (globalThis.document?.visibilityState === 'visible') update();
    };

    globalThis.document?.addEventListener('visibilitychange', onVisibility);

    return () => {
      globalThis.clearInterval(interval);
      globalThis.document?.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return now;
}

function CompactStat({ label, value, detail, accent = false, wide = false }) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">{label}</div>
      <div className={`mt-0.5 text-[12px] font-semibold leading-snug ${accent ? 'text-[var(--accent)]' : 'text-[var(--ink)]'}`}>{value}</div>
      {detail && <div className="mt-0.5 text-[10.5px] leading-snug text-[var(--muted)]">{detail}</div>}
    </div>
  );
}

CompactStat.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  detail: PropTypes.string,
  accent: PropTypes.bool,
  wide: PropTypes.bool
};

export function AcademicStatusBanner() {
  const now = useNow();
  const [expanded, setExpanded] = useState(false);

  const state = useMemo(() => {
    if (!now) return null;
    const resolved = calendar.resolveBanner(now);
    return resolved.mode === 'none' ? null : resolved;
  }, [now]);

  if (!state) return null;

  const tone = TONES[state.tone] || TONES.ink;
  const progressPercent = state.progress == null
    ? null
    : Math.max(0, Math.min(100, Math.round(state.progress * 100)));
  const term = state.semesterProgress;
  const teaching = state.teachingWeek;
  const quietWeek = calendar.EVENTS.find((event) => event.id === 'quiet-week-spring-2027');
  const termLine = term
    ? teaching?.started
      ? `${state.semester?.shortLabel || 'Term'} · Week ${teaching.week}/${teaching.totalWeeks} · ${term.daysLeft}d left`
      : `${state.semester?.shortLabel || 'Term'} · ${teaching?.label || `${term.daysLeft} days left`}`
    : '';
  const compactDetail = state.mode === 'semester'
    ? state.description
    : [state.description, termLine].filter(Boolean).join(' · ');
  const weekChip = teaching?.started ? `W${teaching.week}` : null;

  return (
    <motion.section
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="brand-wash relative z-20 border-y border-[var(--rule)] bg-[var(--paper)]"
      aria-label="Academic calendar status"
    >
      <div className="flex items-stretch">
        <span className={`w-1 shrink-0 ${tone.bar}`} aria-hidden="true" />

        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls="academic-banner-details"
          className="group flex h-12 min-w-0 flex-1 items-center gap-0 text-left transition-colors duration-200 hover:bg-[var(--surface)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden px-3 sm:px-4">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tone.dot}`} aria-hidden="true" />
            <span className="truncate text-[14px] font-semibold leading-none text-[var(--ink)]">
              {state.title}
            </span>
            {teaching?.started && (
              <div className="hidden items-center gap-1.5 rounded-full px-2 py-1 sm:flex" style={{ backgroundColor: 'var(--accent-soft)' }}>
                <span className={`text-[12px] font-bold leading-none ${tone.text}`}>{teaching.week}</span>
                <span className="text-[11px] leading-none text-[var(--muted)]">/ {teaching.totalWeeks}</span>
              </div>
            )}
            {weekChip && (
              <span className="shrink-0 rounded-full px-2 py-1 text-[10px] font-bold leading-none sm:hidden" style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}>
                {weekChip}/{teaching?.totalWeeks}
              </span>
            )}
          </div>

          <div className="hidden h-full w-px bg-[var(--rule)] sm:block" aria-hidden="true" />

          <div className="flex shrink-0 items-center gap-4 px-3 sm:gap-5 sm:px-4">
            {term?.daysLeft != null && !term.finished && state.mode === 'semester' && (
              <div className="hidden items-center gap-1.5 sm:flex">
                <span className="text-[14px] font-semibold tabular-nums leading-none text-[var(--ink)]">
                  {term.daysLeft}
                </span>
                <span className="text-[11px] leading-none text-[var(--muted)]">days left</span>
              </div>
            )}
            <div className="flex items-baseline gap-1 tabular-nums">
              <span className={`text-[16px] font-black leading-none ${tone.text}`}>
                {state.countdown.value}
              </span>
              <span className="text-[11px] leading-none text-[var(--muted)]">
                {state.countdown.unit}
              </span>
            </div>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-[var(--muted)] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </div>
        </button>
      </div>

      {progressPercent != null && (
        <div className="h-px w-full bg-[var(--rule)]" aria-hidden="true">
          <div className={`h-px ${tone.bar} transition-[width] duration-500`} style={{ width: `${progressPercent}%` }} />
        </div>
      )}

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id="academic-banner-details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 top-full z-30 overflow-hidden border-b border-[var(--rule)] bg-[var(--panel)] shadow-[0_24px_60px_rgba(20,20,18,0.18)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.65)]"
          >
            <div className="mx-auto max-w-7xl px-4 pb-4 pt-3 sm:px-6">
              <div className="mb-3 text-[11.5px] text-[var(--muted)]">{state.description} · {state.range}</div>

              {term && (
                <div className="mb-4">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">Semester Progress</span>
                    <span className="text-[10.5px] tabular-nums text-[var(--muted)]">{term.percent}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-strong)]">
                    <div className={`h-full ${tone.bar}`} style={{ width: `${term.percent}%` }} />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--muted)]">
                    <span>{state.semester?.shortLabel || 'Term'}</span>
                    <span>{term.finished ? 'Completed' : `${term.daysLeft} days remaining`}</span>
                  </div>
                </div>
              )}

              {teaching?.weekend && teaching.hasNextWeek && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[var(--accent)]/25 bg-gradient-to-r from-[var(--accent-soft)] to-transparent px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[var(--accent)]" aria-hidden="true" />
                    <span className="text-[12px] font-semibold text-[var(--accent)]">{teaching.phaseLabel}</span>
                    <span className="text-[11.5px] text-[var(--ink-soft)]">{teaching.nextWeekLabel}</span>
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {state.others.length > 0 && (
                  <div className="rounded-xl border border-[var(--rule)] bg-[var(--panel)] p-3 shadow-sm">
                    <div className="mb-2 text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">Also happening</div>
                    <div className="space-y-1.5">
                      {state.others.map((event) => (
                        <div key={event.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${(TONES[event.tone] || TONES.ink).dot}`} aria-hidden="true" />
                            <span className="text-[12px] font-medium text-[var(--ink)]">{event.title}</span>
                          </div>
                          <span className="text-[10.5px] text-[var(--muted)]">{event.range}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {state.nextEvent && (
                  <div className="rounded-xl border border-[var(--rule)] bg-[var(--panel)] p-3 shadow-sm">
                    <div className="mb-2 text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">Up next</div>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-[var(--ink)]">{state.nextEvent.title}</span>
                      <span className="text-[10.5px] text-[var(--muted)]">
                        {state.nextEvent.range} · {state.nextEvent.daysUntil === 0 ? 'today' : `in ${state.nextEvent.daysUntil}d`}
                      </span>
                    </div>
                  </div>
                )}
                {quietWeek && (
                  <div className="rounded-xl border border-[var(--rule)] bg-[var(--panel)] p-3 shadow-sm">
                    <div className="mb-2 text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">Quiet week</div>
                    <span className="text-[12px] text-[var(--ink-soft)]">{calendar.formatRange(quietWeek)}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between text-[10px] text-[var(--muted)]">
                <span>Asia/Amman · GMT+3</span>
                <span>Tap to close</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
