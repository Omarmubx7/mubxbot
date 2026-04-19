"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import Fuse from 'fuse.js';
import { Search, X, Copy, Pin, RotateCcw } from 'lucide-react';
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

const SITE_URL = 'https://bot.mubx.dev';

const FAQ_ITEMS = [
  {
    question: 'How do I find an HTU instructor email with MUBXBot?',
    answer: 'Type what followed by the instructor name. MUBXBot returns available contact details including instructor email when present.'
  },
  {
    question: 'How do I check HTU office hours for a professor?',
    answer: 'Type when followed by the instructor name to view office hour availability and schedule details.'
  },
  {
    question: 'How do I find a professor office location at HTU?',
    answer: 'Type where followed by the instructor name to get office location and office code when available.'
  },
  {
    question: 'Can I search HTU faculty by department?',
    answer: 'Yes. Ask by department and MUBXBot returns matching instructors from that department.'
  }
];

const QUICK_ACTIONS = [
  { label: 'Find email', query: 'what is Razan email' },
  { label: 'Check office hours', query: 'when is Razan free' },
  { label: 'Find office', query: 'where is Razan office' }
];

const buildWelcomeMessage = ({ isReturningUser = false, lastAction = '' } = {}) => (
  <div className="space-y-4">
    <div className="rounded-2xl border border-[#DC2626]/20 bg-gradient-to-br from-[#DC2626]/10 via-white to-[#FCA5A5]/20 dark:from-[#DC2626]/20 dark:via-[#1C1C1E] dark:to-[#7F1D1D]/30 p-4">
      <div className="font-black text-[18px] tracking-tight text-[#7F1D1D] dark:text-[#FCA5A5]">
        {isReturningUser ? '👋 Welcome back to MUBXBot!' : '👋 Yo, welcome to MUBXBot!'}
      </div>
      <div className="mt-2 text-[14px] leading-relaxed text-[#1F2937] dark:text-[#E5E7EB]">
        Your go-to helper for everything instructor-related at HTU’s School of Computing and Informatics.
      </div>
      {isReturningUser && lastAction && (
        <div className="mt-3 text-[12px] rounded-lg bg-white/75 dark:bg-black/20 px-3 py-2 border border-[#DC2626]/15">
          Last time you asked: <span className="font-semibold">{lastAction}</span>
        </div>
      )}
    </div>

    <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4 space-y-2.5">
      <div className="text-[13px] font-extrabold uppercase tracking-[0.16em] text-[#DC2626] dark:text-[#F87171]">🔍 I can help you with:</div>
      <div className="text-[13px] leading-relaxed space-y-1.5 text-[#111827] dark:text-[#E5E7EB]">
        <div>Find instructor emails and contact info</div>
        <div>Check office hours and availability</div>
        <div>Search by name, department, or office</div>
        <div>Pull up full instructor profiles</div>
      </div>
    </div>

    <div className="rounded-2xl border border-[#DC2626]/15 bg-[#DC2626]/5 dark:bg-[#DC2626]/10 p-4 space-y-3">
      <div className="text-[13px] font-extrabold uppercase tracking-[0.16em] text-[#B91C1C] dark:text-[#FCA5A5]">💡 Quick hacks:</div>
      <div className="space-y-2 text-[13px] leading-relaxed text-[#1F2937] dark:text-[#F3F4F6]">
        <div className="rounded-lg bg-white/70 dark:bg-black/20 px-3 py-2">
          Type "what + name" to get the email<br />
          <span className="opacity-75">Example: what is Razan email</span>
        </div>
        <div className="rounded-lg bg-white/70 dark:bg-black/20 px-3 py-2">
          Type "when + name" to check office hours<br />
          <span className="opacity-75">Example: when is Razan free</span>
        </div>
        <div className="rounded-lg bg-white/70 dark:bg-black/20 px-3 py-2">
          Type "where + name" to find the office<br />
          <span className="opacity-75">Example: where is Razan office</span>
        </div>
      </div>
      <div className="text-[13px] font-medium text-[#7F1D1D] dark:text-[#FCA5A5]">Just drop your question and I’ll do the rest ✨</div>
    </div>

    <div className="text-[12px] opacity-80">
      📘 Learn more: <a href="/faq" className="font-semibold underline decoration-current/30 hover:decoration-current">MUBXBot FAQ</a>
    </div>
  </div>
);

const highlightQueryMatch = (text, query) => {
  return text;
};

const createWelcomeMessage = ({ isReturningUser = false, lastAction = '' } = {}) => ({
  id: 'welcome-message',
  type: 'bot',
  content: buildWelcomeMessage({ isReturningUser, lastAction }),
  timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
  variant: 'smart',
  rawText: 'Welcome to MUBXBot',
  quickReplies: ['By department']
});

export default function Page() {
  const { instructors, officeHours, loading, theme, setTheme } = useDoctors();
  const [messages, setMessages] = useState(() => ([createWelcomeMessage()]));
  const [isTyping, setIsTyping] = useState(false);
  const [fuseInstance, setFuseInstance] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(-1);
  const [inputValue, setInputValue] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [pinnedResponses, setPinnedResponses] = useState([]);
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
  const lastActionRef = useRef('');

  const homeStructuredDataJson = useMemo(() => JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${SITE_URL}/#webpage`,
        url: SITE_URL,
        name: 'MUBXBot | HTU School of Computing',
        description: 'Official HTU School of Computing and Informatics assistant for instructor email lookup, office locations, and office hours.',
        isPartOf: {
          '@id': `${SITE_URL}/#website`
        },
        inLanguage: 'en'
      },
      {
        '@type': 'FAQPage',
        '@id': `${SITE_URL}/#faq`,
        mainEntity: FAQ_ITEMS.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer
          }
        }))
      }
    ]
  }), []);

  useEffect(() => {
    let storedUserId = '';
    let storedConversationId = '';
    let storedLastAction = '';
    let hasVisitedBefore = false;

    try {
      storedUserId = globalThis.localStorage.getItem('mubx_analytics_user_id') || '';
      storedConversationId = globalThis.sessionStorage.getItem('mubx_analytics_conversation_id') || '';
      storedLastAction = globalThis.localStorage.getItem('mubx_last_action') || '';
      hasVisitedBefore = globalThis.localStorage.getItem('mubx_has_visited') === '1';
    } catch (e) {
      // Storage access might be denied in strict privacy modes
      console.warn('Storage access is disabled');
    }

    const userId = storedUserId || generateUUID();
    const conversationId = storedConversationId || generateUUID();

    analyticsUserIdRef.current = userId;
    conversationIdRef.current = conversationId;
    lastActionRef.current = storedLastAction;

    setMessages((prev) => prev.map((message) => {
      if (message.id !== 'welcome-message') return message;
      return createWelcomeMessage({
        isReturningUser: hasVisitedBefore,
        lastAction: storedLastAction
      });
    }));

    try {
      if (!storedUserId) globalThis.localStorage.setItem('mubx_analytics_user_id', userId);
      if (!storedConversationId) globalThis.sessionStorage.setItem('mubx_analytics_conversation_id', conversationId);
      globalThis.localStorage.setItem('mubx_has_visited', '1');
    } catch (e) {
      console.warn('Storage write disabled', e);
    }
  }, []);

  useEffect(() => {
    if (!toastMessage) return undefined;

    const timerId = globalThis.setTimeout(() => {
      setToastMessage('');
    }, 2200);

    return () => {
      globalThis.clearTimeout(timerId);
    };
  }, [toastMessage]);

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

  const recordLastAction = (actionLabel) => {
    const value = String(actionLabel || '').trim();
    if (!value) return;

    lastActionRef.current = value;
    try {
      globalThis.localStorage.setItem('mubx_last_action', value);
    } catch (error) {
      console.warn('Could not persist last action', error);
    }
  };

  const resolveLatestBotSummary = () => {
    const latestBot = [...messages].reverse().find((message) => message.type === 'bot');
    if (!latestBot) return '';
    if (latestBot.rawText) return latestBot.rawText;
    if (typeof latestBot.content === 'string') return latestBot.content;
    return 'Latest assistant response';
  };

  const copyText = async (value, successMessage) => {
    const text = String(value || '').trim();
    if (!text) return;

    try {
      await globalThis.navigator.clipboard.writeText(text);
      setToastMessage(successMessage);
    } catch (error) {
      console.warn('Clipboard copy failed', error);
      setToastMessage('Could not copy to clipboard');
    }
  };

  const handleCopyLastAnswer = () => {
    const latest = resolveLatestBotSummary();
    if (!latest) {
      setToastMessage('No answer yet to copy');
      return;
    }
    copyText(latest, 'Last answer copied');
  };

  const handlePinLastAnswer = () => {
    const latest = resolveLatestBotSummary();
    if (!latest) {
      setToastMessage('No answer yet to pin');
      return;
    }

    setPinnedResponses((prev) => {
      if (prev.includes(latest)) return prev;
      return [latest, ...prev].slice(0, 5);
    });
    setToastMessage('Pinned to quick notes');
  };

  const handleClearConversation = () => {
    setMessages([
      createWelcomeMessage({
        isReturningUser: true,
        lastAction: lastActionRef.current
      })
    ]);
    setSuggestions([]);
    setHighlightedSuggestionIndex(-1);
    setInputValue('');
    setToastMessage('Conversation cleared');
  };

  const openTeamsFromEmail = (email) => {
    const cleanedEmail = String(email || '').trim();
    if (!cleanedEmail) return;
    const encodedEmail = encodeURIComponent(cleanedEmail);
    const webChatUrl = `https://teams.microsoft.com/l/chat/0/0?users=${encodedEmail}`;
    const desktopDeepLink = `msteams://teams.microsoft.com/l/chat/0/0?users=${encodedEmail}`;

    const popup = globalThis.open(webChatUrl, '_blank', 'noopener,noreferrer');
    if (!popup) {
      globalThis.location.href = desktopDeepLink;
    }
  };

  const handleInputKeyDown = (event) => {
    if (event.key === 'ArrowDown' && suggestions.length > 0) {
      event.preventDefault();
      setHighlightedSuggestionIndex((prev) => {
        if (prev < 0) return 0;
        return Math.min(prev + 1, suggestions.length - 1);
      });
      return true;
    }

    if (event.key === 'ArrowUp' && suggestions.length > 0) {
      event.preventDefault();
      setHighlightedSuggestionIndex((prev) => Math.max(prev - 1, 0));
      return true;
    }

    if (event.key === 'Escape') {
      setSuggestions([]);
      setHighlightedSuggestionIndex(-1);
      return true;
    }

    if (event.key === 'Enter' && suggestions.length > 0 && highlightedSuggestionIndex >= 0) {
      event.preventDefault();
      const selected = suggestions[highlightedSuggestionIndex]?.item;
      if (selected) handleSendMessage(selected.name, selected);
      return true;
    }

    return false;
  };

  const renderResultActions = (professor) => {
    const displayName = professor?.name || professor?.professor || '';
    const email = professor?.email || '';

    return (
      <div className="rounded-xl border border-[#DC2626]/20 bg-[#DC2626]/5 dark:bg-[#DC2626]/10 p-3 space-y-2">
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#B91C1C] dark:text-[#FCA5A5]">Quick actions</div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => copyText(email, 'Email copied')}
            disabled={!email}
            className="min-h-10 px-3 rounded-full border border-[#DC2626]/40 text-[12px] font-semibold text-[#B91C1C] dark:text-[#FCA5A5] disabled:opacity-40"
          >
            Copy email
          </button>
          <button
            type="button"
            onClick={() => openTeamsFromEmail(email)}
            disabled={!email}
            className="min-h-10 px-3 rounded-full border border-[#DC2626]/40 text-[12px] font-semibold text-[#B91C1C] dark:text-[#FCA5A5] disabled:opacity-40"
          >
            Open Teams
          </button>
          <button
            type="button"
            onClick={() => handleSendMessage(`what ${displayName} email`)}
            disabled={!displayName}
            className="min-h-10 px-3 rounded-full border border-[#DC2626]/40 text-[12px] font-semibold text-[#B91C1C] dark:text-[#FCA5A5] disabled:opacity-40"
          >
            Ask email
          </button>
          <button
            type="button"
            onClick={() => handleSendMessage(`when ${displayName} free`)}
            disabled={!displayName}
            className="min-h-10 px-3 rounded-full border border-[#DC2626]/40 text-[12px] font-semibold text-[#B91C1C] dark:text-[#FCA5A5] disabled:opacity-40"
          >
            Ask hours
          </button>
          <button
            type="button"
            onClick={() => handleSendMessage(`where ${displayName} office`)}
            disabled={!displayName}
            className="min-h-10 px-3 rounded-full border border-[#DC2626]/40 text-[12px] font-semibold text-[#B91C1C] dark:text-[#FCA5A5] disabled:opacity-40"
          >
            Ask office
          </button>
        </div>
      </div>
    );
  };

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
          quickReplies: ['By department']
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

  const shouldShowTeamsButton = (dept) => {
    const normalized = String(dept || '').trim().toLowerCase();
    return !normalized.includes('finance');
  };

  const sanitizeInput = (query) => {
    const cleaned = query.replaceAll(/[^a-zA-Z0-9\s@.-]/g, '').trim();
    if (cleaned.length < 2) return null;
    return cleaned;
  };

  const sendChatIssueNotification = async ({ type, query, normalizedQuery = '', reason = '' }) => {
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          query,
          normalizedQuery,
          reason,
          conversationId: conversationIdRef.current || '',
          userId: analyticsUserIdRef.current || '',
          sourcePath: globalThis.location?.pathname || '/'
        })
      });
    } catch (error) {
      console.warn('Chat issue notification failed', error);
    }
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
      showTeamsButton={shouldShowTeamsButton(data.department)}
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
      setHighlightedSuggestionIndex(-1);
    } else {
      setSuggestions([]);
      setHighlightedSuggestionIndex(-1);
    }
  };

  const handleQuickReply = (action) => {
    recordLastAction(action);
    if (action === 'By department') {
      // Trigger department list
      handleBotResponse('by department');
      return;
    }
    // For other quick replies, trigger the actual behavior
    handleBotResponse(action);
  };

  const handleSendMessage = (text, specificDoctor = null, displayText = null, apiPayload = null) => {
    if (!text.trim() && !specificDoctor) return;

    recordLastAction(displayText || text);

    const userMessage = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content: specificDoctor ? specificDoctor.name : (displayText || text),
      timestamp: getCurrentTime(),
    };

    setMessages(prev => [...prev, userMessage]);
    setSuggestions([]);
    setHighlightedSuggestionIndex(-1);
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
            content: (
              <div className="space-y-3">
                <OfficeHoursDisplay 
                  officeHours={hoursData}
                  faculty={hoursData[0].faculty || specificDoctor.name}
                  email={hoursData[0].email}
                  department={hoursData[0].department || specificDoctor.department}
                  office={hoursData[0].office || specificDoctor.office}
                  showTeamsButton={shouldShowTeamsButton(hoursData[0].department || specificDoctor.department)}
                />
                {renderResultActions({ name: specificDoctor.name, email: specificDoctor.email })}
              </div>
            ),
            timestamp: getCurrentTime(),
            variant: 'smart',
            rawText: `Profile details for ${specificDoctor.name || 'instructor'}`,
            quickReplies: ['By department']
          }]);
        } else {
          // Fallback to OfficeHoursDisplay with empty hours
          setMessages(prev => [...prev, {
            id: Date.now() + 1,
            type: 'bot',
            content: (
              <div className="space-y-3">
                <OfficeHoursDisplay 
                  officeHours={[]}
                  faculty={specificDoctor.name}
                  email={specificDoctor.email}
                  department={normalizeDepartment(specificDoctor.department)}
                  office={specificDoctor.office}
                  showTeamsButton={shouldShowTeamsButton(specificDoctor.department)}
                />
                {renderResultActions({ name: specificDoctor.name, email: specificDoctor.email })}
              </div>
            ),
            timestamp: getCurrentTime(),
            variant: 'smart',
            rawText: `Profile details for ${specificDoctor.name || 'instructor'}`
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
        variant: 'error',
        rawText: 'Please type a valid instructor name (at least 2 letters).',
        quickReplies: ['By department']
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
      lowerText !== 'by department';

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
              content: (
                <div className="space-y-3">
                  <SmartAnswerCard professor={data.results[0]} response={data.response} context={data.context} />
                  {renderResultActions(data.results[0])}
                </div>
              ),
              timestamp: getCurrentTime(),
              variant: 'smart',
              rawText: data.response,
              quickReplies: ['By department']
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
              variant: 'smart',
              rawText: data.response,
              quickReplies: ['By department']
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
            variant: 'disambiguation',
            rawText: data.message,
            quickReplies: ['By department']
          }]);
        } else if (data.type === 'expired_disambiguation') {
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'bot',
            content: data.message || 'That selection expired. Please ask your question again.',
            timestamp: getCurrentTime(),
            variant: 'error',
            rawText: data.message || 'That selection expired. Please ask your question again.',
            quickReplies: ['By department']
          }]);
        } else if (data.type === 'office_hours') {
          if (data.results.length === 1) {
            // Single result - show card
            setMessages(prev => [...prev, {
              id: Date.now(),
              type: 'bot',
              content: (
                <div className="space-y-3">
                  <OfficeHoursCard data={data.results[0]} />
                  {renderResultActions(data.results[0])}
                </div>
              ),
              timestamp: getCurrentTime(),
              variant: 'smart',
              rawText: `Office hours for ${data.results[0]?.professor || data.results[0]?.name || 'instructor'}`,
              quickReplies: ['By department']
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
              variant: 'disambiguation',
              rawText: `Found ${data.results.length} matching professors.`,
              quickReplies: ['By department']
            }]);
          }
        } else if (data.type === 'no_results') {
          sendChatIssueNotification({
            type: 'no_results',
            query: userText,
            normalizedQuery: query,
            reason: data.summary || `No result matched the query "${userText}"`
          });

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
                  type="button"
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
                <button
                  type="button"
                  onClick={() => handleBotResponse('by department')}
                  className="w-full text-left rounded-xl border border-black/15 dark:border-white/15 bg-white/60 dark:bg-black/20 px-3 py-2.5 text-[13px] font-semibold hover:bg-white dark:hover:bg-black/30 transition-colors"
                >
                  Browse by department now
                </button>
              </div>
            ),
            timestamp: getCurrentTime(),
            variant: 'no_results',
            rawText: data.summary || 'No matching faculty found.',
            quickReplies: ['By department']
          }]);
        } else {
          // Help message
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'bot',
            content: "Try this pattern for consistent results:\n• what + name = email\n• when + name = office hours\n• where + name = office code\n• Or just type a professor's name",
            timestamp: getCurrentTime(),
            variant: 'smart',
            rawText: 'Try what/when/where + name for consistent results.',
            quickReplies: ['By department']
          }]);
        }
        return;
      } catch (error) {
        console.error('API Error:', error);
        sendChatIssueNotification({
          type: 'error',
          query: userText,
          normalizedQuery: query,
          reason: error?.message || 'Chat API request failed'
        });
        setIsTyping(false);
        // Fall through to regular search if API fails
      }
    }

    if (lowerText === "by department") {
      // Normalize departments and get unique list (Bug #10)
      const departments = [...new Set(instructors.map(i => normalizeDepartment(i.department)))].sort((a, b) => a.localeCompare(b));
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
        timestamp: getCurrentTime(),
        variant: 'disambiguation',
        rawText: 'Explore departments.'
      }]);
      return;
    }

    if (!fuseInstance) {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'bot',
        content: "I'm still preparing the directory. Please wait just a second.",
        timestamp: getCurrentTime(),
        variant: 'error',
        rawText: "I'm still preparing the directory. Please wait just a second."
      }]);
      return;
    }

    const results = fuseInstance.search(query);

    setIsTyping(false);

    if (results.length === 0) {
      sendChatIssueNotification({
        type: 'no_results',
        query: userText,
        normalizedQuery: query,
        reason: `No instructor match found for "${userText}"`
      });

      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'bot',
        content: `I couldn't find any instructors matching '${userText}'. Try checking the spelling or browse by department.`,
        timestamp: getCurrentTime(),
        variant: 'no_results',
        rawText: `No instructors found for ${userText}`,
        quickReplies: ['By department']
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
          content: (
            <div className="space-y-3">
              <OfficeHoursDisplay 
                officeHours={hoursData}
                faculty={hoursData[0].faculty || doctor.name}
                email={hoursData[0].email}
                department={hoursData[0].department || doctor.department}
                office={hoursData[0].office || doctor.office}
                showTeamsButton={shouldShowTeamsButton(hoursData[0].department || doctor.department)}
              />
              {renderResultActions(doctor)}
            </div>
          ),
          timestamp: getCurrentTime(),
          variant: 'smart',
          rawText: `Office hours for ${doctor.name || doctor.professor || 'instructor'}`,
          quickReplies: ['By department']
        }]);
      } else {
        // No office hours - show regular card with new UI
        setMessages(prev => [...prev, {
          id: Date.now(),
          type: 'bot',
          content: (
            <div className="space-y-3">
              <OfficeHoursDisplay 
                officeHours={[]}
                faculty={doctor.name || doctor.professor}
                email={doctor.email}
                department={normalizeDepartment(doctor.department)}
                office={doctor.office}
                showTeamsButton={shouldShowTeamsButton(doctor.department)}
              />
              {renderResultActions(doctor)}
            </div>
          ),
          timestamp: getCurrentTime(),
          variant: 'smart',
          rawText: `Profile details for ${doctor.name || doctor.professor || 'instructor'}`,
          quickReplies: ['By department']
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
        timestamp: getCurrentTime(),
        variant: 'disambiguation',
        rawText: `Found ${results.length} matching instructors.`
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

  const hasConversationHistory = messages.some((message) => message.type === 'user');

  return (
    <main className="h-[100dvh] w-full flex justify-center items-center overflow-hidden bg-[#F2F2F7] dark:bg-[#000000] relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: homeStructuredDataJson }}
      />

      <noscript>
        MUBXBot is the HTU School of Computing and Informatics assistant for finding instructor emails, office hours, departments, and office locations.
      </noscript>

      {/* Background Mesh */}
      <div className="absolute inset-0 pointer-events-none z-0" style={{ 
        backgroundImage: 'radial-gradient(at 0% 0%, rgba(220, 38, 38, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(185, 28, 28, 0.15) 0px, transparent 50%)' 
      }} />
      
      {/* Main Container */}
      <div className="w-full max-w-[960px] h-[100dvh] md:h-[90vh] md:rounded-[32px] md:shadow-2xl relative z-10 overflow-hidden flex flex-col bg-white dark:bg-black">
        {/* Header */}
        <ChatHeader theme={theme} onToggleTheme={toggleTheme} onOpenFeedback={() => openFeedbackForm({ category: 'general' })} />

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-[#F8F9FA] dark:bg-[#1C1C1E] py-3 sm:py-4 chat-scroll relative">
          {(hasConversationHistory || pinnedResponses.length > 0) && (
            <div className="px-3 sm:px-4 pb-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleClearConversation}
                className="min-h-10 px-3 rounded-full border border-black/15 dark:border-white/15 text-[12px] font-semibold text-[#1F2937] dark:text-[#E5E7EB] hover:bg-white dark:hover:bg-white/10 transition-colors"
                aria-label="Clear conversation"
              >
                <RotateCcw className="w-3.5 h-3.5 inline mr-1" /> Clear chat
              </button>
              <button
                type="button"
                onClick={handleCopyLastAnswer}
                className="min-h-10 px-3 rounded-full border border-black/15 dark:border-white/15 text-[12px] font-semibold text-[#1F2937] dark:text-[#E5E7EB] hover:bg-white dark:hover:bg-white/10 transition-colors"
                aria-label="Copy last answer"
              >
                <Copy className="w-3.5 h-3.5 inline mr-1" /> Copy last answer
              </button>
              <button
                type="button"
                onClick={handlePinLastAnswer}
                className="min-h-10 px-3 rounded-full border border-black/15 dark:border-white/15 text-[12px] font-semibold text-[#1F2937] dark:text-[#E5E7EB] hover:bg-white dark:hover:bg-white/10 transition-colors"
                aria-label="Pin useful result"
              >
                <Pin className="w-3.5 h-3.5 inline mr-1" /> Pin useful result
              </button>
            </div>
          )}

          {pinnedResponses.length > 0 && (
            <div className="px-3 sm:px-4 pb-3">
              <div className="rounded-xl border border-[#DC2626]/20 bg-[#DC2626]/5 dark:bg-[#DC2626]/10 p-3 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#B91C1C] dark:text-[#FCA5A5]">Pinned notes</div>
                {pinnedResponses.map((item) => (
                  <div key={item} className="text-[12px] leading-relaxed text-[#1F2937] dark:text-[#E5E7EB] border-b border-[#DC2626]/10 last:border-0 pb-2 last:pb-0">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="h-full flex flex-col justify-center">
              <EmptyState />
              <div className="px-3 sm:px-4 mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => handleSendMessage(action.query)}
                    className="min-h-14 rounded-xl border border-[#DC2626]/25 bg-white/70 dark:bg-black/20 hover:bg-[#DC2626]/10 transition-colors px-3 py-2 text-left"
                    aria-label={`${action.label} example`}
                  >
                    <div className="text-[13px] font-bold text-[#B91C1C] dark:text-[#FCA5A5]">{action.label}</div>
                    <div className="text-[11px] opacity-75 mt-1">{action.query}</div>
                  </button>
                ))}
              </div>
              <div className="flex justify-center mt-4">
                <QuickReplies 
                  options={['By department']} 
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
                    variant={message.variant}
                    animationDelay={Math.min(index * 0.02, 0.18)}
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
              <button onClick={() => { setSuggestions([]); setHighlightedSuggestionIndex(-1); }} className="opacity-40 hover:opacity-100 transition-opacity text-black dark:text-white"><X size={14} /></button>
            </div>
            <div className="max-h-[45dvh] sm:max-h-[240px] overflow-y-auto">
              {suggestions.map((s, index) => (
                <button
                  key={`${s.item?.name || 'suggestion'}-${index}`}
                  onClick={() => handleSendMessage(s.item.name, s.item)}
                  className={`w-full text-left p-3.5 sm:p-3 transition-all flex items-center gap-3 border-b border-black/[0.02] dark:border-white/[0.02] last:border-0 ${
                    highlightedSuggestionIndex === index ? 'bg-[#DC2626]/15' : 'hover:bg-[#DC2626]/10'
                  }`}
                  aria-label={`Choose ${s.item.name}`}
                >
                  <div className="w-10 h-10 sm:w-9 sm:h-9 rounded-lg bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center font-bold text-[14px]">
                    {s.item.name.charAt(0)}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-[15px] sm:text-[14px] font-bold truncate text-black dark:text-white">{highlightQueryMatch(s.item.name, inputValue)}</div>
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
          onKeyDown={handleInputKeyDown}
          inlineSuggestion={inlineSuggestion}
          placeholder="Type an instructor's name"
        />

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

      {toastMessage && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[200] px-3 py-2 rounded-full bg-black/80 text-white text-[12px] font-medium shadow-lg">
          {toastMessage}
        </div>
      )}
    </main>
  );
}
