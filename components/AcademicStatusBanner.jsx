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
          className="group flex h-10 min-w-0 flex-1 items-center gap-1.5 px-3 text-left transition-colors duration-200 hover:bg-[var(--surface)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)] sm:gap-2 sm:px-4"
        >
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full sm:hidden ${tone.dot}`} aria-hidden="true" />

          <span className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
            <span className="truncate text-[12.5px] font-semibold leading-none text-[var(--ink)]">
              {state.title}
            </span>
            {weekChip && (
              <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-1.5 py-0.5 text-[9.5px] font-semibold leading-none text-[var(--accent)] sm:hidden">
                {weekChip}
              </span>
            )}
            <span className="hidden truncate text-[11.5px] leading-none text-[var(--muted)] sm:inline">
              · {compactDetail}
            </span>
          </span>

          <span className="flex shrink-0 items-baseline gap-1 tabular-nums">
            <span className={`text-[13px] font-semibold leading-none ${tone.text}`}>
              {state.countdown.value}
            </span>
            <span className="text-[10.5px] leading-none text-[var(--muted)]">
              {state.countdown.unit}
            </span>
          </span>

          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-[var(--muted)] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
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
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 top-full z-30 overflow-hidden border-b border-[var(--rule)] bg-[var(--panel)] shadow-[0_18px_40px_rgba(20,20,18,0.14)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.55)]"
          >
            <div className="px-3 pb-3 pt-2 sm:px-4">
              <div className="mb-2 flex items-baseline justify-between gap-3 text-[11px] leading-relaxed text-[var(--ink-soft)]">
                <span>{state.description}</span>
                <span className="shrink-0 text-[10.5px] text-[var(--muted)]">{state.range}</span>
              </div>

              {teaching?.weekend && teaching.hasNextWeek && (
                <div className="mb-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 rounded-lg bg-[var(--accent-soft)] px-2.5 py-1.5 text-[10.5px] leading-snug">
                  <span className="font-semibold text-[var(--accent)]">{teaching.phaseLabel}</span>
                  <span className="text-[var(--muted)]">·</span>
                  <span className="text-[var(--ink-soft)]">{teaching.nextWeekLabel}</span>
                </div>
              )}

              {state.others.length > 0 && (
                <div className="mb-2">
                  <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
                    Also active
                  </div>
                  <ul className="space-y-1">
                    {state.others.map((event) => (
                      <li key={event.id} className="flex items-baseline justify-between gap-3">
                        <span className="flex min-w-0 items-baseline gap-1.5">
                          <span className={`h-1 w-1 shrink-0 rounded-full ${(TONES[event.tone] || TONES.ink).dot}`} aria-hidden="true" />
                          <span className="truncate text-[11px] font-semibold text-[var(--ink)]">{event.title}</span>
                        </span>
                        <span className="shrink-0 text-[10.5px] text-[var(--muted)]">
                          {event.range}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {term && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  <CompactStat
                    label="Semester"
                    value={state.semester?.shortLabel || 'Term'}
                    detail={state.semester?.range || state.range}
                  />
                  {teaching && (
                    <CompactStat
                      label="Week"
                      value={teaching.started ? `${teaching.week} of ${teaching.totalWeeks}` : teaching.label}
                      detail={teaching.weekend ? teaching.nextWeekLabel : teaching.started ? 'Sunday–Thursday' : ''}
                      accent
                    />
                  )}
                  <CompactStat
                    label="Days left"
                    value={term.finished ? 'Complete' : String(term.daysLeft)}
                    detail={term.finished ? 'Semester finished' : `until ${state.semester?.endDate ? calendar.formatDateKey(state.semester.endDate, { withYear: false }) : 'the end'}`}
                  />
                  <CompactStat label="Elapsed" value={`${term.percent}%`} />
                  {quietWeek && (
                    <CompactStat wide label="Quiet week" value={calendar.formatRange(quietWeek)} />
                  )}
                  {state.nextEvent && (
                    <CompactStat
                      wide
                      label="Up next"
                      value={state.nextEvent.title}
                      detail={`${state.nextEvent.range} · ${state.nextEvent.daysUntil === 0
                        ? 'today'
                        : `in ${state.nextEvent.daysUntil} ${state.nextEvent.daysUntil === 1 ? 'day' : 'days'}`}`}
                    />
                  )}
                  {state.nextSemester && (
                    <CompactStat
                      wide
                      label="Next semester"
                      value={state.nextSemester.label}
                      detail={`${state.nextSemester.range} · in ${state.nextSemester.daysUntil} ${state.nextSemester.daysUntil === 1 ? 'day' : 'days'}`}
                    />
                  )}
                </div>
              )}

              {!term && state.semester && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  <CompactStat label="Semester" value={state.semester.label} detail={state.semester.range} />
                  {teaching && <CompactStat label="Week" value={teaching.label} accent />}
                </div>
              )}

              <div className="mt-2 flex items-center justify-between gap-3 text-[10.5px] text-[var(--muted)]">
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
