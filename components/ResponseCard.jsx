import React from 'react';
import PropTypes from 'prop-types';

/**
 * Shared response frame for every bot answer.
 *
 * The academic snapshot established the visual language: a warm bordered
 * surface, a quiet accent header, compact micro-labels, and one red emphasis
 * per answer. These primitives keep every response on that same system.
 */

export function ResponseCard({ children, className = '' }) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-[var(--rule)] bg-[var(--panel)] ${className}`}>
      {children}
    </section>
  );
}

ResponseCard.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string
};

export function ResponseHeader({ label, meta, badge, badgeTone = 'accent' }) {
  const badgeClass = badgeTone === 'muted'
    ? 'border-[var(--rule)] bg-[var(--surface)] text-[var(--muted)]'
    : badgeTone === 'amber'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
      : 'border-[var(--accent-line)] bg-[var(--panel)] text-[var(--accent)]';

  return (
    <header className="flex min-h-9 items-center justify-between gap-3 border-b border-[var(--rule)] bg-[var(--accent-soft)] px-3.5 py-2">
      <span className="shrink-0 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
        {label}
      </span>
      <span className="flex min-w-0 items-center justify-end gap-1.5">
        {badge && (
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9.5px] font-semibold leading-none ${badgeClass}`}>
            {badge}
          </span>
        )}
        {meta && (
          <span className="truncate text-[10.5px] leading-none text-[var(--muted)]">
            {meta}
          </span>
        )}
      </span>
    </header>
  );
}

ResponseHeader.propTypes = {
  label: PropTypes.string.isRequired,
  meta: PropTypes.node,
  badge: PropTypes.node,
  badgeTone: PropTypes.oneOf(['accent', 'muted', 'amber'])
};

export function ResponseBody({ children, className = '' }) {
  return <div className={`px-3.5 py-3 ${className}`}>{children}</div>;
}

ResponseBody.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string
};

export function ResponseGrid({ children, className = '' }) {
  return <div className={`grid grid-cols-2 gap-x-4 gap-y-2.5 ${className}`}>{children}</div>;
}

ResponseGrid.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string
};

export function ResponseFact({
  label,
  value,
  detail,
  accent = false,
  wide = false,
  hero = false,
  className = ''
}) {
  return (
    <div className={`min-w-0 ${wide ? 'col-span-2' : ''} ${className}`}>
      <div className="text-[9.5px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
        {label}
      </div>
      <div className={`mt-0.5 break-words font-semibold leading-snug ${hero ? 'text-[15px]' : 'text-[12px]'} ${accent ? 'text-[var(--accent)]' : 'text-[var(--ink)]'}`}>
        {value}
      </div>
      {detail && (
        <div className="mt-0.5 break-words text-[10.5px] leading-snug text-[var(--muted)]">
          {detail}
        </div>
      )}
    </div>
  );
}

ResponseFact.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
  detail: PropTypes.node,
  accent: PropTypes.bool,
  wide: PropTypes.bool,
  hero: PropTypes.bool,
  className: PropTypes.string
};

export function ResponseRow({ children, onClick, className = '' }) {
  const classes = `flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${onClick ? 'hover:bg-[var(--surface)]/70' : ''} ${className}`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {children}
      </button>
    );
  }

  return <div className={classes}>{children}</div>;
}

ResponseRow.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  className: PropTypes.string
};

export function ResponseAvatar({ children }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[11px] font-semibold text-[var(--accent)]">
      {children}
    </span>
  );
}

ResponseAvatar.propTypes = {
  children: PropTypes.node.isRequired
};

export function ResponseDivider() {
  return <div className="mx-3.5 h-px bg-[var(--rule)]" aria-hidden="true" />;
}

export function ResponseText({ children, className = '' }) {
  return (
    <div className={`whitespace-pre-wrap text-[13.5px] leading-relaxed text-[var(--ink)] ${className}`}>
      {children}
    </div>
  );
}

ResponseText.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string
};

export function ResponseNote({ children, tone = 'surface', className = '' }) {
  const toneClass = tone === 'accent'
    ? 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--ink-soft)]'
    : 'border-[var(--rule)] bg-[var(--surface)]/60 text-[var(--ink-soft)]';

  return (
    <div className={`rounded-xl border px-3 py-2 text-[12px] leading-relaxed ${toneClass} ${className}`}>
      {children}
    </div>
  );
}

ResponseNote.propTypes = {
  children: PropTypes.node.isRequired,
  tone: PropTypes.oneOf(['surface', 'accent']),
  className: PropTypes.string
};

export function ResponseActions({ children, className = '' }) {
  return <div className={`flex flex-col gap-2 ${className}`}>{children}</div>;
}

ResponseActions.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string
};
