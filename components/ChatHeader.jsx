"use client";

import { Moon, Sun, GraduationCap, MessageSquareText } from 'lucide-react';
import PropTypes from 'prop-types';
import { BotShareButton } from './BotShareButton';

export function ChatHeader({ theme, onToggleTheme, onOpenFeedback }) {
  return (
    <header className="flex items-center gap-2 px-3 pt-safe pb-2.5 min-h-[54px] bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
      {/* Identity cluster */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shrink-0">
          <GraduationCap className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[16px] font-semibold leading-tight text-[#1C1C1E] dark:text-white truncate">
            MUBXBot
          </span>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></span>
            <span className="text-[11px] leading-tight text-[#8E8E93] dark:text-[#98989D] truncate">
              Online • Spring 26
            </span>
          </div>
          <a
            href="https://mubx.dev/links"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-semibold leading-tight text-[#DC2626] dark:text-[#EF4444] hover:opacity-80 transition-opacity truncate"
            title="Visit Omar Mubaidin's profile"
          >
            by Omar Mubaidin ↗
          </a>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <BotShareButton />
        <button
          onClick={onOpenFeedback}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          title="Send feedback"
          aria-label="Send feedback"
        >
          <MessageSquareText className="w-5 h-5 text-[#8E8E93] dark:text-[#98989D]" strokeWidth={2} />
        </button>
        <button
          onClick={onToggleTheme}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? (
            <Sun className="w-5 h-5 text-[#8E8E93] dark:text-[#98989D] transition-transform hover:rotate-180 duration-500" />
          ) : (
            <Moon className="w-5 h-5 text-[#8E8E93] dark:text-[#98989D] transition-transform hover:rotate-180 duration-500" />
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
};
