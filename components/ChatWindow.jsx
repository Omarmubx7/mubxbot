"use client";

import React, { useState, useEffect, useRef } from "react";
import { Monitor, Search, Plus, Send } from "lucide-react";
import Fuse from "fuse.js";
import { AnimatePresence } from "framer-motion";
import MessageBubble from "./MessageBubble.jsx";
import { useDoctors } from "./Providers.jsx";

const DoctorInfo = ({ doctor }) => (
  <div className="space-y-3 py-1 text-[var(--text-primary)] animate-entrance">
    <div className="flex items-center gap-3 mb-2">
      <div className="text-[20px]">👤</div>
      <h3 className="text-[15px] font-semibold">{doctor.name}</h3>
    </div>
    <div className="space-y-2.5 ml-0.5">
      <div className="flex items-start gap-2.5 text-[14px]">
        <span className="w-5 text-center">🏫</span>
        <span className="flex-1 opacity-90">{doctor.department} / {doctor.school}</span>
      </div>
      <div className="flex items-start gap-2.5 text-[14px]">
        <span className="w-5 text-center">🏢</span>
        <span className="flex-1 opacity-90">Office: {doctor.office}</span>
      </div>
      <div className="flex items-start gap-2.5 text-[14px]">
        <span className="w-5 text-center">✉️</span>
        <a 
          href={`mailto:${doctor.email}`} 
          className="text-[var(--primary)] hover:underline flex-1" 
          aria-label={`Send email to ${doctor.name}`}
        >
          {doctor.email}
        </a>
      </div>
    </div>
    <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/10">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-5 text-center text-[14px]">🕐</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">Office Hours:</span>
      </div>
      <div className="space-y-1.5 ml-7 font-sans text-[13px]">
        {Object.entries(doctor.office_hours).map(([day, hours]) => (
          <div key={day} className="flex justify-between border-b border-black/[0.03] dark:border-white/[0.03] pb-1">
            <span className="text-[var(--text-primary)] font-medium">{day}</span>
            <span className="text-[var(--text-secondary)]">{hours || "Closed"}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-entrance bg-[var(--bg-chat)]">
    <div className="text-[48px] mb-4 drop-shadow-sm">🎓</div>
    <h1 className="text-[18px] font-semibold text-[var(--text-primary)] mb-2">HTU Computing Directory</h1>
    <p className="text-[14px] text-[var(--text-secondary)] max-w-[260px] leading-relaxed">Search for instructors by name, department, or office.</p>
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
      
      // Welcome message
      setMessages([{
        id: "welcome",
        sender: "system",
        content: "Hi! 👋 I can help you find HTU computing instructors. Try typing a name like 'Israa' or a department like 'Cyber Security'.",
        timestamp: new Date()
      }]);
    }
  }, [loading, instructors]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (inputValue.trim().length > 1 && fuseInstance) {
      searchTimeoutRef.current = setTimeout(() => {
        const results = fuseInstance.search(inputValue).slice(0, 10);
        setSuggestions(results);
        setHighlightedIndex(-1);
      }, 150);
    } else {
      setSuggestions([]);
      setHighlightedIndex(-1);
    }

    return () => clearTimeout(searchTimeoutRef.current);
  }, [inputValue, fuseInstance]);

  const handleSend = (overrideValue = null, specificDoctor = null) => {
    const query = (overrideValue || inputValue).trim();
    if (!query && !specificDoctor) return;

    const userMsg = { 
      id: Date.now().toString(), 
      sender: "user", 
      content: specificDoctor ? specificDoctor.name : query,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setSuggestions([]);
    
    if (specificDoctor) {
      setLastDoctor(specificDoctor);
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          sender: "system",
          content: <DoctorInfo doctor={specificDoctor} />,
          timestamp: new Date()
        }]);
      }, 600);
      return;
    }

    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      
      // Handle special command "Office hours only"
      if (query.toLowerCase().includes("office hours only") && lastDoctor) {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          sender: "system",
          content: (
            <div className="space-y-2">
              <span className="text-[14px] font-semibold">🕐 Office Hours for {lastDoctor.name}:</span>
              <div className="space-y-1 ml-4 text-[13px]">
                {Object.entries(lastDoctor.office_hours).map(([day, hours]) => (
                  <div key={day} className="flex justify-between border-b border-black/5 dark:border-white/5 pb-1 max-w-[200px]">
                    <span className="font-medium">{day}</span>
                    <span className="text-[var(--text-secondary)]">{hours || "Closed"}</span>
                  </div>
                ))}
              </div>
            </div>
          ),
          timestamp: new Date()
        }]);
        return;
      }

      const res = fuseInstance.search(query);
      
      if (res.length === 0) {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          sender: "system",
          content: `I couldn't find any instructors matching '${query}'. Try checking the spelling or browse by department.`,
          timestamp: new Date()
        }]);
      } else if (res.length === 1) {
        const doc = res[0].item;
        setLastDoctor(doc);
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          sender: "system",
          content: <DoctorInfo doctor={doc} />,
          timestamp: new Date()
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          sender: "system",
          content: (
            <div className="space-y-3">
              <p className="text-[14px]">I found multiple instructors matching "{query}". Which one do you mean?</p>
              <div className="flex flex-col gap-2 pt-1">
                {res.slice(0, 3).map((r, i) => (
                  <button
                    key={`${r.item.name}|${i}`}
                    onClick={() => handleSend(null, r.item)}
                    className="w-full text-left p-3 min-h-[44px] rounded-xl border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all active:scale-[0.98] flex flex-col justify-center"
                  >
                    <span className="font-bold text-[14px] leading-tight">{r.item.name}</span>
                    <span className="text-[11px] opacity-80 leading-tight">{r.item.department} • {r.item.office}</span>
                  </button>
                ))}
              </div>
            </div>
          ),
          timestamp: new Date()
        }]);
      }
    }, 800);
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

  const quickReplies = messages.length <= 1 
    ? ["Search name", "By department", "Office hours"]
    : ["Search another", "Office hours only"];

  return (
    <div className="flex flex-col h-full bg-[var(--bg-chat)] relative overflow-hidden font-sans pt-safe">
      <header className="h-[60px] min-h-[60px] px-4 flex items-center justify-between bg-[var(--bg-page)]/80 backdrop-blur-md border-b border-black/5 dark:border-white/10 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-gradient-to-tr from-[#007AFF] to-[#0A84FF] flex items-center justify-center shadow-sm">
            <Monitor size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)] leading-tight">MubxBot</h2>
            <p className="text-[12px] text-[var(--text-secondary)] flex items-center gap-1.5 font-normal">
              <span className="w-2 h-2 rounded-full bg-[#34C759] shadow-sm animate-pulse" />
              Online
            </p>
          </div>
        </div>
        <button 
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-all duration-300 active:rotate-180"
          aria-label="Toggle light and dark theme"
        >
          {theme === "light" ? "☀️" : "🌙"}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto flex flex-col no-scrollbar bg-[var(--bg-chat)]" onClick={() => setSuggestions([])}>
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="p-4 space-y-1">
            <AnimatePresence initial={false}>
              {messages.map(m => (
                <MessageBubble 
                  key={m.id} 
                  sender={m.sender} 
                  timestamp={m.timestamp || new Date()}
                >
                  {m.content}
                </MessageBubble>
              ))}
              {isTyping && <MessageBubble key="typing" sender="system" isTyping />}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>
        )}

        {!isTyping && suggestions.length === 0 && (
          <div className="px-4 pb-4 flex flex-wrap gap-2 animate-entrance mt-auto">
            {quickReplies.map(reply => (
              <button
                key={reply}
                onClick={() => {
                  if (reply === "Search name" || reply === "Search another") {
                    setInputValue("");
                    document.querySelector('input')?.focus();
                  } else {
                    handleSend(reply);
                  }
                }}
                className="px-4 py-2 min-h-[44px] chip-radius border-[1.5px] border-[var(--primary)] text-[var(--primary)] text-[14px] font-medium transition-all duration-200 hover:bg-[var(--primary)]/10 active:scale-[0.97]"
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
          className="absolute bottom-[calc(72px+env(safe-area-inset-bottom)+12px)] left-4 right-4 bg-[var(--bg-page)]/95 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-2xl shadow-xl overflow-y-auto max-h-[40vh] z-[60] animate-entrance no-scrollbar"
          role="listbox"
        >
          {suggestions.map((s, index) => (
            <button 
              key={`${s.item.name}|${index}`} 
              onClick={() => handleSend(s.item.name)} 
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`w-full text-left p-3 min-h-[44px] cursor-pointer text-[var(--text-primary)] transition-colors flex items-center gap-3 border-none outline-none ${highlightedIndex === index ? "bg-[var(--primary)]/10" : "hover:bg-[var(--primary)]/5"}`}
            >
              <Search size={14} className="text-[var(--text-secondary)]" />
              <div className="flex-1">
                <div className={`text-[14px] ${highlightedIndex === index ? "font-bold" : "font-semibold"}`}>{s.item.name}</div>
                <div className="text-[11px] text-[var(--text-secondary)] uppercase tracking-tight">{s.item.department} • {s.item.office}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="h-[72px] min-h-[72px] px-4 pb-safe flex items-center gap-3 bg-[var(--bg-page)]/80 backdrop-blur-md border-t border-black/5 dark:border-white/10 z-50 shadow-input">
        <button className="w-11 h-11 flex items-center justify-center text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors active:scale-90">
          <Plus size={24} />
        </button>
        <div className="flex-1 relative flex items-center">
          <label htmlFor="doctor-search" className="sr-only">Search for a doctor by name</label>
          <input 
            id="doctor-search"
            className="w-full h-[44px] px-4 bg-[var(--msg-bot)] border-none input-radius text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:ring-2 focus:ring-[var(--accent)]/30 transition-all outline-none"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type doctor name..."
          />
        </div>
        <button 
          className={`w-11 h-11 min-w-[44px] rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 ${inputValue.trim() ? "bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/20" : "bg-[var(--primary)]/50 text-white/70 cursor-not-allowed"}`}
          onClick={() => handleSend()}
          disabled={!inputValue.trim()}
          aria-label="Send message"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
