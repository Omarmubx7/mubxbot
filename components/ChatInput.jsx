"use client";

import { Plus, Send } from 'lucide-react';
import { useState } from 'react';

export function ChatInput({ onSend, onChange, placeholder = "Type doctor name…" }) {
  const [message, setMessage] = useState('');

  const handleChange = (val) => {
    setMessage(val);
    if (onChange) onChange(val);
  };

  const handleSend = () => {
    if (message.trim()) {
      onSend(message.trim());
      setMessage('');
      if (onChange) onChange('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800">
      {/* Plus button */}
      <button
        className="w-9 h-9 rounded-full flex items-center justify-center bg-[#E9ECEF] dark:bg-[#2C2C2E] hover:bg-[#D1D5DB] dark:hover:bg-[#3A3A3C] transition-colors"
        aria-label="Add attachment"
      >
        <Plus className="w-5 h-5 text-[#DC2626] dark:text-[#EF4444]" />
      </button>

      {/* Input field */}
      <input
        type="text"
        value={message}
        onChange={(e) => handleChange(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        className="flex-1 h-10 px-4 rounded-full bg-[#E9ECEF] dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white placeholder:text-[#8E8E93] dark:placeholder:text-[#98989D] text-[15px] outline-none focus:ring-2 focus:ring-[#DC2626] dark:focus:ring-[#EF4444] transition-shadow"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
      />

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={!message.trim()}
        className="w-10 h-10 rounded-full flex items-center justify-center bg-[#DC2626] dark:bg-[#EF4444] hover:bg-[#B91C1C] dark:hover:bg-[#DC2626] disabled:bg-[#E9ECEF] dark:disabled:bg-[#2C2C2E] transition-colors active:scale-95"
        aria-label="Send message"
      >
        <Send className={`w-5 h-5 ${message.trim() ? 'text-white' : 'text-[#8E8E93] dark:text-[#98989D]'}`} />
      </button>
    </div>
  );
}
