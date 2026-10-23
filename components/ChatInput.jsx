"use client";

import PropTypes from 'prop-types';
import { Plus, ArrowUp } from 'lucide-react';
import { VoiceInput } from './VoiceInput';

export function ChatInput({
  value,
  onSend,
  onChange,
  onKeyDown,
  inlineSuggestion,
  placeholder = "Ask about a course, instructor, or office…",
  accessoryOpen = false,
  onAccessoryClick
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
    const cleaned = String(transcript || '').trim();
    if (!cleaned) return;
    const newValue = message ? `${message} ${cleaned}` : cleaned;
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
    if (onKeyDown) {
      const handled = onKeyDown(e, { message, inlineSuggestion, inlineRemainder });
      if (handled) return;
    }

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
    <div className="z-10 bg-[var(--paper)] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-5">
      <div className="mx-auto w-full max-w-[768px]">
        <div className="relative flex min-h-[52px] items-center gap-1 rounded-[26px] bg-[var(--surface)] px-1.5 py-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.05)] ring-1 ring-transparent transition-shadow focus-within:ring-[var(--rule)]">

          {onAccessoryClick && (
            <button
              type="button"
              onClick={onAccessoryClick}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                accessoryOpen
                  ? 'bg-[var(--accent)] text-white rotate-45'
                  : 'text-[var(--ink-soft)] hover:bg-[var(--surface-strong)] hover:text-[var(--ink)] active:scale-95'
              }`}
              aria-label="Add office hours"
              aria-expanded={accessoryOpen}
              title="Add office hours"
            >
              <Plus className="h-[18px] w-[18px]" strokeWidth={1.9} />
            </button>
          )}

          {inlineRemainder && (
            <div className={`pointer-events-none absolute inset-y-0 ${onAccessoryClick ? 'left-[52px]' : 'left-4'} right-[92px] flex items-center text-[16px] sm:text-[15px]`}>
              <span className="invisible whitespace-pre">{message}</span>
              <span className="whitespace-pre text-[var(--muted)] opacity-70">{inlineRemainder}</span>
            </div>
          )}

          <input
            type="text"
            value={message}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="h-9 min-w-0 flex-1 bg-transparent px-2 text-[16px] text-[var(--ink)] outline-none placeholder:text-[var(--muted)] sm:text-[15px]"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            aria-label="Ask MUBXBot"
          />

          <div className="shrink-0">
            <VoiceInput onResult={handleVoiceResult} />
          </div>

          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
              message.trim()
                ? 'bg-[var(--accent)] text-white hover:opacity-90 active:scale-95'
                : 'bg-[var(--surface-strong)] text-[var(--muted)] opacity-70'
            }`}
            aria-label="Send message"
            title="Send message"
          >
            <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </div>
  );
}

ChatInput.propTypes = {
  value: PropTypes.string,
  onSend: PropTypes.func.isRequired,
  onChange: PropTypes.func,
  onKeyDown: PropTypes.func,
  inlineSuggestion: PropTypes.string,
  placeholder: PropTypes.string,
  accessoryOpen: PropTypes.bool,
  onAccessoryClick: PropTypes.func,
};
