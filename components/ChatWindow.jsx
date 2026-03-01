"use client";

import React, { useState, useEffect, useRef } from "react";
import { Moon, Sun, GraduationCap, Plus, Send, Search, X, ArrowRight, Mail, MapPin, Clock, User } from "lucide-react";
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
  } catch (e) {
    return <span>{text}</span>;
  }
};

const InstructorCard = ({ doctor }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    className="p-5 glass-card rounded-[28px] space-y-5 text-[var(--text-primary)] shadow-sm border border-white/20"
  >
    <div className="flex items-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
        <User size={28} strokeWidth={1.5} />
      </div>
      <div>
        <h3 className="text-[18px] font-bold leading-tight tracking-tight">{doctor.name}</h3>
        <p className="text-[13px] text-[var(--text-secondary)] font-medium mt-0.5">{doctor.department}</p>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-2">
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.02]">
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
  const [lastDoctor, setLastDoctor] = useState(null);
  const chatEndRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    if (!loading && instructors && instructors.length > 0) {
      const fuse = new Fuse(instructors, { 
        threshold: 0.3, 
        includeMatches: true,
        keys: ["name", "department", "office", "email"] 
      });
      setFuseInstance(fuse);
      
      if (messages.length === 0) {
        setMessages([{
          id: "welcome",
          sender: "system",
          content: "Welcome to MBOT Intelligence. I can help you find instructors, browse departments, and locate offices at the School of Computing.",
          timestamp: new Date()
        }]);
      }
    }
  }, [loading, instructors, messages.length]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (inputValue && inputValue.trim().length > 0 && fuseInstance) {
      searchTimeoutRef.current = setTimeout(() => {
        setSuggestions(fuseInstance.search(inputValue).slice(0, 6));
        setHighlightedIndex(-1);
      }, 100);
    } else {
      setSuggestions([]);
    }
    return () => clearTimeout(searchTimeoutRef.current);
  }, [inputValue, fuseInstance]);

  const handleSend = (overrideValue = null, specificDoctor = null) => {
    const valToUse = (typeof overrideValue === 'string') ? overrideValue : null;
    let query = (valToUse || inputValue || "").toString().trim();
    
    if (!query && !specificDoctor) return;

    const originalQuery = query;
    const aliases = { "cs": "Computer Science", "ai": "Data Science", "cyber": "Cyber Security" };
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
          setLastDoctor(specificDoctor);
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
                    <ArrowRight size={14} className="opacity-40 text-[var(--text-tertiary)]" />
                  </button>
                ))}
              </div>
            </div>
          ), timestamp: new Date() }]);
          return;
        }

        if (!fuseInstance) return;
        const res = fuseInstance.search(query);
        if (res.length === 0) {
          setMessages(prev => [...prev, { id: Date.now() + 1, sender: "system", content: `No results found for “${originalQuery}”.`, timestamp: new Date() }]);
        } else if (res.length === 1) {
          handleSend(null, res[0].item);
        } else {
          setMessages(prev => [...prev, { id: Date.now() + 1, sender: "system", content: (
            <div className="space-y-3">
              <p className="text-[14px] font-medium opacity-70 text-[var(--text-primary)]">Multiple matches found:</p>
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
      } catch (err) {
        console.error(err);
      }
    }, 500);
  };

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden font-sans relative">
      <header className="flex items-center justify-between px-6 py-4 glass-surface sticky top-0 z-50 backdrop-blur-3xl pt-safe">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#007AFF] to-[#5856D6] flex items-center justify-center shadow-lg shadow-blue-500/20">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-[17px] font-bold leading-tight tracking-tight text-[var(--text-primary)]">MBOT</span>
            <span className="text-[12px] text-[var(--success)] font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
              Intelligence
            </span>
          </div>
        </div>
        <button onClick={() => setTheme(theme === "light" ? "dark" : "light")} className="w-10 h-10 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 hover:scale-110 active:scale-90 transition-all">
          {theme === 'light' ? <Sun size={18} className="text-[#636366]" /> : <Moon size={18} className="text-[#AEAEB2]" />}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto py-6 no-scrollbar relative chat-scroll" onClick={() => setSuggestions([])}>
        <div className="max-w-[640px] mx-auto w-full px-4">
          <AnimatePresence initial={false}>
            {messages.map((m) => <MessageBubble key={m.id} sender={m.sender} timestamp={m.timestamp}>{m.content}</MessageBubble>)}
            {isTyping && <MessageBubble sender="system" isTyping />}
          </AnimatePresence>
          <div ref={chatEndRef} className="h-32" />
        </div>
      </div>

      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-24 left-4 right-4 md:left-auto md:right-auto md:w-[500px] md:translate-x-[-50%] md:left-[50%] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-3xl border border-black/5 rounded-[28px] shadow-2xl overflow-hidden z-[60]"
          >
            {suggestions.map((s, index) => (
              <button key={index} onClick={() => handleSend(null, s.item)} onMouseEnter={() => setHighlightedIndex(index)}
                className={`w-full text-left p-4 flex items-center gap-4 transition-all border-b border-black/5 last:border-0 ${highlightedIndex === index ? "bg-[var(--primary)] text-white shadow-xl" : "hover:bg-black/5 dark:hover:bg-white/5"}`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${highlightedIndex === index ? "bg-white/20" : "bg-[var(--primary)]/10 text-[var(--primary)]"}`}>{s.item.name.charAt(0)}</div>
                <div className="flex-1 overflow-hidden">
                  <div className="font-bold text-[15px] truncate text-[var(--text-primary)]"><HighlightText text={s.item.name} highlight={inputValue} /></div>
                  <div className={`text-[11px] uppercase tracking-tighter opacity-60 truncate ${highlightedIndex === index ? "text-white" : "text-[var(--text-secondary)]"}`}><HighlightText text={s.item.department} highlight={inputValue} /></div>
                </div>
                <Search size={16} className="opacity-20" />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3 px-4 py-4 glass-surface border-t border-black/5 dark:border-white/10 backdrop-blur-3xl pb-safe">
        <button onClick={() => { setMessages([]); setLastDoctor(null); }} className="p-2.5 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 transition-colors active:scale-90" title="Reset Chat"><Plus className={`w-6 h-6 ${messages.length > 0 ? "rotate-45 text-red-500" : "text-[var(--primary)]"} transition-transform`} /></button>
        <input value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()} placeholder="Ask intelligence..."
          className="flex-1 h-11 px-5 rounded-full bg-black/5 dark:bg-white/10 text-[16px] outline-none focus:ring-2 focus:ring-[var(--primary)]/30 transition-all text-[var(--text-primary)] placeholder-[var(--text-tertiary)]" autoComplete="off" />
        <button onClick={() => handleSend()} disabled={!inputValue.trim()} className={`p-3 rounded-full transition-all active:scale-90 ${inputValue.trim() ? 'bg-[var(--primary)] text-white shadow-lg' : 'bg-black/5 dark:bg-white/5 text-gray-400 cursor-not-allowed'}`}><Send size={18} fill={inputValue.trim() ? "currentColor" : "none"} /></button>
      </div>
    </div>
  );
}
