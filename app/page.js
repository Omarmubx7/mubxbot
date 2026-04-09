"use client";

import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Fuse from 'fuse.js';
import { Search, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { ChatHeader } from '../components/ChatHeader';
import { ChatMessage } from '../components/ChatMessage';
import { QuickReplies } from '../components/QuickReplies';
import { TypingIndicator } from '../components/TypingIndicator';
import { ChatInput } from '../components/ChatInput';
import { EmptyState } from '../components/EmptyState';
import { useDoctors } from '../components/Providers';
import { OfficeHoursDisplay } from '../components/OfficeHoursDisplay';

const SmartFieldCard = ({ title, value, subtitle, accent = 'text-[#DC2626] dark:text-[#EF4444]' }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="space-y-3 py-2 px-3 rounded-xl bg-white/20 dark:bg-white/5 border border-white/20 dark:border-white/10"
  >
    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8E8E93] dark:text-[#98989D]">
      {title}
    </div>
    <div className={`text-[16px] font-bold break-words ${accent}`}>
      {typeof value === 'string' && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)
        ? <a href={`mailto:${value}`} className="underline decoration-current/30 hover:decoration-current">{value}</a>
        : value}
    </div>
    {subtitle && (
      <div className="text-[13px] opacity-70 break-words">
        {subtitle}
      </div>
    )}
  </motion.div>
);

SmartFieldCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  subtitle: PropTypes.string,
  accent: PropTypes.string,
};

const capitalizeDay = (value) => {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const describeRequestedField = (context) => {
  const answerType = context?.answerType;
  if (answerType === 'email') return 'email';
  if (answerType === 'office') return 'office location';
  if (answerType === 'department') return 'department';
  if (answerType === 'hours') {
    return context?.specificDay
      ? `${capitalizeDay(context.specificDay)} office hours`
      : 'office hours';
  }
  return 'details';
};

const buildContextualFollowupQuery = (professorName, context) => {
  const normalizedName = String(professorName || '').trim();
  if (!normalizedName) return professorName;

  const answerType = context?.answerType;
  if (answerType === 'email') return `what ${normalizedName}`;
  if (answerType === 'office') return `where ${normalizedName}`;
  if (answerType === 'department') return `${normalizedName} department`;
  if (answerType === 'hours') {
    if (context?.specificDay) return `when ${normalizedName} on ${context.specificDay}`;
    return `when ${normalizedName}`;
  }

  return normalizedName;
};

// Robust UUID generator for insecure contexts (e.g., HTTP LAN testing) where crypto.randomUUID is undefined
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.trunc(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  }); // NOSONAR
}

export default function Page() {
  const { instructors, officeHours, loading, theme, setTheme } = useDoctors();
  const [messages, setMessages] = useState(() => ([
    {
      id: 'welcome-message',
      type: 'bot',
      content: (
        <div className="space-y-3">
          <div className="font-bold text-[16px]">👋 Welcome to MUBXBot!</div>
          <div className="text-[14px] leading-relaxed opacity-90">
            Your go-to assistant for finding instructor information at HTU's School of Computing and Informatics.
          </div>
          <div className="space-y-2">
            <div className="text-[13px] font-semibold opacity-95">🔍 What I can help you with:</div>
            <div className="text-[13px] opacity-85 space-y-1 pl-4">
              <div>• Find instructor contact details</div>
              <div>• Check office hours and availability</div>
              <div>• Search by name, department, or office</div>
              <div>• Get complete instructor profiles</div>
            </div>
          </div>
          <div className="text-[13px] opacity-80 pt-1">
            💡 <span className="font-medium">Quick tip:</span> Use <strong>what</strong> for email, <strong>when</strong> for office hours, <strong>where</strong> for office code, or just type an instructor's name.
          </div>
        </div>
      ),
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      quickReplies: ['Search name', 'By department', 'Office hours']
    }
  ]));
  const [isTyping, setIsTyping] = useState(false);
  const [fuseInstance, setFuseInstance] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState('general');
  const [feedbackMissingName, setFeedbackMissingName] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackContext, setFeedbackContext] = useState(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  
  const messagesEndRef = useRef(null);
  const conversationIdRef = useRef('');
  const analyticsUserIdRef = useRef('');

  useEffect(() => {
    let storedUserId = '';
    let storedConversationId = '';

    try {
      storedUserId = globalThis.localStorage.getItem('mubx_analytics_user_id') || '';
      storedConversationId = globalThis.sessionStorage.getItem('mubx_analytics_conversation_id') || '';
    } catch (e) {
      // Storage access might be denied in strict privacy modes
      console.warn('Storage access is disabled');
    }

    const userId = storedUserId || generateUUID();
    const conversationId = storedConversationId || generateUUID();

    analyticsUserIdRef.current = userId;
    conversationIdRef.current = conversationId;

    try {
      if (!storedUserId) globalThis.localStorage.setItem('mubx_analytics_user_id', userId);
      if (!storedConversationId) globalThis.sessionStorage.setItem('mubx_analytics_conversation_id', conversationId);
    } catch (e) {
      console.warn('Storage write disabled', e);
    }
  }, []);

  useEffect(() => {
    if (instructors && instructors.length > 0) {
      // Normalize departments before indexing with Fuse (Bug #10)
      const normalizedInstructors = instructors.map(inst => ({
        ...inst,
        department: normalizeDepartment(inst.department)
      }));
      
      const fuse = new Fuse(normalizedInstructors, {
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

  const withAnalyticsMeta = (payload) => ({
    ...payload,
    userId: analyticsUserIdRef.current || generateUUID(),
    conversationId: conversationIdRef.current || generateUUID()
  });

  const openFeedbackForm = ({
    category = 'general',
    missingName = '',
    userQuery = '',
    requestLabel = ''
  } = {}) => {
    setFeedbackCategory(category);
    setFeedbackMissingName(missingName);
    setFeedbackMessage('');
    setFeedbackError('');
    setFeedbackContext({
      userQuery,
      requestLabel,
      sourcePath: globalThis.location?.pathname || '/'
    });
    setFeedbackOpen(true);
  };

  const closeFeedbackForm = () => {
    setFeedbackOpen(false);
    setFeedbackSubmitting(false);
    setFeedbackError('');
  };

  const submitFeedback = async (event) => {
    event.preventDefault();

    if (feedbackCategory === 'missing_name' && !feedbackMissingName.trim()) {
      setFeedbackError('Please enter the missing instructor name.');
      return;
    }

    if (feedbackCategory === 'general' && !feedbackMessage.trim()) {
      setFeedbackError('Please enter your feedback message.');
      return;
    }

    try {
      setFeedbackSubmitting(true);
      setFeedbackError('');

      const payload = withAnalyticsMeta({
        category: feedbackCategory,
        missingName: feedbackMissingName,
        message: feedbackMessage,
        userQuery: feedbackContext?.userQuery,
        requestLabel: feedbackContext?.requestLabel,
        sourcePath: feedbackContext?.sourcePath
      });

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || body?.details || 'Could not submit feedback');
      }

      closeFeedbackForm();
      setMessages((prev) => ([
        ...prev,
        {
          id: `feedback-${Date.now()}`,
          type: 'bot',
          content: 'Thanks for the feedback. It has been sent to the admin dashboard for review.',
          timestamp: getCurrentTime(),
          quickReplies: ['Search another', 'By department']
        }
      ]));
    } catch (error) {
      setFeedbackError(String(error?.message || error || 'Could not submit feedback'));
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const getOfficeHoursByEmail = (email) => {
    if (!email || !officeHours) return [];
    return officeHours.filter(hour => hour.email?.toLowerCase() === email?.toLowerCase());
  };

  const formatOffice = (query) => {
    const officeMatch = query.match(/^([A-Z])(\d{3})$/i);
    if (officeMatch) return `${officeMatch[1].toUpperCase()}-${officeMatch[2]}`;
    return query;
  };

  // Normalize and validate time ranges (Bug #8, #9)
  const formatTimeRange = (timeStr) => {
    if (!timeStr || timeStr === "Closed") return timeStr;

    // Check for invalid times like "40:00"
    const invalidTimePattern = /(\d{2,}):(\d{2})/g;
    const matches = [...timeStr.matchAll(invalidTimePattern)];
    for (const match of matches) {
      const hours = Number.parseInt(match[1]);
      const minutes = Number.parseInt(match[2]);
      if (hours > 23 || minutes > 59) {
        return "Invalid time - please contact admin";
      }
    }

    // If already has AM/PM, return as-is
    if (/AM|PM|am|pm/i.test(timeStr)) {
      return timeStr;
    }

    // Parse time range like "11:30 - 1:00" or "2:30 - 4:00"
    const rangeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
    if (rangeMatch) {
      let [, startHr, startMin, endHr, endMin] = rangeMatch;
      startHr = Number.parseInt(startHr);
      endHr = Number.parseInt(endHr);

      const startPeriod = startHr >= 8 && startHr < 12 ? "AM" : "PM";
      let endPeriod = "PM";
      if (endHr >= 8 && endHr < 12) endPeriod = "AM";
      
      return `${startHr}:${startMin} ${startPeriod} - ${endHr}:${endMin} ${endPeriod}`;
    }

    // Single time without range
    const singleMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (singleMatch) {
      const hr = Number.parseInt(singleMatch[1]);
      const period = hr >= 8 && hr < 12 ? "AM" : "PM";
      return timeStr.replace(/(\d{1,2}:\d{2})/, `$1 ${period}`);
    }

    return timeStr;
  };

  // Normalize department names (Bug #10)
  const normalizeDepartment = (dept) => {
    if (!dept) return dept;
    
    const normalized = dept.trim().toLowerCase();
    
    // Computer Science variants
    if (normalized === 'cs' || normalized === 'computer science') {
      return 'Computer Science';
    }
    
    // Cybersecurity variants
    if (normalized === 'cyber security' || 
        normalized === 'cybersecurity' || 
        normalized === 'cyber security department') {
      return 'Cybersecurity';
    }
    
    // AI & Data Science variants
    if (normalized.includes('data science') || 
        normalized.includes('ai') || 
        normalized.includes('artificial intelligence') ||
        normalized.includes('artificial intelligent')) {
      return 'AI & Data Science';
    }
    
    // Information Technology
    if (normalized === 'it' || normalized === 'information technology') {
      return 'Information Technology';
    }
    
    // Return original with proper casing if no match
    return dept.charAt(0).toUpperCase() + dept.slice(1).toLowerCase();
  };

  const sanitizeInput = (query) => {
    const cleaned = query.replaceAll(/[^a-zA-Z0-9\s@.-]/g, '').trim();
    if (cleaned.length < 2) return null;
    return cleaned;
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


  const OfficeHoursCard = ({ data, officeHoursOverride, emptyStateMessage }) => (
    <OfficeHoursDisplay
      officeHours={(officeHoursOverride || data.officeHours || []).map(slot => ({
        ...slot,
        office: slot.office || data.office,
        email: slot.email || data.email,
        department: slot.department || data.department,
        faculty: slot.faculty || data.name || data.professor
      }))}
      faculty={data.name || data.professor}
      email={data.email}
      department={normalizeDepartment(data.department)}
      office={data.office}
      emptyStateMessage={emptyStateMessage}
    />
  );

  OfficeHoursCard.propTypes = {
    data: PropTypes.shape({
      officeHours: PropTypes.array,
      office: PropTypes.string,
      email: PropTypes.string,
      department: PropTypes.string,
      name: PropTypes.string,
      professor: PropTypes.string,
    }).isRequired,
    officeHoursOverride: PropTypes.array,
    emptyStateMessage: PropTypes.string,
  };

  const SmartAnswerCard = ({ professor, response, context }) => {
    const answerType = context?.answerType || 'profile';
    const facultyName = professor?.name || professor?.professor;

    if (answerType === 'hours') {
      return (
        <SmartFieldCard
          title={context?.specificDay ? `${capitalizeDay(context.specificDay)} Office Hours` : 'Office Hours'}
          value={response}
          subtitle={facultyName ? `${facultyName}` : null}
          accent="text-[var(--text-primary)]"
        />
      );
    }

    if (answerType === 'email') {
      return (
        <SmartFieldCard
          title="Email"
          value={response}
          subtitle={facultyName ? `${facultyName}` : null}
        />
      );
    }

    if (answerType === 'office') {
      return (
        <SmartFieldCard
          title="Office Code"
          value={response}
          subtitle={facultyName ? `${facultyName}` : null}
        />
      );
    }

    if (answerType === 'department') {
      return (
        <SmartFieldCard
          title="Department"
          value={response}
          subtitle={facultyName ? `${facultyName}` : null}
          accent="text-[var(--text-primary)]"
        />
      );
    }

    return <OfficeHoursCard data={professor} />;
  };

  SmartAnswerCard.propTypes = {
    professor: PropTypes.shape({
      name: PropTypes.string,
      professor: PropTypes.string,
    }).isRequired,
    response: PropTypes.string.isRequired,
    context: PropTypes.shape({
      answerType: PropTypes.string,
      specificDay: PropTypes.string,
    }).isRequired,
  };

  const renderTextWithClickableEmails = (text) => {
    if (!text) return null;

    const emailChunkRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const isEmail = (value) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);

    return text.split('\n').map((line, lineIndex) => (
      <React.Fragment key={`line-${lineIndex}`}>
        {line.split(emailChunkRegex).map((chunk, chunkIndex) => {
          if (isEmail(chunk)) {
            return (
              <a
                key={`chunk-${lineIndex}-${chunkIndex}`}
                href={`mailto:${chunk}`}
                className="text-[#DC2626] dark:text-[#EF4444] underline decoration-[#DC2626]/30"
              >
                {chunk}
              </a>
            );
          }

          return <React.Fragment key={`chunk-${lineIndex}-${chunkIndex}`}>{chunk}</React.Fragment>;
        })}
        {lineIndex < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  const handleInputChange = (val) => {
    setInputValue(val);
    if (val.trim() && fuseInstance) {
      const results = fuseInstance.search(val).slice(0, 5);
      setSuggestions(results);
    } else {
      setSuggestions([]);
    }
  };

  const handleQuickReply = (action) => {
    if (action === 'Search name') {
      // Just show a prompt, don't search
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}`,
        type: 'bot',
        content: "Please type an instructor's name in the search box below.",
        timestamp: getCurrentTime()
      }]);
      return;
    } else if (action === 'By department') {
      // Trigger department list
      handleBotResponse('by department');
      return;
    } else if (action === 'Office hours') {
      // Ask for name
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}`,
        type: 'bot',
        content: "Whose office hours would you like to see? Please type an instructor's name.",
        timestamp: getCurrentTime()
      }]);
      return;
    }
    // For other quick replies like "Search another", trigger the actual behavior
    handleBotResponse(action);
  };

  const handleSendMessage = (text, specificDoctor = null, displayText = null, apiPayload = null) => {
    if (!text.trim() && !specificDoctor) return;

    const userMessage = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content: specificDoctor ? specificDoctor.name : (displayText || text),
      timestamp: getCurrentTime(),
    };

    setMessages(prev => [...prev, userMessage]);
    setSuggestions([]);
    setInputValue('');

    setIsTyping(true);
    setTimeout(async () => {
      if (specificDoctor) {
        setIsTyping(false);
        // Check if there are office hours available for this doctor
        const hoursData = getOfficeHoursByEmail(specificDoctor.email);
        
        if (hoursData && hoursData.length > 0) {
          // Use OfficeHoursDisplay component with Teams button
          setMessages(prev => [...prev, {
            id: Date.now() + 1,
            type: 'bot',
            content: <OfficeHoursDisplay 
              officeHours={hoursData}
              faculty={hoursData[0].faculty || specificDoctor.name}
              email={hoursData[0].email}
              department={hoursData[0].department || specificDoctor.department}
              office={hoursData[0].office || specificDoctor.office}
            />,
            timestamp: getCurrentTime(),
            quickReplies: ['Search another', 'By department']
          }]);
        } else {
          // Fallback to OfficeHoursDisplay with empty hours
          setMessages(prev => [...prev, {
            id: Date.now() + 1,
            type: 'bot',
            content: <OfficeHoursDisplay 
              officeHours={[]}
              faculty={specificDoctor.name}
              email={specificDoctor.email}
              department={normalizeDepartment(specificDoctor.department)}
              office={specificDoctor.office}
            />,
            timestamp: getCurrentTime()
          }]);
        }
      } else {
        await handleBotResponse(text, apiPayload);
      }
    }, 800);
  };

  const handleBotResponse = async (userText, apiPayload = null) => {
    let query = userText.trim();
    
    // Sanitize input first
    const sanitized = sanitizeInput(query);
    if (!sanitized) {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'bot',
        content: "Please type a valid instructor name (at least 2 letters).",
        timestamp: getCurrentTime(),
        quickReplies: ['By department', 'Search name']
      }]);
      return;
    }
    
    query = sanitized;
    query = getAlias(query);
    query = formatOffice(query);

    const lowerText = query.toLowerCase();

    // Route most informational queries through API so name/email/day variants are handled consistently.
    const isApiQuery =
      lowerText.length > 1 &&
      lowerText !== 'by department' &&
      lowerText !== 'search another';

    if (isApiQuery) {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(withAnalyticsMeta(apiPayload || { message: userText }))
        });
        
        const data = await response.json();
        
        setIsTyping(false);

        // Handle different response types
        if (data.type === 'ai_response' || data.type === 'smart_response') {
          // Render a focused answer card for clear intents and the full profile card otherwise.
          if (Array.isArray(data.results) && data.results.length === 1) {
            setMessages(prev => [...prev, {
              id: Date.now(),
              type: 'bot',
              content: <SmartAnswerCard professor={data.results[0]} response={data.response} context={data.context} />,
              timestamp: getCurrentTime(),
              quickReplies: ['Search another', 'By department']
            }]);
          } else {
            // Keep free-form text rendering for non-profile responses.
            setMessages(prev => [...prev, {
              id: Date.now(),
              type: 'bot',
              content: (
                <div className="space-y-3">
                  <div className="text-[14px] whitespace-pre-wrap leading-relaxed">
                    {renderTextWithClickableEmails(data.response)}
                  </div>
                </div>
              ),
              timestamp: getCurrentTime(),
              quickReplies: ['Search another', 'By department']
            }]);
          }
        } else if (data.type === 'disambiguation') {
          // Multiple matches - ask which one they mean
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'bot',
            content: (
              <div className="space-y-3">
                <div className="text-[14px] font-medium">{data.message}</div>
                <div className="grid gap-2">
                  {data.options.map((prof, i) => (
                    <button
                      key={`${prof.professor}-${i}`}
                      onClick={() => {
                        const requestedField = describeRequestedField(data.context);
                        setMessages(prev => [...prev, {
                          id: Date.now(),
                          type: 'bot',
                          content: `Got it. I will answer your ${requestedField} question for ${prof.professor}.`,
                          timestamp: getCurrentTime()
                        }]);

                        handleSendMessage(
                          prof.professor,
                          null,
                          prof.professor,
                          {
                            message: prof.professor,
                            selectedProfessor: prof.professor,
                            disambiguationToken: data.disambiguationToken
                          }
                        );
                      }}
                      className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-[#DC2626]/5 to-transparent hover:from-[#DC2626]/10 transition-all text-left group border border-[#DC2626]/20 hover:border-[#DC2626]/40"
                    >
                      <div className="w-10 h-10 rounded-lg bg-[#DC2626]/15 text-[#DC2626] flex items-center justify-center font-bold text-[15px] group-hover:bg-[#DC2626] group-hover:text-white transition-colors flex-shrink-0">
                        {prof.professor.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[14px] mb-0.5">{prof.professor}</div>
                        {prof.department && (
                          <div className="text-[12px] opacity-60 mb-1">{prof.department}</div>
                        )}
                        {prof.office && (
                          <div className="text-[11px] opacity-50">🏢 {prof.office}</div>
                        )}
                      </div>
                      <div className="text-[#DC2626] opacity-0 group-hover:opacity-100 transition-opacity">
                        →
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ),
            timestamp: getCurrentTime(),
            quickReplies: ['Search another', 'By department']
          }]);
        } else if (data.type === 'expired_disambiguation') {
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'bot',
            content: data.message || 'That selection expired. Please ask your question again.',
            timestamp: getCurrentTime(),
            quickReplies: ['Search name', 'By department']
          }]);
        } else if (data.type === 'office_hours') {
          if (data.results.length === 1) {
            // Single result - show card
            setMessages(prev => [...prev, {
              id: Date.now(),
              type: 'bot',
              content: <OfficeHoursCard data={data.results[0]} />,
              timestamp: getCurrentTime(),
              quickReplies: ['Search another', 'By department']
            }]);
          } else if (data.results.length > 1) {
            // Multiple results - show clickable list
            setMessages(prev => [...prev, {
              id: Date.now(),
              type: 'bot',
              content: (
                <div className="space-y-3">
                  <div className="text-[14px] opacity-70">Found {data.results.length} professors:</div>
                  <div className="grid gap-2">
                    {data.results.slice(0, 5).map((prof, i) => (
                      <button
                        key={`${prof.professor}-${i}`}
                        onClick={() => handleSendMessage(prof.professor)}
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-white/50 dark:bg-black/20 hover:bg-[#DC2626]/10 transition-all text-left group border border-black/5 dark:border-white/5"
                      >
                        <div className="w-9 h-9 rounded-lg bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center font-bold text-[14px] group-hover:bg-[#DC2626] group-hover:text-white transition-colors">
                          {prof.professor.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-[14px] truncate">{prof.professor}</div>
                          <div className="text-[11px] opacity-50 truncate uppercase tracking-tight">{prof.department || prof.school}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ),
              timestamp: getCurrentTime(),
              quickReplies: ['Search another', 'By department']
            }]);
          }
        } else if (data.type === 'no_results') {
          // No results found
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'bot',
            content: (
              <div className="space-y-3">
                <div className="text-[14px] leading-relaxed">
                  {data.summary || (
                    data.suggestions?.length > 0
                      ? `I couldn't find an exact match for '${data.message}'. Try checking the spelling or pick one of these close matches:`
                      : `I couldn't find a faculty match for '${data.message}'. Try checking the spelling or browse by department.`
                  )}
                </div>
                {data.guidance && (
                  <div className="text-[13px] opacity-80 bg-[#DC2626]/5 border border-[#DC2626]/20 rounded-lg px-3 py-2">
                    {data.guidance}
                  </div>
                )}
                {data.hints?.length > 0 && (
                  <div className="space-y-1">
                    {data.hints.map((hint, idx) => (
                      <div key={idx} className="text-[12px] opacity-70">• {hint}</div>
                    ))}
                  </div>
                )}
                {data.suggestions?.length > 0 && (
                  <div className="grid gap-2">
                    {data.suggestions.map((prof, i) => (
                      <button
                        key={`sugg-${prof.professor}-${i}`}
                        onClick={() => {
                          const followupQuery = buildContextualFollowupQuery(prof.professor, data.context);
                          handleSendMessage(followupQuery, null, prof.professor);
                        }}
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-white/50 dark:bg-black/20 hover:bg-[#DC2626]/10 transition-all text-left group border border-black/5 dark:border-white/5"
                      >
                        <div className="w-9 h-9 rounded-lg bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center font-bold text-[14px] group-hover:bg-[#DC2626] group-hover:text-white transition-colors">
                          {prof.professor.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-[14px] truncate">{prof.professor}</div>
                          <div className="text-[11px] opacity-50 truncate uppercase tracking-tight">{prof.department || 'Faculty'}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => openFeedbackForm({
                    category: 'missing_name',
                    missingName: data.subject || data.message || '',
                    userQuery: data.message || '',
                    requestLabel: data.requestLabel || ''
                  })}
                  className="w-full text-left rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/5 px-3 py-2.5 text-[13px] font-semibold text-[#B91C1C] dark:text-[#F87171] hover:bg-[#DC2626]/10 transition-colors"
                >
                  Missing name? Report it here
                </button>
              </div>
            ),
            timestamp: getCurrentTime(),
            quickReplies: ['By department', 'Search another']
          }]);
        } else {
          // Help message
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'bot',
            content: "Try this pattern for consistent results:\n• what + name = email\n• when + name = office hours\n• where + name = office code\n• Or just type a professor's name",
            timestamp: getCurrentTime(),
            quickReplies: ['By department', 'Search name']
          }]);
        }
        return;
      } catch (error) {
        console.error('API Error:', error);
        setIsTyping(false);
        // Fall through to regular search if API fails
      }
    }

    if (lowerText === "by department") {
      // Normalize departments and get unique list (Bug #10)
      const departments = [...new Set(instructors.map(i => normalizeDepartment(i.department)))].sort();
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'bot',
        content: (
          <div className="space-y-2">
            <div className="font-bold text-[14px]">Explore Departments:</div>
            <div className="flex flex-wrap gap-2 pt-1">
              {departments.map(dept => (
                <button
                  key={`dept-${dept}`}
                  onClick={() => handleSendMessage(dept)}
                  className="px-3 py-1.5 rounded-full border border-[#DC2626] text-[#DC2626] dark:text-[#EF4444] text-[13px] font-medium hover:bg-[#DC2626]/5 active:scale-95 transition-all"
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
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'bot',
        content: "Please type the name of the instructor you're looking for.",
        timestamp: getCurrentTime()
      }]);
      return;
    }

    if (!fuseInstance) {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'bot',
        content: "I'm still preparing the directory. Please wait just a second.",
        timestamp: getCurrentTime()
      }]);
      return;
    }

    const results = fuseInstance.search(query);

    setIsTyping(false);

    if (results.length === 0) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'bot',
        content: `I couldn't find any instructors matching '${userText}'. Try checking the spelling or browse by department.`,
        timestamp: getCurrentTime(),
        quickReplies: ['By department', 'Office hours']
      }]);
    } else if (results.length === 1) {
      // Check if office hours exist for this instructor
      const doctor = results[0].item;
      const hoursData = getOfficeHoursByEmail(doctor.email);
      
      if (hoursData && hoursData.length > 0) {
        // Show office hours with Teams button
        setMessages(prev => [...prev, {
          id: Date.now(),
          type: 'bot',
          content: <OfficeHoursDisplay 
            officeHours={hoursData}
            faculty={hoursData[0].faculty || doctor.name}
            email={hoursData[0].email}
            department={hoursData[0].department || doctor.department}
            office={hoursData[0].office || doctor.office}
          />,
          timestamp: getCurrentTime(),
          quickReplies: ['Search another', 'By department']
        }]);
      } else {
        // No office hours - show regular card with new UI
        setMessages(prev => [...prev, {
          id: Date.now(),
          type: 'bot',
          content: <OfficeHoursDisplay 
            officeHours={[]}
            faculty={doctor.name || doctor.professor}
            email={doctor.email}
            department={normalizeDepartment(doctor.department)}
            office={doctor.office}
          />,
          timestamp: getCurrentTime(),
          quickReplies: ['Search another', 'By department']
        }]);
      }
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
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-white/50 dark:bg-black/20 hover:bg-[#DC2626]/10 transition-all text-left group border border-black/5 dark:border-white/5"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center font-bold text-[14px] group-hover:bg-[#DC2626] group-hover:text-white transition-colors">
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
          <div className="w-10 h-10 rounded-full border-4 border-red-500/20 border-t-red-500 animate-spin" />
          <p className="text-gray-400 font-medium animate-pulse tracking-tight">Initializing MUBXBot...</p>
        </div>
      </div>
    );
  }

  const inlineSuggestion = (() => {
    if (!inputValue || suggestions.length === 0) return '';
    const first = suggestions[0]?.item?.name || '';
    if (!first) return '';
    return first.toLowerCase().startsWith(inputValue.toLowerCase()) ? first : '';
  })();

  return (
    <main className="h-[100dvh] w-full flex justify-center items-center overflow-hidden bg-[#F2F2F7] dark:bg-[#000000] relative">
      {/* Background Mesh */}
      <div className="absolute inset-0 pointer-events-none z-0" style={{ 
        backgroundImage: 'radial-gradient(at 0% 0%, rgba(220, 38, 38, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(185, 28, 28, 0.15) 0px, transparent 50%)' 
      }} />
      
      {/* Main Container */}
      <div className="w-full max-w-[960px] h-[100dvh] md:h-[90vh] md:rounded-[32px] md:shadow-2xl relative z-10 overflow-hidden flex flex-col bg-white dark:bg-black">
        {/* Header */}
        <ChatHeader theme={theme} onToggleTheme={toggleTheme} />

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-[#F8F9FA] dark:bg-[#1C1C1E] py-3 sm:py-4 chat-scroll relative">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col justify-center">
              <EmptyState />
              <div className="flex justify-center mt-6">
                 <QuickReplies 
                  options={['Search name', 'By department', 'Office hours']} 
                  onSelect={(opt) => handleQuickReply(opt)}
                 />
              </div>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4 pb-2">
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
                      onSelect={(opt) => handleQuickReply(opt)}
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
          <div className="absolute bottom-[84px] sm:bottom-[88px] left-2 right-2 sm:left-4 sm:right-4 md:left-1/2 md:right-auto md:w-[min(520px,calc(100%-2rem))] md:-translate-x-1/2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
            <div className="px-4 py-2 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-white/50 dark:bg-black/50">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-40 text-black dark:text-white">Suggestions</span>
              <button onClick={() => setSuggestions([])} className="opacity-40 hover:opacity-100 transition-opacity text-black dark:text-white"><X size={14} /></button>
            </div>
            <div className="max-h-[45dvh] sm:max-h-[240px] overflow-y-auto">
              {suggestions.map((s, index) => (
                <button
                  key={index}
                  onClick={() => handleSendMessage(s.item.name, s.item)}
                  className="w-full text-left p-3.5 sm:p-3 hover:bg-[#DC2626]/10 transition-all flex items-center gap-3 border-b border-black/[0.02] dark:border-white/[0.02] last:border-0"
                >
                  <div className="w-10 h-10 sm:w-9 sm:h-9 rounded-lg bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center font-bold text-[14px]">
                    {s.item.name.charAt(0)}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-[15px] sm:text-[14px] font-bold truncate text-black dark:text-white">{s.item.name}</div>
                    <div className="text-[10px] uppercase tracking-widest opacity-50 truncate text-black dark:text-white">{s.item.department}</div>
                  </div>
                  <Search size={14} className="opacity-20 text-black dark:text-white" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <ChatInput
          value={inputValue}
          onSend={handleSendMessage}
          onChange={handleInputChange}
          inlineSuggestion={inlineSuggestion}
          placeholder="What = email, When = hours, Where = office"
        />

        <div className="px-4 pb-3 md:pb-4 bg-white dark:bg-black border-t border-black/5 dark:border-white/5">
          <button
            onClick={() => openFeedbackForm({ category: 'general' })}
            className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] px-4 py-2.5 text-[13px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
          >
            Share general feedback
          </button>
        </div>
      </div>

      {feedbackOpen && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <button
            aria-label="Close feedback modal"
            onClick={closeFeedbackForm}
            className="absolute inset-0 bg-black/40"
          />
          <div className="relative w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#111111] border border-black/10 dark:border-white/10 p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-[20px] font-black tracking-tight text-[var(--text-primary)]">Send Feedback</h2>
              <button onClick={closeFeedbackForm} className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10">✕</button>
            </div>

            <form onSubmit={submitFeedback} className="space-y-4">
              <div>
                <label htmlFor="feedback-type" className="text-[12px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Type</label>
                <select
                  id="feedback-type"
                  value={feedbackCategory}
                  onChange={(e) => setFeedbackCategory(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-black/30 px-3 py-2.5"
                >
                  <option value="general">General feedback</option>
                  <option value="missing_name">Missing instructor name</option>
                </select>
              </div>

              {feedbackCategory === 'missing_name' && (
                <div>
                  <label htmlFor="feedback-missing-name" className="text-[12px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Instructor name</label>
                  <input
                    id="feedback-missing-name"
                    value={feedbackMissingName}
                    onChange={(e) => setFeedbackMissingName(e.target.value)}
                    placeholder="Example: Dr. Jane Doe"
                    className="mt-1 w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-black/30 px-3 py-2.5"
                  />
                </div>
              )}

              <div>
                <label htmlFor="feedback-details" className="text-[12px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Details</label>
                <textarea
                  id="feedback-details"
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  rows={4}
                  placeholder="Tell us what is missing or how we can improve"
                  className="mt-1 w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-black/30 px-3 py-2.5"
                />
              </div>

              {feedbackError && (
                <div className="rounded-lg border border-red-300/40 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-[13px] text-red-700 dark:text-red-300">
                  {feedbackError}
                </div>
              )}

              <button
                type="submit"
                disabled={feedbackSubmitting}
                className="w-full rounded-xl bg-[#DC2626] text-white font-bold px-4 py-3 disabled:opacity-60"
              >
                {feedbackSubmitting ? 'Submitting...' : 'Submit feedback'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
