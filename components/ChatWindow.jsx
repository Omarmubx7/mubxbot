"use client";

import React, { useState, useEffect, useRef } from "react";
import { Moon, Sun, GraduationCap, Plus, Send, Search, ArrowRight, User, Mail, MapPin, Clock } from "lucide-react";
import Fuse from "fuse.js";
import { AnimatePresence, motion } from "framer-motion";
import MessageBubble from "./MessageBubble.jsx";
import { useDoctors } from "./Providers.jsx";

const HighlightText = ({ text, highlight }) => {
  if (!text) return null;
  if (!highlight || !highlight.trim()) return <span>{text}</span>;
  try {
    const escaped = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.toString().split(new RegExp(`(${escaped})`, "gi"));
    return (
      <span>
        {parts.map((p, i) => p.toLowerCase() === highlight.toLowerCase() ? <mark key={i} className="bg-[var(--primary)]/20 text-[var(--primary)] font-bold rounded-[2px] px-0.5">{p}</mark> : p)}
      </span>
    );
  } catch (e) { return <span>{text}</span>; }
};

const InstructorCard = ({ doctor }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    className="p-5 glass-card rounded-[28px] space-y-5 text-[var(--text-primary)] shadow-sm border border-white/20"
  >
    <div className="flex items-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white shadow-lg">
        <User size={28} strokeWidth={1.5} />
      </div>
      <div>
        <h3 className="text-[18px] font-bold leading-tight tracking-tight">{doctor.name}</h3>
        <p className="text-[13px] text-[var(--text-secondary)] font-medium mt-0.5">{doctor.department}</p>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-2">
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03]">
        <MapPin size={16} className="text-[var(--text-tertiary)]" />
        <span className="text-[14px] font-medium opacity-90">Office {doctor.office || "TBD"}</span>
      </div>
      <a href={`mailto:${doctor.email || ''}`} className="flex items-center justify-between p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] hover:bg-[var(--primary)]/5 group transition-all border border-transparent hover:border-[var(--primary)]/20">
        <div className="flex items-center gap-3">
          <Mail size={16} className="text-[var(--text-tertiary)]" />
          <span className="text-[14px] font-medium text-[var(--primary)]">{doctor.email || "No email available"}</span>
        </div>
        <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 text-[var(--primary)]" />
      </a>
    </div>

    <div className="pt-2 border-t border-black/5 dark:border-white/5">
      <div className="flex items-center gap-2 mb-3">
        <Clock size={14} className="text-[var(--text-tertiary)]" />
        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-secondary)]">Weekly Availability</span>
      </div>
      <div className="grid grid-cols-1 gap-1">
        {Object.entries(doctor.office_hours || {}).map(([day, hours]) => (
          <div key={day} className="flex justify-between items-center py-1.5 px-1 border-b border-black/[0.02] dark:border-white/[0.02] last:border-0">
            <span className="text-[13px] font-semibold opacity-60">{day}</span>
            <span className={`text-[13px] ${hours ? "font-medium" : "opacity-30 italic"}`}>{hours || "Closed"}</span>
          </div>
        ))}
      </div>
    </div>
  </motion.div>
);

export default function ChatWindow() {
  const { instructors = [], loading = false, theme = "light", setTheme = () => {} } = useDoctors() || {};
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [fuseInstance, setFuseInstance] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    if (!loading && instructors && instructors.length > 0) {
      try {
        const fuse = new Fuse(instructors, { threshold: 0.3, includeMatches: true, keys: ["name", "department", "office", "email"] });
        setFuseInstance(fuse);
        if (messages.length === 0) {
          setMessages([{
            id: "welcome",
            sender: "system",
            content: "Welcome to MUBXBot. I can help you find instructors, departments, and offices at the School of Computing.",
            timestamp: new Date()
          }]);
        }
      } catch (e) { console.error(e); }
    }
  }, [loading, instructors, messages.length]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (inputValue && inputValue.trim().length > 0 && fuseInstance) {
      searchTimeoutRef.current = setTimeout(() => {
        try {
          const results = fuseInstance.search(inputValue).slice(0, 6);
          setSuggestions(results);
          setHighlightedIndex(-1);
        } catch (e) { setSuggestions([]); }
      }, 100);
    } else { setSuggestions([]); }
    return () => clearTimeout(searchTimeoutRef.current);
  }, [inputValue, fuseInstance]);

  const handleSend = (overrideValue = null, specificDoctor = null) => {
    const valToUse = (typeof overrideValue === 'string') ? overrideValue : null;
    let query = (valToUse || inputValue || "").toString().trim();
    if (!query && !specificDoctor) return;

    const originalQuery = query;
    const aliases = { "cs": "Computer Science", "ai": "Data Science", "cyber": "Cyber Security", "petersons": "Petersons", "it": "Information Technology" };
    if (aliases[query.toLowerCase()]) query = aliases[query.toLowerCase()];
    const officeMatch = query.match(/^([A-Z])(\d{3})$/i);
    if (officeMatch) query = `${officeMatch[1].toUpperCase()}-${officeMatch[2]}`;

    setMessages(prev => [...prev, { id: Date.now().toString(), sender: "user", content: specificDoctor ? specificDoctor.name : originalQuery, timestamp: new Date() }]);
    setInputValue("");
    setSuggestions([]);
    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      try {
        if (specificDoctor) {
          setMessages(prev => [...prev, { id: Date.now() + 1, sender: "system", content: <InstructorCard doctor={specificDoctor} />, timestamp: new Date() }]);
          return;
        }

        if (query.toLowerCase() === "by department") {
          const departments = [...new Set(instructors.map(i => i.department))].sort();
          setMessages(prev => [...prev, { id: Date.now() + 1, sender: "system", content: (
            <div className="space-y-3 p-1">
              <p className="text-[14px] font-bold text-[var(--text-primary)]">Explore Departments</p>
              <div className="grid grid-cols-1 gap-2">
                {departments.map(dept => (
                  <button key={dept} onClick={() => handleSend(dept)} className="flex items-center justify-between p-3 rounded-2xl glass-card hover:bg-[var(--primary)]/10 transition-all text-left">
                    <span className="text-[14px] font-medium text-[var(--text-primary)]">{dept}</span>
                    <ArrowRight size={14} className="opacity-40" />
                  </button>
                ))}
              </div>
            </div>
          ), timestamp: new Date() }]);
          return;
        }

        if (!fuseInstance) {
          setMessages(prev => [...prev, { id: Date.now() + 1, sender: "system", content: "I'm still preparing the directory. Please wait just a second.", timestamp: new Date() }]);
          return;
        }

        const res = fuseInstance.search(query);
        if (res.length === 0) {
          setMessages(prev => [...prev, { id: Date.now() + 1, sender: "system", content: `No results found for “${originalQuery}”.`, timestamp: new Date() }]);
        } else if (res.length === 1) {
          setMessages(prev => [...prev, { id: Date.now() + 1, sender: "system", content: <InstructorCard doctor={res[0].item} />, timestamp: new Date() }]);
        } else {
          setMessages(prev => [...prev, { id: Date.now() + 1, sender: "system", content: (
            <div className="space-y-3">
              <p className="text-[14px] font-medium opacity-70 text-[var(--text-primary)]">Matches found:</p>
              <div className="grid gap-2">
                {res.slice(0, 5).map((r, i) => (
                  <button key={i} onClick={() => handleSend(null, r.item)} className="flex items-center gap-3 p-3 rounded-2xl glass-card hover:bg-[var(--primary)]/10 transition-all text-left group">
                    <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold text-[14px] group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">{r.item.name.charAt(0)}</div>
                    <div className="flex-1 overflow-hidden">
                      <div className="font-bold text-[14px] truncate text-[var(--text-primary)]">{r.item.name}</div>
                      <div className="text-[11px] uppercase tracking-tighter opacity-50 truncate text-[var(--text-secondary)]">{r.item.department}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ), timestamp: new Date() }]);
        }
      } catch (err) { console.error(err); }
    }, 500);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length > 0 && highlightedIndex >= 0) { handleSend(null, suggestions[highlightedIndex].item); } 
      else { handleSend(); }
    } else if (e.key === "ArrowDown" && suggestions.length > 0) {
      e.preventDefault(); setHighlightedIndex(p => (p < suggestions.length - 1 ? p + 1 : p));
    } else if (e.key === "ArrowUp" && suggestions.length > 0) {
      e.preventDefault(); setHighlightedIndex(p => (p > 0 ? p - 1 : p));
    } else if (e.key === "Escape") { setSuggestions([]); }
  };

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden font-sans relative">
      <header className="flex items-center justify-between px-6 py-4 glass-surface sticky top-0 z-[100] border-b border-black/[0.03] dark:border-white/[0.03] backdrop-blur-3xl pt-safe">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#DC2626] to-[#B91C1C] flex items-center justify-center shadow-lg shadow-red-500/20">
            <GraduationCap className="w-6 h-6 text-white" strokeWidth={2} />
          </div>
          <div className="flex flex-col">
            <span className="text-[17px] font-bold leading-tight tracking-tight text-[var(--text-primary)]">MUBXBot</span>
            <span className="text-[12px] text-[var(--success)] font-bold flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
              Online
            </span>
          </div>
        </div>
        <button onClick={() => setTheme(theme === "light" ? "dark" : "light")} className="w-10 h-10 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 hover:scale-110 active:scale-90 transition-all border border-black/5 dark:border-white/10">
          {theme === 'light' ? <Sun size={18} className="text-[var(--text-secondary)]" /> : <Moon size={18} className="text-[#AEAEB2]" />}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto py-6 no-scrollbar relative chat-scroll" onClick={() => setSuggestions([])}>
        <div className="max-w-[640px] mx-auto w-full px-4 text-[var(--text-primary)]">
          <AnimatePresence mode="popLayout" initial={false}>
            <div className="space-y-6">
              {messages.map((m) => <MessageBubble key={m.id} sender={m.sender} timestamp={m.timestamp}>{m.content}</MessageBubble>)}
              {isTyping && <MessageBubble sender="system" isTyping />}
            </div>
          </AnimatePresence>
          <div ref={chatEndRef} className="h-32" />
        </div>
      </div>

      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }}
            className="absolute bottom-28 left-4 right-4 md:left-auto md:right-auto md:w-[540px] md:translate-x-[-50%] md:left-[50%] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-3xl border border-black/5 dark:border-white/10 rounded-[32px] shadow-2xl overflow-hidden z-[60] text-[var(--text-primary)]"
          >
            <div className="px-6 py-2.5 border-b border-black/[0.03] flex justify-between items-center bg-white/20 dark:bg-black/20">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Suggestions</span>
              <button onClick={() => setSuggestions([])} className="opacity-40 hover:opacity-100 transition-opacity"><X size={14} /></button>
            </div>
            <div className="max-h-[320px] overflow-y-auto no-scrollbar">
              {suggestions.map((s, index) => (
                <button key={index} onClick={() => handleSend(null, s.item)} onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full text-left p-4.5 transition-all flex items-center gap-4 ${highlightedIndex === index ? "bg-[var(--primary)] text-white shadow-xl" : "hover:bg-black/5 dark:hover:bg-white/5"}`}
                >
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-[16px] ${highlightedIndex === index ? "bg-white/20" : "bg-[var(--primary)]/10 text-[var(--primary)]"}`}>{s.item.name.charAt(0)}</div>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-[16px] font-bold truncate text-[var(--text-primary)]"><HighlightText text={s.item.name} highlight={inputValue} /></div>
                    <div className={`text-[11px] mt-0.5 font-bold uppercase tracking-widest ${highlightedIndex === index ? "text-white/70" : "text-[var(--text-secondary)]"} truncate`}><HighlightText text={s.item.department} highlight={inputValue} /></div>
                  </div>
                  <Search size={18} className="opacity-20" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3 px-4 py-4 bg-white/40 dark:bg-black/40 backdrop-blur-3xl border-t border-black/5 dark:border-white/10 pb-safe">
        <button onClick={() => { setMessages([]); setLastDoctor(null); }} className="p-2.5 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 transition-colors active:scale-90" title="Reset Chat"><Plus className={`w-6 h-6 ${messages.length > 0 ? "rotate-45 text-red-500" : "text-[var(--primary)]"} transition-transform`} /></button>
        <input value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask intelligence..."
          className="flex-1 h-11 px-5 rounded-full bg-black/5 dark:bg-white/10 text-[16px] outline-none focus:ring-2 focus:ring-[var(--primary)]/30 transition-all text-[var(--text-primary)] placeholder-[var(--text-tertiary)]" autoComplete="off" />
        <button onClick={() => handleSend()} disabled={!inputValue.trim()} className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90 ${inputValue.trim() ? 'bg-[var(--primary)] text-white shadow-lg' : 'bg-black/5 dark:bg-white/5 text-gray-400 cursor-not-allowed'}`}><Send size={18} fill={inputValue.trim() ? "currentColor" : "none"} /></button>
      </div>
    </div>
  );
}
