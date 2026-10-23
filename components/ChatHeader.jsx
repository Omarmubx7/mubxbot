"use client";

import { Moon, Sun, MessageSquareText, SquarePen } from 'lucide-react';
import PropTypes from 'prop-types';
import { BotShareButton } from './BotShareButton';

export function ChatHeader({ theme, onToggleTheme, onOpenFeedback, onNewChat, showNewChat = false }) {
  return (
    <header className="flex min-h-[56px] items-center gap-2 bg-[var(--paper)] px-2.5 pb-1.5 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-4">
      {/* Identity cluster */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--accent)] text-white" aria-hidden="true">
          <span className="text-[15px] font-semibold leading-none">M</span>
        </div>

        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[15px] font-semibold leading-tight tracking-[-0.01em] text-[var(--ink)]">
            MUBXBot
          </span>
          <span className="mt-0.5 hidden items-center gap-1.5 sm:flex">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
            <span className="truncate text-[11px] leading-none text-[var(--muted)]">
              HTU School of Computing
            </span>
            <a
              href="https://mubx.dev/links"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] leading-none text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
              title="Visit Omar Mubaidin's profile"
            >
              OM ↗
            </a>
          </span>
        </div>

        {showNewChat && onNewChat && (
          <button
            type="button"
            onClick={onNewChat}
            className="ml-0.5 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-medium text-[var(--ink-soft)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--ink)] active:scale-[0.98] sm:px-3"
            aria-label="Start a new chat"
          >
            <SquarePen className="h-4 w-4" strokeWidth={1.9} />
            <span className="hidden sm:inline">New chat</span>
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <BotShareButton />
        <button
          onClick={onOpenFeedback}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink-soft)] transition-all duration-200 hover:bg-[var(--surface)] hover:text-[var(--ink)] active:scale-95"
          title="Send feedback"
          aria-label="Send feedback"
        >
          <MessageSquareText className="h-4 w-4" strokeWidth={1.9} />
        </button>
        <button
          onClick={onToggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink-soft)] transition-all duration-200 hover:bg-[var(--surface)] hover:text-[var(--ink)] active:scale-95"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? (
            <Sun className="h-4 w-4 transition-transform duration-500 hover:rotate-180" strokeWidth={1.9} />
          ) : (
            <Moon className="h-4 w-4 transition-transform duration-500 hover:rotate-180" strokeWidth={1.9} />
          )}
        </button>
      </div>
    </header>
  );
}

ChatHeader.propTypes = {
  theme: PropTypes.oneOf(['light', 'dark']).isRequired,
  onToggleTheme: PropTypes.func.isRequired,
  onOpenFeedback: PropTypes.func.isRequired,
  onNewChat: PropTypes.func,
  showNewChat: PropTypes.bool,
};
