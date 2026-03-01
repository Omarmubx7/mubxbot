import { useState, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';
import { ChatHeader } from './components/chat-header';
import { ChatMessage } from './components/chat-message';
import { QuickReplies } from './components/quick-replies';
import { TypingIndicator } from './components/typing-indicator';
import { ChatInput } from './components/chat-input';
import { EmptyState } from './components/empty-state';
import { Search, X } from 'lucide-react';

interface Message {
  id: string | number;
  type: 'user' | 'bot';
  content: string | React.ReactNode;
  timestamp?: string;
  quickReplies?: string[];
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved as 'light' | 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [fuseInstance, setFuseInstance] = useState<Fuse<any> | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    fetch('/doctors.json')
      .then(res => res.json())
      .then(data => {
        setInstructors(data);
        const fuse = new Fuse(data, {
          threshold: 0.3,
          includeMatches: true,
          keys: ["name", "department", "office", "email"]
        });
        setFuseInstance(fuse);
      })
      .catch(err => console.error('Error loading doctors:', err));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const formatOffice = (query: string) => {
    const officeMatch = query.match(/^([A-Z])(\d{3})$/i);
    if (officeMatch) return `${officeMatch[1].toUpperCase()}-${officeMatch[2]}`;
    return query;
  };

  const getAlias = (query: string) => {
    const aliases: Record<string, string> = {
      "cs": "Computer Science",
      "ai": "Data Science",
      "cyber": "Cyber Security",
      "petersons": "Petersons",
      "it": "Information Technology"
    };
    return aliases[query.toLowerCase()] || query;
  };

  const InstructorCard = ({ doctor }: { doctor: any }) => (
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
              <span className="font-medium">{hours as string || "Closed"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const handleInputChange = (val: string) => {
    setInputValue(val);
    if (val.trim() && fuseInstance) {
      const results = fuseInstance.search(val).slice(0, 5);
      setSuggestions(results);
    } else {
      setSuggestions([]);
    }
  };

  const handleSendMessage = (text: string, specificDoctor?: any) => {
    if (!text.trim() && !specificDoctor) return;

    const userMessage: Message = {
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

  const handleBotResponse = (userText: string) => {
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

  return (
    <div className="flex flex-col h-screen max-w-[960px] mx-auto bg-white dark:bg-black md:shadow-lg md:my-0 relative overflow-hidden">
      {/* Header */}
      <ChatHeader theme={theme} onToggleTheme={toggleTheme} />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-[#F8F9FA] dark:bg-[#1C1C1E] py-4 chat-scroll">
        {messages.length === 0 ? (
          <div className="h-full">
            <EmptyState />
            <div className="flex justify-center mt-4">
               <QuickReplies 
                options={['Search name', 'By department', 'Office hours']} 
                onSelect={(opt) => handleSendMessage(opt)}
               />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message, index) => (
              <div key={message.id} className="space-y-3">
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
        <div className="absolute bottom-[72px] left-4 right-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
          <div className="px-4 py-2 border-b border-black/5 dark:border-white/5 flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-40">Suggestions</span>
            <button onClick={() => setSuggestions([])} className="opacity-40 hover:opacity-100 transition-opacity"><X size={14} /></button>
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
                  <div className="text-[14px] font-bold truncate">{s.item.name}</div>
                  <div className="text-[10px] uppercase tracking-widest opacity-50 truncate">{s.item.department}</div>
                </div>
                <Search size={14} className="opacity-20" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Bar */}
      <ChatInput onSend={handleSendMessage} onChange={handleInputChange} />
    </div>
  );
}
