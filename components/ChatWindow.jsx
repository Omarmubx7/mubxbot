"use client";

import React, { useState, useEffect, useRef } from "react";
import { Monitor, Search, Plus, Send, User, School, MapPin, Mail, Clock } from "lucide-react";
import Fuse from "fuse.js";
import { AnimatePresence } from "framer-motion";
import MessageBubble from "./MessageBubble.jsx";
import { useDoctors } from "./Providers.jsx";

const DoctorInfo = ({ doctor }) => (
  <div className="space-y-3 py-1 text-[var(--text-primary)]">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-[var(--msg-bot)] flex items-center justify-center text-[var(--primary)] text-[20px]">
        👨‍🏫
      </div>
      <div>
        <h3 className="text-[15px] font-semibold">{doctor.name}</h3>
        <p className="text-[12px] text-[var(--text-secondary)] uppercase tracking-wide">{doctor.department}</p>
      </div>
    </div>
    <div className="space-y-2 ml-1">
      <div className="flex items-center gap-2.5 text-[14px]">
        <span>🎓 {doctor.school}</span>
      </div>
      <div className="flex items-center gap-2.5 text-[14px]">
        <span>📍 Office: {doctor.office}</span>
      </div>
      <div className="flex items-center gap-2.5 text-[14px] text-[var(--primary)]">
        <span>✉️ </span>
        <a href={`mailto:${doctor.email}`} className="hover:underline" aria-label={`Send email to ${doctor.name}`}>{doctor.email}</a>
      </div>
    </div>
    <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">🕒 Office Hours</span>
      </div>
      <div className="space-y-1 font-mono text-[13px]">
        {Object.entries(doctor.office_hours).map(([day, hours]) => (
          <div key={day} className="flex justify-between">
            <span className="text-[var(--text-primary)] font-medium">• {day}</span>
            <span className="text-[var(--text-secondary)]">{hours}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-entrance">
    <div className="text-[48px] mb-4">🎓</div>
    <h1 className="text-[18px] font-semibold text-[var(--text-primary)] mb-2">HTU Computing Directory</h1>
    <p className="text-[14px] text-[var(--text-secondary)] max-w-[240px]">Search for instructors by name, department, or office.</p>
  </div>
);

export default function ChatWindow() {
  const { instructors, loading, theme, setTheme } = useDoctors();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [fuseInstance, setFuseInstance] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isTyping, setIsTyping] = useState(false);
  const [lastDoctor, setLastDoctor] = useState(null);
  const chatEndRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    if (!loading && instructors.length > 0) {
      const fuseOptions = {
        threshold: 0.3,
        keys: ["name", "department", "school", "email", "office"]
      };
      setFuseInstance(new Fuse(instructors, fuseOptions));
    }
  }, [loading, instructors]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Debounced search logic for autocomplete
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (inputValue.trim().length > 1 && fuseInstance) {
      searchTimeoutRef.current = setTimeout(() => {
        const results = fuseInstance.search(inputValue).slice(0, 8);
        setSuggestions(results);
        setHighlightedIndex(-1);
      }, 200);
    } else {
      setSuggestions([]);
      setHighlightedIndex(-1);
    }

    return () => clearTimeout(searchTimeoutRef.current);
  }, [inputValue, fuseInstance]);

  const handleSend = (queryInput = null, forceDoctor = null) => {
    const query = forceDoctor ? forceDoctor.name : (queryInput || inputValue).trim();
    if (!query) return;
    
    setMessages(prev => [...prev, { id: Date.now(), sender: "user", content: query }]);
    setInputValue("");
    setSuggestions([]);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      
      // Context logic for "Office hours"
      if (query.toLowerCase().includes("office hours") && lastDoctor) {
        setMessages(prev => [...prev, { 
          id: Date.now() + 1, 
          sender: "system", 
          content: (
            <div className="space-y-2">
              <p className="text-[14px] font-medium">🕒 Office hours for {lastDoctor.name}:</p>
              <div className="space-y-1 font-mono text-[13px]">
                {Object.entries(lastDoctor.office_hours).map(([day, hours]) => (
                  <div key={day} className="flex justify-between">
                    <span>{day}:</span>
                    <span className="text-[var(--text-secondary)]">{hours}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        }]);
        return;
      }

      if (forceDoctor) {
        setLastDoctor(forceDoctor);
        setMessages(prev => [...prev, { id: Date.now() + 1, sender: "system", content: <DoctorInfo doctor={forceDoctor} /> }]);
        return;
      }

      const res = fuseInstance.search(query);
      
      if (res.length === 0) {
        setMessages(prev => [...prev, { 
          id: Date.now() + 1, 
          sender: "system", 
          content: `I couldn't find any instructors matching '${query}'. Try checking the spelling or browse by department.` 
        }]);
      } else if (res.length === 1) {
        const doctor = res[0].item;
        setLastDoctor(doctor);
        setMessages(prev => [...prev, { id: Date.now() + 1, sender: "system", content: <DoctorInfo doctor={doctor} /> }]);
      } else {
        // Disambiguation for multiple matches
        setMessages(prev => [...prev, { 
          id: Date.now() + 1, 
          sender: "system", 
          content: (
            <div className="space-y-3">
              <p className="text-[14px]">I found multiple instructors matching "{query}". Which one do you mean?</p>
              <div className="flex flex-col gap-2">
                {res.slice(0, 3).map(r => {
                  const doc = r.item;
                  const key = `${doc.name}|${doc.department}|${doc.office}`;
                  return (
                    <button
                      key={key}
                      onClick={() => handleSend(null, doc)}
                      className="text-left px-3 py-2 chip-radius border border-[var(--primary)] text-[var(--primary)] text-[13px] hover:bg-[var(--primary)]/5 transition-colors"
                    >
                      <div className="font-semibold">{doc.name}</div>
                      <div className="text-[11px] opacity-80">{doc.department} - {doc.office}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )
        }]);
      }
    }, 600);
  };

  const handleKeyDown = (e) => {
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === "Enter" && highlightedIndex >= 0) {
        e.preventDefault();
        const selected = suggestions[highlightedIndex].item;
        setInputValue(selected.name);
        handleSend(selected.name);
      } else if (e.key === "Enter") {
        handleSend();
      } else if (e.key === "Escape") {
        setSuggestions([]);
      }
    } else if (e.key === "Enter") {
      handleSend();
    }
  };

  const quickReplies = messages.length === 0 
    ? ["Search name", "By department", "Office hours"]
    : ["Search another", "Office hours only"];

  return (
    <div className="flex flex-col h-full bg-[var(--bg-chat)] relative overflow-hidden">
      {/* 5.1 Header - Pinned */}
      <header className="h-[60px] px-4 flex items-center justify-between bg-[var(--bg-page)]/80 backdrop-blur-md border-b border-black/5 dark:border-white/10 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#007AFF] to-[#0A84FF] flex items-center justify-center text-white">
            <Monitor size={20} />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)] leading-tight">MubxBot</h2>
            <p className="text-[12px] text-[var(--text-secondary)] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#34C759]" />
              Online
            </p>
          </div>
        </div>
        <button 
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-300 active:rotate-180"
          aria-label="Toggle light and dark theme"
        >
          {theme === "light" ? "☀️" : "🌙"}
        </button>
      </header>

      {/* Chat Area & Empty State - Scrollable */}
      <div className="flex-1 overflow-y-auto flex flex-col no-scrollbar" onClick={() => setSuggestions([])}>
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="p-4 space-y-2">
            <AnimatePresence initial={false}>
              {messages.map(m => <MessageBubble key={m.id} sender={m.sender}>{m.content}</MessageBubble>)}
              {isTyping && <MessageBubble key="typing" sender="system" isTyping />}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>
        )}

        {/* 5.3 Quick Replies - hidden when typing search */}
        {!isTyping && suggestions.length === 0 && (
          <div className="px-4 pb-4 flex flex-wrap gap-2 animate-entrance">
            {quickReplies.map(reply => (
              <button
                key={reply}
                onClick={() => {
                  if (reply === "Search name" || reply === "Search another") {
                    setInputValue("");
                    document.querySelector('input')?.focus();
                  } else {
                    setInputValue(reply);
                    document.querySelector('input')?.focus();
                  }
                }}
                className="px-4 py-2 chip-radius border-[1.5px] border-[var(--primary)] text-[var(--primary)] text-[14px] font-medium transition-all duration-200 hover:bg-[var(--primary)]/10 active:scale-[0.97]"
              >
                {reply}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Suggestions Overlay - Anchored to input bar */}
      {suggestions.length > 0 && (
        <div 
          className="absolute bottom-[80px] left-4 right-4 bg-[var(--bg-page)]/95 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden z-[60] animate-entrance"
          role="listbox"
        >
          {suggestions.map((s, index) => (
            <button 
              key={`${s.item.name}|${index}`} 
              onClick={() => {
                setInputValue(s.item.name);
                handleSend(s.item.name);
              }} 
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`w-full text-left p-3 cursor-pointer text-[var(--text-primary)] transition-colors flex items-center gap-3 border-none outline-none ${highlightedIndex === index ? "bg-[var(--primary)]/10" : "hover:bg-[var(--primary)]/5"}`}
              role="option"
              aria-selected={highlightedIndex === index}
            >
              <Search size={14} className="text-[var(--text-secondary)]" />
              <div className="flex-1">
                <div className={`text-[14px] ${highlightedIndex === index ? "font-bold" : "font-semibold"}`}>{s.item.name}</div>
                <div className="text-[11px] text-[var(--text-secondary)] uppercase">{s.item.department} - {s.item.office}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 5.4 Input Bar - Pinned */}
      <div className="h-[72px] px-4 flex items-center gap-3 bg-[var(--bg-page)]/80 backdrop-blur-md border-t border-black/5 dark:border-white/10 z-50 shadow-input">
        <button className="w-9 h-9 flex items-center justify-center text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
          <Plus size={24} />
        </button>
        <div className="flex-1 relative flex items-center">
          <input 
            className="w-full h-[40px] px-4 bg-[var(--msg-bot)] border-none input-radius text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:ring-2 focus:ring-[var(--accent)]/30 transition-all outline-none"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type doctor name..."
            aria-label="Search for a doctor by name"
          />
        </div>
        <button 
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 ${inputValue.trim() ? "bg-[var(--primary)] text-white shadow-md" : "bg-[var(--primary)]/50 text-white/70 cursor-not-allowed"}`}
          onClick={() => handleSend()}
          disabled={!inputValue.trim()}
          aria-label="Send message"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
