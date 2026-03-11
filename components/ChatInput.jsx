"use client";

import { Send } from 'lucide-react';
import { VoiceInput } from './VoiceInput';
 
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

  const handleVoiceResult = (transcript) => {
    // Append the voice result or replace if empty
    const newValue = message ? `${message} ${transcript}` : transcript;
    handleChange(newValue);
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
    <div className="flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:pb-3 glass-surface border-t border-black/5 dark:border-white/10 shadow-[0_-4px_24px_rgba(0,0,0,0.02)] z-10">
      {/* Input field with inline autocomplete */}
      <div className="flex-1 h-[46px] sm:h-11 relative rounded-full bg-white/50 dark:bg-black/40 border border-black/5 dark:border-white/5 focus-within:bg-white dark:focus-within:bg-black focus-within:border-red-500/30 focus-within:ring-2 focus-within:ring-red-500/20 transition-all shadow-inner my-1 flex items-center pr-2">
        
        {inlineRemainder && (
          <div className="absolute inset-y-0 left-0 px-4 flex items-center pointer-events-none text-[15px]">
            <span className="invisible whitespace-pre">{message}</span>
            <span className="text-[#8E8E93] dark:text-[#98989D] whitespace-pre opacity-60">{inlineRemainder}</span>
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

        <div className="mr-1">
          <VoiceInput onResult={handleVoiceResult} />
        </div>
      </div>

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={!message.trim()}
        className={`w-[46px] h-[46px] sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all ${
          message.trim() 
            ? 'bg-gradient-to-br from-red-600 to-red-500 text-white shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30 hover:scale-[1.02] active:scale-[0.98]' 
            : 'bg-[#E9ECEF] dark:bg-[#2C2C2E] text-[#8E8E93] dark:text-[#98989D] opacity-70'
        }`}
        aria-label="Send message"
      >
        <Send className={`w-[22px] h-[22px] ${message.trim() ? '-ml-0.5' : ''}`} />
      </button>
    </div>
  );
}
