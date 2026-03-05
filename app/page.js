"use client";

import React, { useState, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';
import { Search, X } from 'lucide-react';
import { ChatHeader } from '../components/ChatHeader';
import { ChatMessage } from '../components/ChatMessage';
import { QuickReplies } from '../components/QuickReplies';
import { TypingIndicator } from '../components/TypingIndicator';
import { ChatInput } from '../components/ChatInput';
import { EmptyState } from '../components/EmptyState';
import { useDoctors } from '../components/Providers';

export default function Page() {
  const { instructors, loading, theme, setTheme } = useDoctors();
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [fuseInstance, setFuseInstance] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [inputValue, setInputValue] = useState('');
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (instructors && instructors.length > 0) {
      const fuse = new Fuse(instructors, {
        threshold: 0.3,
        includeMatches: true,
        keys: ["name", "department", "office", "email"]
      });
      setFuseInstance(fuse);
    }
  }, [instructors]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const formatOffice = (query) => {
    const officeMatch = query.match(/^([A-Z])(\d{3})$/i);
    if (officeMatch) return `${officeMatch[1].toUpperCase()}-${officeMatch[2]}`;
    return query;
  };

  const getAlias = (query) => {
    const aliases = {
      "cs": "CS",
      "ai": "AI",
      "cyber": "Cyber",
      "petersons": "Petersons",
      "it": "Information Technology"
    };
    return aliases[query.toLowerCase()] || query;
  };

  const InstructorCard = ({ doctor }) => (
    <div className="space-y-3 py-1">
      <div className="font-semibold text-[16px]">👤 {doctor.name}</div>
      <div className="text-[14px] opacity-90">🏫 {doctor.department}</div>
      <div className="text-[14px] opacity-90">🏢 {doctor.office || "TBD"}</div>
      <div className="text-[14px]">
        ✉️ <a href={`mailto:${doctor.email}`} className="text-[#007AFF] dark:text-[#0A84FF] underline decoration-[#007AFF]/30">{doctor.email}</a>
      </div>
      <div className="pt-2 mt-2 border-t border-black/5 dark:border-white/5">
        <div className="text-[13px] font-semibold mb-1">🕐 Office Hours:</div>
        <div className="space-y-1">
          {Object.entries(doctor.office_hours || {}).map(([day, hours]) => (
            <div key={day} className="flex justify-between text-[13px]">
              <span className="opacity-70">{day}:</span>
              <span className="font-medium">{hours || "Closed"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const handleInputChange = (val) => {
    setInputValue(val);
    if (val.trim() && fuseInstance) {
      const results = fuseInstance.search(val).slice(0, 5);
      setSuggestions(results);
    } else {
      setSuggestions([]);
    }
  };

  const handleSendMessage = (text, specificDoctor = null) => {
    if (!text.trim() && !specificDoctor) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: specificDoctor ? specificDoctor.name : text,
      timestamp: getCurrentTime(),
    };

    setMessages(prev => [...prev, userMessage]);
    setSuggestions([]);
    setInputValue('');

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      if (specificDoctor) {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          type: 'bot',
          content: <InstructorCard doctor={specificDoctor} />,
          timestamp: getCurrentTime()
        }]);
      } else {
        handleBotResponse(text);
      }
    }, 800);
  };

  const handleBotResponse = (userText) => {
    let query = userText.trim();
    query = getAlias(query);
    query = formatOffice(query);

    const lowerText = query.toLowerCase();

    if (lowerText === "by department") {
      const departments = [...new Set(instructors.map(i => i.department))].sort();
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'bot',
        content: (
          <div className="space-y-2">
            <div className="font-bold text-[14px]">Explore Departments:</div>
            <div className="flex flex-wrap gap-2 pt-1">
              {departments.map(dept => (
                <button
                  key={dept}
                  onClick={() => handleSendMessage(dept)}
                  className="px-3 py-1.5 rounded-full border border-[#007AFF] text-[#007AFF] dark:text-[#0A84FF] text-[13px] font-medium hover:bg-[#007AFF]/5 active:scale-95 transition-all"
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>
        ),
        timestamp: getCurrentTime()
      }]);
      return;
    }

    if (lowerText === "search name" || lowerText === "office hours") {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'bot',
        content: "Please type the name of the instructor you're looking for.",
        timestamp: getCurrentTime()
      }]);
      return;
    }

    if (!fuseInstance) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'bot',
        content: "I'm still preparing the directory. Please wait just a second.",
        timestamp: getCurrentTime()
      }]);
      return;
    }

    const results = fuseInstance.search(query);

    if (results.length === 0) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'bot',
        content: `I couldn't find any instructors matching '${userText}'. Try checking the spelling or browse by department.`,
        timestamp: getCurrentTime(),
        quickReplies: ['By department', 'Office hours']
      }]);
    } else if (results.length === 1) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'bot',
        content: <InstructorCard doctor={results[0].item} />,
        timestamp: getCurrentTime(),
        quickReplies: ['Search another', 'By department']
      }]);
    } else {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'bot',
        content: (
          <div className="space-y-3">
            <div className="text-[14px] opacity-70">Matches found:</div>
            <div className="grid gap-2">
              {results.slice(0, 5).map((r, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(r.item.name, r.item)}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-white/50 dark:bg-black/20 hover:bg-[#007AFF]/10 transition-all text-left group border border-black/5 dark:border-white/5"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center font-bold text-[14px] group-hover:bg-[#007AFF] group-hover:text-white transition-colors">
                    {r.item.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[14px] truncate">{r.item.name}</div>
                    <div className="text-[11px] opacity-50 truncate uppercase tracking-tight">{r.item.department}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ),
        timestamp: getCurrentTime()
      }]);
    }
  };

  if (loading) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
          <p className="text-gray-400 font-medium animate-pulse tracking-tight">Initializing MUBXBot...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="h-[100dvh] w-full flex justify-center items-center overflow-hidden bg-[#F2F2F7] dark:bg-[#000000] relative font-sans">
      {/* Background Mesh */}
      <div className="absolute inset-0 pointer-events-none z-0" style={{ 
        backgroundImage: 'radial-gradient(at 0% 0%, rgba(0, 122, 255, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(88, 86, 214, 0.15) 0px, transparent 50%)' 
      }} />
      
      {/* Main Container */}
      <div className="w-full max-w-[960px] h-[100dvh] md:h-[90vh] md:rounded-[32px] md:shadow-2xl relative z-10 overflow-hidden flex flex-col bg-white dark:bg-black">
        {/* Header */}
        <ChatHeader theme={theme} onToggleTheme={toggleTheme} />

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-[#F8F9FA] dark:bg-[#1C1C1E] py-4 chat-scroll relative">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col justify-center">
              <EmptyState />
              <div className="flex justify-center mt-6">
                 <QuickReplies 
                  options={['Search name', 'By department', 'Office hours']} 
                  onSelect={(opt) => handleSendMessage(opt)}
                 />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div key={message.id} className="space-y-4">
                  <ChatMessage
                    type={message.type}
                    content={message.content}
                    timestamp={message.timestamp}
                  />
                  {message.quickReplies && index === messages.length - 1 && (
                    <QuickReplies
                      options={message.quickReplies}
                      onSelect={(opt) => handleSendMessage(opt)}
                    />
                  )}
                </div>
              ))}
              {isTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Suggestions Overlay */}
        {suggestions.length > 0 && (
          <div className="absolute bottom-[72px] left-4 right-4 md:left-auto md:right-auto md:w-[480px] md:left-1/2 md:-translate-x-1/2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
            <div className="px-4 py-2 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-white/50 dark:bg-black/50">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-40 text-black dark:text-white">Suggestions</span>
              <button onClick={() => setSuggestions([])} className="opacity-40 hover:opacity-100 transition-opacity text-black dark:text-white"><X size={14} /></button>
            </div>
            <div className="max-h-[240px] overflow-y-auto">
              {suggestions.map((s, index) => (
                <button
                  key={index}
                  onClick={() => handleSendMessage(s.item.name, s.item)}
                  className="w-full text-left p-3 hover:bg-[#007AFF]/10 transition-all flex items-center gap-3 border-b border-black/[0.02] dark:border-white/[0.02] last:border-0"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center font-bold text-[14px]">
                    {s.item.name.charAt(0)}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-[14px] font-bold truncate text-black dark:text-white">{s.item.name}</div>
                    <div className="text-[10px] uppercase tracking-widest opacity-50 truncate text-black dark:text-white">{s.item.department}</div>
                  </div>
                  <Search size={14} className="opacity-20 text-black dark:text-white" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <ChatInput onSend={handleSendMessage} onChange={handleInputChange} />
      </div>
    </main>
  );
}
