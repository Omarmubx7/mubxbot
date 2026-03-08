"use client";

import { Plus, Send } from 'lucide-react';
 
export function ChatInput({
  value,
  onSend,
  onChange,
  inlineSuggestion,
  placeholder = "Type doctor name…"
}) {
  const message = value ?? '';

  const handleChange = (val) => {
    if (onChange) onChange(val);
  };

  const handleSend = () => {
    if (message.trim()) {
      onSend(message.trim());
      if (onChange) onChange('');
    }
  };

  const getInlineRemainder = () => {
    if (!message || !inlineSuggestion) return '';
    if (inlineSuggestion.toLowerCase().startsWith(message.toLowerCase()) && inlineSuggestion.length > message.length) {
      return inlineSuggestion.slice(message.length);
    }
    return '';
  };

  const inlineRemainder = getInlineRemainder();

  const handleKeyDown = (e) => {
    if (e.key === 'Tab' && inlineRemainder) {
      e.preventDefault();
      if (onChange) onChange(inlineSuggestion);
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:pb-3 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800">
      {/* Input field with inline autocomplete */}
      <div className="flex-1 h-11 sm:h-10 relative rounded-full bg-[#E9ECEF] dark:bg-[#2C2C2E] focus-within:ring-2 focus-within:ring-[#DC2626] dark:focus-within:ring-[#EF4444] transition-shadow">
        {inlineRemainder && (
          <div className="absolute inset-0 px-4 flex items-center pointer-events-none text-[15px]">
            <span className="invisible whitespace-pre">{message}</span>
            <span className="text-[#8E8E93] dark:text-[#98989D] whitespace-pre">{inlineRemainder}</span>
          </div>
        )}
        <input
          type="text"
          value={message}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full h-full px-4 rounded-full bg-transparent text-[#1C1C1E] dark:text-white placeholder:text-[#8E8E93] dark:placeholder:text-[#98989D] text-[16px] sm:text-[15px] outline-none"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
      </div>

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={!message.trim()}
        className="w-11 h-11 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-[#DC2626] dark:bg-[#EF4444] hover:bg-[#B91C1C] dark:hover:bg-[#DC2626] disabled:bg-[#E9ECEF] dark:disabled:bg-[#2C2C2E] transition-colors active:scale-95"
        aria-label="Send message"
      >
        <Send className={`w-5 h-5 ${message.trim() ? 'text-white' : 'text-[#8E8E93] dark:text-[#98989D]'}`} />
      </button>
    </div>
  );
}
