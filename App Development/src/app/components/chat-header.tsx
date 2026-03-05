import { Moon, Sun, GraduationCap } from 'lucide-react';

interface ChatHeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function ChatHeader({ theme, onToggleTheme }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
      {/* Avatar and Name */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col">
          <span className="text-[15px] font-semibold leading-tight text-[#1C1C1E] dark:text-white">
            MUBXBot
          </span>
          <span className="text-[12px] leading-tight text-[#8E8E93] dark:text-[#98989D]">
            Online
          </span>
        </div>
      </div>

      {/* Theme Toggle */}
      <button
        onClick={onToggleTheme}
        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
        aria-label="Toggle theme"
      >
        {theme === 'light' ? (
          <Sun className="w-5 h-5 text-[#8E8E93] dark:text-[#98989D] transition-transform hover:rotate-180 duration-500" />
        ) : (
          <Moon className="w-5 h-5 text-[#8E8E93] dark:text-[#98989D] transition-transform hover:rotate-180 duration-500" />
        )}
      </button>
    </div>
  );
}