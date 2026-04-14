"use client";

import { Moon, Sun, GraduationCap } from 'lucide-react';
import PropTypes from 'prop-types';
import { FeedbackButton } from './FeedbackButton';
import { BotShareButton } from './BotShareButton';

export function ChatHeader({ theme, onToggleTheme }) {
  return (
    <div className="flex items-center justify-between px-3 sm:px-4 py-3 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
      {/* Avatar and Name */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shrink-0">
          <GraduationCap className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold leading-tight text-[#1C1C1E] dark:text-white truncate">
              MUBXBot
            </span>
            <a 
              href="https://mubx.dev/links" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center px-1.5 py-[2px] rounded-full bg-[#DC2626]/10 dark:bg-[#DC2626]/20 text-[9px] font-bold tracking-wide text-[#DC2626] dark:text-[#EF4444] hover:bg-[#DC2626]/20 dark:hover:bg-[#DC2626]/30 transition-colors shrink-0"
              title="Visit Omar Mubaidin's profile"
            >
              by Omar Mubaidin
            </a>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            <span className="text-[12px] leading-tight text-[#8E8E93] dark:text-[#98989D]">
              Online • Spring 26
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2.5">
        <FeedbackButton />
          <BotShareButton />
        <button
          onClick={onToggleTheme}
          className="w-10 h-10 sm:w-9 sm:h-9 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? (
            <Sun className="w-5 h-5 text-[#8E8E93] dark:text-[#98989D] transition-transform hover:rotate-180 duration-500" />
          ) : (
            <Moon className="w-5 h-5 text-[#8E8E93] dark:text-[#98989D] transition-transform hover:rotate-180 duration-500" />
          )}
        </button>
      </div>
    </div>
  );
}

ChatHeader.propTypes = {
  theme: PropTypes.oneOf(['light', 'dark']).isRequired,
  onToggleTheme: PropTypes.func.isRequired,
};
