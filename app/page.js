"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import Fuse from 'fuse.js';
import { Search, X, Copy, Pin } from 'lucide-react';
import { ChatHeader } from '../components/ChatHeader';
import { ChatMessage } from '../components/ChatMessage';
import { QuickReplies } from '../components/QuickReplies';
import { TypingIndicator } from '../components/TypingIndicator';
import { ChatInput } from '../components/ChatInput';
import { EmptyState } from '../components/EmptyState';
import { useDoctors } from '../components/Providers';
import { OfficeHoursDisplay } from '../components/OfficeHoursDisplay';
import ContributeFlow from '../components/ContributeFlow';
import { AcademicStatusBanner } from '../components/AcademicStatusBanner';
import {
  ResponseActions,
  ResponseAvatar,
  ResponseBody,
  ResponseCard,
  ResponseFact,
  ResponseGrid,
  ResponseHeader,
  ResponseNote,
  ResponseRow,
  ResponseText
} from '../components/ResponseCard';

const SmartFieldCard = ({ title, value, subtitle }) => (
  <ResponseCard>
    <ResponseHeader label="Faculty" meta="Directory profile" />
    <ResponseBody>
      <ResponseFact
        label={title}
        value={typeof value === 'string' && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)
          ? <a href={`mailto:${value}`} className="text-[var(--accent)] underline decoration-current/25 hover:decoration-current">{value}</a>
          : value}
        detail={subtitle}
        accent={typeof value === 'string' && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)}
        hero
      />
    </ResponseBody>
  </ResponseCard>
);

SmartFieldCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  subtitle: PropTypes.string,
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

const highlightQueryMatch = (text, query) => {
  return text;
};

export default function Page() {
  const { instructors, officeHours, loading, theme, setTheme } = useDoctors();
  const [messages, setMessages] = useState(() => ([]));
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
  const [contributeOpen, setContributeOpen] = useState(false);
  const [contributeName, setContributeName] = useState('');
  const [contributeTab, setContributeTab] = useState('add');
  const [contributeInstructor, setContributeInstructor] = useState(null);
  
  const messagesEndRef = useRef(null);
  const conversationIdRef = useRef('');
  const analyticsUserIdRef = useRef('');
  const seenOperatorMessageIdsRef = useRef(new Set());
  const pendingOperatorAckRef = useRef([]);
  const lastActionRef = useRef('');
  const messagesRef = useRef([]);
  const lastProfessorRef = useRef('');
  const [missingFlow, setMissingFlow] = useState(null);

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

    try {
      storedUserId = globalThis.localStorage.getItem('mubx_analytics_user_id') || '';
      storedConversationId = globalThis.sessionStorage.getItem('mubx_analytics_conversation_id') || '';
      storedLastAction = globalThis.localStorage.getItem('mubx_last_action') || '';
    } catch (e) {
      // Storage access might be denied in strict privacy modes
      console.warn('Storage access is disabled');
    }

    const userId = storedUserId || generateUUID();
    const conversationId = storedConversationId || generateUUID();

    analyticsUserIdRef.current = userId;
    conversationIdRef.current = conversationId;
    lastActionRef.current = storedLastAction;

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

  // Live channel: heartbeat this tab and pull any operator messages the admin
  // queued from the Live Chat console. Renders them as normal bot replies so
  // the takeover is seamless. A no-op when the server has no live-chat store.
  useEffect(() => {
    let stopped = false;

    const getSessionId = () => {
      try {
        let sid = globalThis.sessionStorage.getItem('mubx_session_id');
        if (!sid) {
          sid = globalThis.crypto?.randomUUID?.() || `sess-${Date.now()}-${Math.random().toString(16).slice(2)}`;
          globalThis.sessionStorage.setItem('mubx_session_id', sid);
        }
        return sid;
      } catch {
        return `sess-${Date.now()}`;
      }
    };

    const timeLabel = () => new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const tick = async () => {
      if (stopped) return;
      const sessionId = getSessionId();
      const ackIds = pendingOperatorAckRef.current;
      pendingOperatorAckRef.current = [];

      try {
        const res = await fetch('/api/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            conversationId: conversationIdRef.current || '',
            userId: analyticsUserIdRef.current || '',
            path: globalThis.location?.pathname || '/',
            ackIds
          }),
          keepalive: true
        });
        const data = await res.json().catch(() => ({}));
        const incoming = Array.isArray(data?.messages) ? data.messages : [];
        const fresh = incoming.filter(m => m && m.id && !seenOperatorMessageIdsRef.current.has(m.id));
        if (fresh.length === 0) return;

        const appended = fresh.map(m => ({
          id: `operator-${m.id}`,
          type: 'bot',
          content: (
            <ResponseCard>
              <ResponseHeader label="MUBX team" meta="Live reply" />
              <ResponseBody>
                <ResponseText className="text-[13px]">{String(m.text || '')}</ResponseText>
              </ResponseBody>
            </ResponseCard>
          ),
          timestamp: timeLabel(),
          variant: 'smart',
          rawText: String(m.text || '')
        }));

        for (const m of fresh) {
          seenOperatorMessageIdsRef.current.add(m.id);
          pendingOperatorAckRef.current.push(m.id);
        }

        setMessages(prev => [...prev, ...appended]);
      } catch {
        // Retry acks next tick if the request failed outright.
        pendingOperatorAckRef.current = [...ackIds, ...pendingOperatorAckRef.current];
      }
    };

    tick();
    const interval = globalThis.setInterval(tick, 5000);
    return () => {
      stopped = true;
      globalThis.clearInterval(interval);
    };
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
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const buildAssistantHistory = (currentText = '') => {
    const entries = [];

    for (const item of messagesRef.current) {
      const text = item.rawText || (typeof item.content === 'string' ? item.content : '');
      if (!text || !String(text).trim()) continue;
      entries.push({
        role: item.type === 'user' ? 'user' : 'assistant',
        text: String(text).slice(0, 800)
      });
    }

    if (currentText) {
      const last = entries.at(-1);
      if (last?.role === 'user' && last.text.trim() === String(currentText).trim()) {
        entries.pop();
      }
    }

    return entries.slice(-8);
  };

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
    setMessages([]);
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
      <ResponseCard>
        <ResponseHeader label="Quick actions" meta="Faculty" />
        <ResponseBody>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => copyText(email, 'Email copied')}
              disabled={!email}
              className="min-h-8 rounded-full border border-[var(--rule)] px-3 text-[12px] font-medium text-[var(--ink-soft)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--ink)] disabled:opacity-40"
            >
              Copy email
            </button>
            <button
              type="button"
              onClick={() => openTeamsFromEmail(email)}
              disabled={!email}
              className="min-h-8 rounded-full border border-[var(--rule)] px-3 text-[12px] font-medium text-[var(--ink-soft)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--ink)] disabled:opacity-40"
            >
              Open Teams
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage(`what ${displayName} email`)}
              disabled={!displayName}
              className="min-h-8 rounded-full border border-[var(--rule)] px-3 text-[12px] font-medium text-[var(--ink-soft)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--ink)] disabled:opacity-40"
            >
              Ask email
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage(`when ${displayName} free`)}
              disabled={!displayName}
              className="min-h-8 rounded-full border border-[var(--rule)] px-3 text-[12px] font-medium text-[var(--ink-soft)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--ink)] disabled:opacity-40"
            >
              Ask hours
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage(`where ${displayName} office`)}
              disabled={!displayName}
              className="min-h-8 rounded-full border border-[var(--rule)] px-3 text-[12px] font-medium text-[var(--ink-soft)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--ink)] disabled:opacity-40"
            >
              Ask office
            </button>
          </div>
        </ResponseBody>
      </ResponseCard>
    );
  };

  const recordMissingNameSearch = async (name) => {
    const value = String(name || '').trim();
    if (!value) return;
    try {
      const res = await fetch('/api/missing-names/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: value, source: 'client_search' })
      });
      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));
      if (!data?.isHot) return;

      const key = `hot-prompt-${value.toLowerCase()}`;
      if (globalThis.sessionStorage?.getItem(key)) return;
      globalThis.sessionStorage?.setItem(key, '1');

      setMessages(prev => [...prev, {
        id: `hot-${Date.now()}`,
        type: 'bot',
        content: (
          <ResponseCard>
            <ResponseHeader
              label="Directory"
              meta="Frequently searched"
              badge={`${data.searchCount} ${data.searchCount === 1 ? 'lookup' : 'lookups'}`}
              badgeTone="amber"
            />
            <ResponseBody>
              <ResponseText className="text-[13px]">
                <span className="font-semibold">{data.name || value}</span> is one of the most searched missing names right now
                ({data.searchCount} {data.searchCount === 1 ? 'person has' : 'people have'} looked it up recently).
              </ResponseText>
              <ResponseText className="mt-1.5 text-[11.5px] text-[var(--muted)]">
                If you know their office hours, adding them takes about a minute and gets them off this list.
              </ResponseText>
            </ResponseBody>
            <div className="border-t border-[var(--rule)] bg-[var(--surface)]/50 px-3.5 py-2.5">
              <button
                type="button"
                onClick={() => {
                  setContributeName(data.name || value);
                  setContributeOpen(true);
                }}
                className="w-full rounded-xl bg-[var(--accent)] px-3 py-2 text-left text-[12.5px] font-semibold text-white transition-colors hover:bg-[var(--accent-dark)]"
              >
                Add {data.name || value}
              </button>
            </div>
          </ResponseCard>
        ),
        timestamp: getCurrentTime(),
        variant: 'hot_prompt',
        rawText: `${data.name || value} is a heavily searched missing name.`
      }]);
    } catch {
      // tracking is best-effort
    }
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

      const reportedName = feedbackMissingName.trim();
      closeFeedbackForm();
      setMessages((prev) => ([
        ...prev,
        {
          id: `feedback-${Date.now()}`,
          type: 'bot',
          content: feedbackCategory === 'missing_name' && reportedName
            ? (
              <ResponseCard>
                <ResponseHeader label="Thanks" meta="Missing name reported" />
                <ResponseBody>
                  <ResponseText className="text-[13px]">
                    <span className="font-semibold">{reportedName}</span> is now on the missing list.
                  </ResponseText>
                  <ResponseText className="mt-1.5 text-[11.5px] text-[var(--muted)]">
                    If you know their email or office hours, adding them takes about a minute and the next person who searches gets an instant answer.
                  </ResponseText>
                </ResponseBody>
                <div className="border-t border-[var(--rule)] bg-[var(--surface)]/50 px-3.5 py-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setContributeName(reportedName);
                      setContributeOpen(true);
                    }}
                    className="w-full rounded-xl bg-[var(--accent)] px-3 py-2 text-left text-[12.5px] font-semibold text-white transition-colors hover:bg-[var(--accent-dark)]"
                  >
                    Add {reportedName}
                  </button>
                </div>
              </ResponseCard>
            )
            : (
              <ResponseCard>
                <ResponseHeader label="Thanks" meta="Feedback sent" />
                <ResponseBody>
                  <ResponseText className="text-[13px]">
                    Thanks for the feedback. It has been sent to the admin dashboard for review.
                  </ResponseText>
                </ResponseBody>
              </ResponseCard>
            ),
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
    const cleaned = String(query ?? '')
      .replaceAll(/[<>]/g, '')
      .replaceAll(/[\u0000-\u001F\u007F]/g, ' ')
      .replaceAll(/\s+/g, ' ')
      .trim()
      .slice(0, 500);

    if (cleaned.length < 1) return null;
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
      isNew={data.isNew}
      showTeamsButton={shouldShowTeamsButton(data.department)}
      emptyStateMessage={emptyStateMessage}
      onUpdate={(instructor) => openInstructorUpdate(instructor)}
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

  const openInstructorUpdate = (instructor, extraHours) => {
    const slots = extraHours || instructor?.officeHours || [];
    const hoursMap = {};
    (Array.isArray(slots) ? slots : []).forEach((slot) => {
      if (!slot?.day) return;
      const range = `${slot.start || ''}${slot.start && slot.end ? ' - ' : ''}${slot.end || ''}`.trim();
      if (!range) return;
      hoursMap[slot.day] = hoursMap[slot.day] ? `${hoursMap[slot.day]}, ${range}` : range;
    });

    setContributeInstructor({
      name: instructor?.name || instructor?.professor || '',
      department: instructor?.department || '',
      email: instructor?.email || '',
      office: instructor?.office || '',
      office_hours: hoursMap
    });
    setContributeTab('update');
    setContributeOpen(true);
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

    const renderEmailChunks = (line, lineIndex) => line.split(emailChunkRegex).map((chunk, chunkIndex) => {
      const key = `chunk-${lineIndex}-${chunkIndex}`;
      if (!chunk) return null;
      if (isEmail(chunk)) {
        return (
          <a
            key={key}
            href={`mailto:${chunk}`}
            className="text-[var(--accent)] underline decoration-[var(--accent)]/25"
          >
            {chunk}
          </a>
        );
      }
      return <React.Fragment key={key}>{chunk}</React.Fragment>;
    });

    return text.split('\n').map((line, lineIndex) => (
      <React.Fragment key={`line-${lineIndex}`}>
        {line.split(/(\*\*[^*]+\*\*)/g).map((segment, segmentIndex) => {
          const key = `segment-${lineIndex}-${segmentIndex}`;
          if (/^\*\*[^*]+\*\*$/.test(segment)) {
            return (
              <strong key={key} className="font-semibold text-[var(--ink)]">
                {segment.slice(2, -2)}
              </strong>
            );
          }
          return <React.Fragment key={key}>{renderEmailChunks(segment, `${lineIndex}-${segmentIndex}`)}</React.Fragment>;
        })}
        {lineIndex < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  const handleInputChange = (val) => {
    if (contributeOpen) {
      setContributeOpen(false);
      setContributeName('');
    }
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
    setMissingFlow(null);
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

    setMissingFlow(null);
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

    if (specificDoctor?.name) {
      lastProfessorRef.current = specificDoctor.name;
    }

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
                  isNew={specificDoctor.isNew}
                  showTeamsButton={shouldShowTeamsButton(hoursData[0].department || specificDoctor.department)}
                  onUpdate={(instructor) => openInstructorUpdate(instructor)}
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
                  isNew={specificDoctor.isNew}
                  showTeamsButton={shouldShowTeamsButton(specificDoctor.department)}
                  onUpdate={(instructor) => openInstructorUpdate(instructor)}
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
        content: (
          <ResponseCard>
            <ResponseHeader label="Try again" meta="Empty message" />
            <ResponseBody>
              <ResponseText className="text-[13px]">Please type a message.</ResponseText>
            </ResponseBody>
          </ResponseCard>
        ),
        timestamp: getCurrentTime(),
        variant: 'error',
        rawText: 'Please type a message.',
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
          body: JSON.stringify(withAnalyticsMeta({
            ...(apiPayload || { message: userText }),
            message: apiPayload?.message || userText,
            history: buildAssistantHistory(userText),
            lastProfessor: lastProfessorRef.current || null
          }))
        });
        
        const data = await response.json();
        
        setIsTyping(false);

        // Handle different response types
        if (data.type === 'ai_response' || data.type === 'smart_response') {
          // Render a focused answer card for clear intents and the full profile card otherwise.
          if (Array.isArray(data.results) && data.results.length === 1) {
            lastProfessorRef.current = data.results[0]?.professor || data.results[0]?.name || lastProfessorRef.current;
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
              quickReplies: data.quickReplies?.length ? data.quickReplies : ['By department']
            }]);
          } else {
            // Keep free-form text rendering for non-profile responses.
            setMessages(prev => [...prev, {
              id: Date.now(),
              type: 'bot',
              content: (
                <div className="space-y-3">
                  <ResponseCard>
                    <ResponseHeader label="MUBX assistant" meta="Answer" />
                    <ResponseBody>
                      <ResponseText>
                        {renderTextWithClickableEmails(data.response)}
                      </ResponseText>
                    </ResponseBody>
                  </ResponseCard>
                </div>
              ),
              timestamp: getCurrentTime(),
              variant: 'smart',
              rawText: data.response,
              quickReplies: data.quickReplies?.length ? data.quickReplies : ['By department']
            }]);
          }
        } else if (data.type === 'assistant') {
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'bot',
            content: (
              <div className="space-y-3">
                <ResponseCard>
                  <ResponseHeader label="MUBX assistant" meta="Answer" />
                  <ResponseBody>
                    <ResponseText>
                      {renderTextWithClickableEmails(data.response)}
                    </ResponseText>
                  </ResponseBody>
                </ResponseCard>
              </div>
            ),
            timestamp: getCurrentTime(),
            variant: 'smart',
            rawText: data.response,
            quickReplies: data.quickReplies?.length ? data.quickReplies : ['By department']
          }]);
        } else if (data.type === 'calendar') {
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'bot',
            content: (
              <div className="space-y-3">
                <ResponseCard>
                  <ResponseHeader
                    label="Academic snapshot"
                    meta={data.snapshot?.dateLabel || 'Amman time'}
                  />
                  <ResponseBody>
                    <ResponseText className="mb-3 text-[13px]">
                      {renderTextWithClickableEmails(data.response)}
                    </ResponseText>
                    {Array.isArray(data.facts) && data.facts.length > 0 && (
                      <ResponseGrid>
                        {data.facts.map((fact, index) => (
                          <ResponseFact
                            key={`${fact.label}-${index}`}
                            label={fact.label}
                            value={fact.value}
                            detail={fact.detail}
                            accent={fact.emphasis}
                          />
                        ))}
                      </ResponseGrid>
                    )}
                  </ResponseBody>
                </ResponseCard>
              </div>
            ),
            timestamp: getCurrentTime(),
            variant: 'smart',
            rawText: data.response,
            quickReplies: data.quickReplies?.length ? data.quickReplies : ['By department']
          }]);
        } else if (data.type === 'disambiguation') {
          // Multiple matches - ask which one they mean
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'bot',
            content: (
              <div className="space-y-3">
                <ResponseCard>
                  <ResponseHeader
                    label="Choose a match"
                    meta={`${data.options.length} ${data.options.length === 1 ? 'match' : 'matches'}`}
                  />
                  <ResponseBody>
                    <ResponseText className="text-[13px]">{data.message}</ResponseText>
                  </ResponseBody>
                  <div className="divide-y divide-[var(--rule)] border-t border-[var(--rule)]">
                    {data.options.map((prof, i) => (
                      <ResponseRow
                        key={`${prof.professor}-${i}`}
                        onClick={() => {
                          const requestedField = describeRequestedField(data.context);
                          setMessages(prev => [...prev, {
                            id: Date.now(),
                            type: 'bot',
                            content: (
                              <ResponseCard>
                                <ResponseHeader label="MUBX assistant" meta="Selection" />
                                <ResponseBody>
                                  <ResponseText className="text-[13px]">
                                    Got it. I will answer your {requestedField} question for {prof.professor}.
                                  </ResponseText>
                                </ResponseBody>
                              </ResponseCard>
                            ),
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
                      >
                        <ResponseAvatar>{prof.professor.charAt(0)}</ResponseAvatar>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-[var(--ink)]">
                            {prof.professor}
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-[var(--muted)]">
                            {[prof.department, prof.office ? `Office ${prof.office}` : null].filter(Boolean).join(' · ') || 'Faculty'}
                          </span>
                        </span>
                        <span className="text-[13px] text-[var(--accent)]">→</span>
                      </ResponseRow>
                    ))}
                  </div>
                </ResponseCard>
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
            content: (
              <ResponseCard>
                <ResponseHeader label="Try again" meta="Selection expired" />
                <ResponseBody>
                  <ResponseText className="text-[13px]">
                    {data.message || 'That selection expired. Please ask your question again.'}
                  </ResponseText>
                </ResponseBody>
              </ResponseCard>
            ),
            timestamp: getCurrentTime(),
            variant: 'error',
            rawText: data.message || 'That selection expired. Please ask your question again.',
            quickReplies: ['By department']
          }]);
        } else if (data.type === 'availability') {
          const availabilityItems = Array.isArray(data.results) ? data.results : [];
          if (data.person?.found && data.person.name) {
            lastProfessorRef.current = data.person.name;
          } else if (availabilityItems.length === 1) {
            lastProfessorRef.current = availabilityItems[0].name;
          }

          const target = data.target || {};
          const hasTargetResults = availabilityItems.length > 0;
          let personStatusLabel = '';
          let personStatusAccent = false;
          if (data.person?.found) {
            if (target.isNow) {
              personStatusLabel = data.person?.freeNow ? 'Free now' : 'Not free right now';
              personStatusAccent = Boolean(data.person?.freeNow);
            } else if (target.targetLabel) {
              personStatusLabel = hasTargetResults ? `Available ${target.targetLabel}` : `Not available ${target.targetLabel}`;
              personStatusAccent = hasTargetResults;
            } else {
              personStatusLabel = hasTargetResults ? 'Available in this window' : 'Not available in this window';
              personStatusAccent = hasTargetResults;
            }
          }

          const availabilityMeta = [
            data.currentTimeLabel,
            (data.intent?.isNow || target.isNow) ? 'checked just now' : null
          ].filter(Boolean).join(' · ');

          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'bot',
            content: (
              <div className="space-y-3">
                <ResponseCard>
                  <ResponseHeader
                    label="Availability"
                    meta={availabilityMeta || data.targetLabel}
                    badge={data.verifiedFilterApplied === false ? 'Directory data' : 'Verified only'}
                  />
                  <ResponseBody>
                    {data.targetLabel && !data.person?.found && (
                      <div className="mb-2 text-[11px] leading-snug text-[var(--muted)]">
                        {data.targetLabel}
                      </div>
                    )}

                    {data.person?.found && data.response && (
                      <ResponseText className="mb-2 text-[13px] text-[var(--ink)]">
                        {renderTextWithClickableEmails(data.response)}
                      </ResponseText>
                    )}

                    {data.person?.found && (
                      <ResponseGrid className="mb-1">
                        {personStatusLabel && (
                          <ResponseFact
                            label="Status"
                            value={personStatusLabel}
                            accent={personStatusAccent}
                            wide
                          />
                        )}
                        {data.person.department && (
                          <ResponseFact label="Department" value={data.person.department} />
                        )}
                        {data.person.office && (
                          <ResponseFact label="Office" value={data.person.office} />
                        )}
                        {data.person.email && (
                          <ResponseFact
                            label="Email"
                            value={(
                              <a href={`mailto:${data.person.email}`} className="text-[var(--accent)] underline decoration-current/25">
                                {data.person.email}
                              </a>
                            )}
                            wide
                          />
                        )}
                      </ResponseGrid>
                    )}

                    {availabilityItems.length === 0 && !data.person?.found && (
                      <ResponseText className="text-[12.5px] text-[var(--ink-soft)]">
                        {renderTextWithClickableEmails(data.response)}
                      </ResponseText>
                    )}
                  </ResponseBody>

                  {availabilityItems.length > 0 && (
                    <div className="divide-y divide-[var(--rule)] border-t border-[var(--rule)]">
                      {availabilityItems.map((item, idx) => (
                        <ResponseRow
                          key={`${item.name}-${idx}`}
                          onClick={() => handleSendMessage(item.name)}
                        >
                          <ResponseAvatar>{String(item.name).charAt(0)}</ResponseAvatar>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="truncate text-[13px] font-medium text-[var(--ink)]">{item.name}</span>
                              <span className="shrink-0 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[9.5px] font-semibold leading-none text-white">{item.statusLabel}</span>
                            </span>
                            <span className="mt-1 block truncate text-[10.5px] text-[var(--muted)]">
                              {[item.department, item.office ? `Office ${item.office}` : null, `${item.day} ${item.start}–${item.end}`].filter(Boolean).join(' · ')}
                            </span>
                          </span>
                        </ResponseRow>
                      ))}
                    </div>
                  )}

                  {availabilityItems.length > 0 && data.disclaimer && (
                    <div className="border-t border-[var(--rule)] px-3.5 py-2">
                      <ResponseText className="text-[10.5px] text-[var(--muted)]">{data.disclaimer}</ResponseText>
                    </div>
                  )}
                </ResponseCard>
              </div>
            ),
            timestamp: getCurrentTime(),
            variant: 'smart',
            rawText: data.response || (data.count > 0
              ? `Available for ${data.targetLabel}: ${availabilityItems.map(r => r.name).join(', ')}`
              : `No verified instructors available for ${data.targetLabel}.`),
            quickReplies: data.quickReplies?.length
              ? data.quickReplies
              : (availabilityItems.length > 0 ? ['By department'] : ['Who is free now?', 'By department'])
          }]);
        } else if (data.type === 'office_hours') {
          if (data.results.length === 1) {
            // Single result - show card
            lastProfessorRef.current = data.results[0]?.professor || data.results[0]?.name || lastProfessorRef.current;
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
                  <ResponseCard>
                    <ResponseHeader
                      label="Choose a match"
                      meta={`${data.results.length} ${data.results.length === 1 ? 'match' : 'matches'}`}
                    />
                    <div className="divide-y divide-[var(--rule)]">
                      {data.results.slice(0, 5).map((prof, i) => (
                        <ResponseRow
                          key={`${prof.professor}-${i}`}
                          onClick={() => handleSendMessage(prof.professor)}
                        >
                          <ResponseAvatar>{prof.professor.charAt(0)}</ResponseAvatar>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium text-[var(--ink)]">
                              {prof.professor}
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] text-[var(--muted)]">
                              {prof.department || prof.school || 'Faculty'}
                            </span>
                          </span>
                          <span className="text-[13px] text-[var(--accent)]">→</span>
                        </ResponseRow>
                      ))}
                    </div>
                  </ResponseCard>
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

          const noResultSubject = String(data.subject || data.message || userText || '').trim();
          setMissingFlow({
            name: noResultSubject,
            step: 'ask_computing',
            source: 'api',
            rawQuery: userText
          });

          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'bot',
            content: (
              <div className="space-y-3">
                <ResponseCard>
                  <ResponseHeader label="Directory" meta="School of Computing" />
                  <ResponseBody>
                    <ResponseText className="text-[13px]">
                      I couldn't find <strong>"{noResultSubject}"</strong> in the <strong>School of Computing</strong> directory.
                    </ResponseText>
                    <ResponseText className="mt-2 text-[13px] text-[var(--ink-soft)]">
                      Is this person in the <strong>School of Computing</strong>?
                    </ResponseText>
                  </ResponseBody>
                  <ResponseActions className="px-3.5 pb-3.5">
                    <button
                      type="button"
                      onClick={() => {
                        setMissingFlow({ name: noResultSubject, step: 'allow_add', source: 'api', rawQuery: userText });
                        setMessages(p => [...p, {
                          id: Date.now(),
                          type: 'bot',
                          content: (
                            <ResponseCard>
                              <ResponseHeader label="Directory" meta="School of Computing" />
                              <ResponseBody>
                                <ResponseText className="text-[13px]">
                                  Got it. If <strong>"{noResultSubject}"</strong> <strong>teaches in the School of Computing</strong>, I can collect the name for the directory.
                                </ResponseText>
                                <ResponseText className="mt-2 text-[12.5px] text-[var(--ink-soft)]">
                                  Just the name is enough to add it. If they're only in another school, <strong>reporting</strong> still helps us track the request.
                                </ResponseText>
                              </ResponseBody>
                              <ResponseActions className="px-3.5 pb-3.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setContributeName(noResultSubject);
                                    setContributeOpen(true);
                                    setMissingFlow(f => f ? { ...f, step: 'done' } : f);
                                  }}
                                  className="w-full rounded-xl bg-[var(--accent)] px-3 py-2 text-left text-[12.5px] font-semibold text-white transition-colors hover:bg-[var(--accent-dark)]"
                                >
                                  Add {noResultSubject || 'this instructor'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    openFeedbackForm({
                                      category: 'missing_name',
                                      missingName: noResultSubject,
                                      userQuery: userText,
                                      requestLabel: data.requestLabel || ''
                                    });
                                    setMissingFlow(f => f ? { ...f, step: 'done' } : f);
                                  }}
                                  className="w-full rounded-xl border border-[var(--rule)] bg-[var(--panel)] px-3 py-2 text-left text-[11.5px] font-medium text-[var(--ink-soft)] transition-colors hover:bg-[var(--surface)]"
                                >
                                  Report as missing
                                </button>
                              </ResponseActions>
                            </ResponseCard>
                          ),
                          timestamp: getCurrentTime(),
                          variant: 'no_results',
                          rawText: `Add or report ${noResultSubject}`,
                          quickReplies: ['By department']
                        }]);
                      }}
                      className="w-full rounded-xl bg-[var(--accent)] px-3 py-2 text-left text-[12.5px] font-semibold text-white transition-colors hover:bg-[var(--accent-dark)]"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMissingFlow({ name: noResultSubject, step: 'ask_other_school', source: 'api', rawQuery: userText });
                        setMessages(p => [...p, {
                          id: Date.now(),
                          type: 'bot',
                          content: (
                            <ResponseCard>
                              <ResponseHeader label="Directory" meta="School check" />
                              <ResponseBody>
                                <ResponseText className="text-[13px]">Which school are they in?</ResponseText>
                              </ResponseBody>
                              <ResponseActions className="px-3.5 pb-3.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMissingFlow({ name: noResultSubject, step: 'allow_add', source: 'api', rawQuery: userText });
                                    setMessages(pp => [...pp, {
                                      id: Date.now(),
                                      type: 'bot',
                                      content: (
                                        <ResponseCard>
                                          <ResponseHeader label="Directory" meta="School of Computing" />
                                          <ResponseBody>
                                            <ResponseText className="text-[13px]">
                                              Got it. If <strong>"{noResultSubject}"</strong> <strong>teaches in the School of Computing</strong>, I can collect the name for the directory.
                                            </ResponseText>
                                            <ResponseText className="mt-2 text-[12.5px] text-[var(--ink-soft)]">
                                              Just the name is enough to add it. If they're only in another school, <strong>reporting</strong> still helps us track the request.
                                            </ResponseText>
                                          </ResponseBody>
                                          <ResponseActions className="px-3.5 pb-3.5">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setContributeName(noResultSubject);
                                                setContributeOpen(true);
                                                setMissingFlow(f => f ? { ...f, step: 'done' } : f);
                                              }}
                                              className="w-full rounded-xl bg-[var(--accent)] px-3 py-2 text-left text-[12.5px] font-semibold text-white transition-colors hover:bg-[var(--accent-dark)]"
                                            >
                                              Add {noResultSubject || 'this instructor'}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                openFeedbackForm({
                                                  category: 'missing_name',
                                                  missingName: noResultSubject,
                                                  userQuery: userText,
                                                  requestLabel: data.requestLabel || ''
                                                });
                                                setMissingFlow(f => f ? { ...f, step: 'done' } : f);
                                              }}
                                              className="w-full rounded-xl border border-[var(--rule)] bg-[var(--panel)] px-3 py-2 text-left text-[11.5px] font-medium text-[var(--ink-soft)] transition-colors hover:bg-[var(--surface)]"
                                            >
                                              Report as missing
                                            </button>
                                          </ResponseActions>
                                        </ResponseCard>
                                      ),
                                      timestamp: getCurrentTime(),
                                      variant: 'no_results',
                                      rawText: `Add or report ${noResultSubject}`,
                                      quickReplies: ['By department']
                                    }]);
                                  }}
                                  className="w-full rounded-xl border border-[var(--rule)] bg-[var(--panel)] px-3 py-2 text-left text-[12.5px] font-medium text-[var(--ink-soft)] transition-colors hover:bg-[var(--surface)]"
                                >
                                  School of Basic Sciences and Humanities
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMissingFlow({ name: noResultSubject, step: 'engineering_only', source: 'api', rawQuery: userText });
                                    setMessages(pp => [...pp, {
                                      id: Date.now(),
                                      type: 'bot',
                                      content: (
                                        <ResponseCard>
                                          <ResponseHeader label="Directory" meta="Scope" />
                                          <ResponseBody>
                                            <ResponseText className="text-[13px]">
                                              <strong>MUBXBot only supports the School of Computing.</strong> We don't have a directory for the <strong>School of Engineering</strong> yet.
                                            </ResponseText>
                                          </ResponseBody>
                                          <ResponseActions className="px-3.5 pb-3.5">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                openFeedbackForm({
                                                  category: 'missing_name',
                                                  missingName: noResultSubject,
                                                  userQuery: userText,
                                                  requestLabel: data.requestLabel || '',
                                                  note: 'Engineering - out of scope'
                                                });
                                                setMissingFlow(f => f ? { ...f, step: 'done' } : f);
                                              }}
                                              className="w-full rounded-xl border border-[var(--rule)] bg-[var(--panel)] px-3 py-2 text-left text-[11.5px] font-medium text-[var(--ink-soft)] transition-colors hover:bg-[var(--surface)]"
                                            >
                                              Report this request
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setMissingFlow(null);
                                                handleBotResponse('Ask something else');
                                              }}
                                              className="w-full rounded-xl border border-[var(--rule)] bg-[var(--panel)] px-3 py-2 text-left text-[11.5px] font-medium text-[var(--ink-soft)] transition-colors hover:bg-[var(--surface)]"
                                            >
                                              Ask something else
                                            </button>
                                          </ResponseActions>
                                        </ResponseCard>
                                      ),
                                      timestamp: getCurrentTime(),
                                      variant: 'no_results',
                                      rawText: `Out of scope for ${noResultSubject}`,
                                      quickReplies: ['By department']
                                    }]);
                                  }}
                                  className="w-full rounded-xl border border-[var(--rule)] bg-[var(--panel)] px-3 py-2 text-left text-[12.5px] font-medium text-[var(--ink-soft)] transition-colors hover:bg-[var(--surface)]"
                                >
                                  School of Engineering
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMissingFlow({ name: noResultSubject, step: 'allow_add', source: 'api', rawQuery: userText });
                                    setMessages(pp => [...pp, {
                                      id: Date.now(),
                                      type: 'bot',
                                      content: (
                                        <ResponseCard>
                                          <ResponseHeader label="Directory" meta="School of Computing" />
                                          <ResponseBody>
                                            <ResponseText className="text-[13px]">
                                              Got it. If <strong>"{noResultSubject}"</strong> <strong>teaches in the School of Computing</strong>, I can collect the name for the directory.
                                            </ResponseText>
                                            <ResponseText className="mt-2 text-[12.5px] text-[var(--ink-soft)]">
                                              Just the name is enough to add it. If they're only in another school, <strong>reporting</strong> still helps us track the request.
                                            </ResponseText>
                                          </ResponseBody>
                                          <ResponseActions className="px-3.5 pb-3.5">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setContributeName(noResultSubject);
                                                setContributeOpen(true);
                                                setMissingFlow(f => f ? { ...f, step: 'done' } : f);
                                              }}
                                              className="w-full rounded-xl bg-[var(--accent)] px-3 py-2 text-left text-[12.5px] font-semibold text-white transition-colors hover:bg-[var(--accent-dark)]"
                                            >
                                              Add {noResultSubject || 'this instructor'}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                openFeedbackForm({
                                                  category: 'missing_name',
                                                  missingName: noResultSubject,
                                                  userQuery: userText,
                                                  requestLabel: data.requestLabel || ''
                                                });
                                                setMissingFlow(f => f ? { ...f, step: 'done' } : f);
                                              }}
                                              className="w-full rounded-xl border border-[var(--rule)] bg-[var(--panel)] px-3 py-2 text-left text-[11.5px] font-medium text-[var(--ink-soft)] transition-colors hover:bg-[var(--surface)]"
                                            >
                                              Report as missing
                                            </button>
                                          </ResponseActions>
                                        </ResponseCard>
                                      ),
                                      timestamp: getCurrentTime(),
                                      variant: 'no_results',
                                      rawText: `Add or report ${noResultSubject}`,
                                      quickReplies: ['By department']
                                    }]);
                                  }}
                                  className="w-full rounded-xl border border-[var(--rule)] bg-[var(--panel)] px-3 py-2 text-left text-[12.5px] font-medium text-[var(--ink-soft)] transition-colors hover:bg-[var(--surface)]"
                                >
                                  Not sure / Other
                                </button>
                              </ResponseActions>
                            </ResponseCard>
                          ),
                          timestamp: getCurrentTime(),
                          variant: 'no_results',
                          rawText: 'Which school?',
                          quickReplies: ['By department']
                        }]);
                      }}
                      className="w-full rounded-xl border border-[var(--rule)] bg-[var(--panel)] px-3 py-2 text-left text-[12.5px] font-medium text-[var(--ink-soft)] transition-colors hover:bg-[var(--surface)]"
                    >
                      No
                    </button>
                  </ResponseActions>
                </ResponseCard>
              </div>
            ),
            timestamp: getCurrentTime(),
            variant: 'no_results',
            rawText: `Not found: ${noResultSubject}`,
            quickReplies: ['By department']
          }]);
        } else {
          // Help message
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'bot',
            content: (
              <ResponseCard>
                <ResponseHeader label="MUBX assistant" meta="Help" />
                <ResponseBody>
                  <ResponseText className="text-[13px]">
                    Quick patterns:{'\n'}
                    • what + name = email{'\n'}
                    • when + name = office hours{'\n'}
                    • where + name = office code{'\n'}
                    • Who is free now / Who is free today at 10:00 AM = availability (schedule only){'\n'}
                    • By department = browse{'\n'}
                    • Type help for examples
                  </ResponseText>
                </ResponseBody>
              </ResponseCard>
            ),
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

    if (lowerText === "by department" || lowerText === "ask something else") {
      setMissingFlow(null);
      // Normalize departments and get unique list (Bug #10)
      const departments = [...new Set(instructors.map(i => normalizeDepartment(i.department)))].sort((a, b) => a.localeCompare(b));
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'bot',
        content: (
          <div className="space-y-3">
            <ResponseCard>
              <ResponseHeader
                label="Explore departments"
                meta={`${departments.length} ${departments.length === 1 ? 'department' : 'departments'}`}
              />
              <ResponseBody>
                <ResponseText className="mb-2 text-[12px] text-[var(--muted)]">
                  Browse the School of Computing by department.
                </ResponseText>
                <div className="flex flex-wrap gap-2">
                  {departments.map(dept => (
                    <button
                      key={`dept-${dept}`}
                      onClick={() => handleSendMessage(dept)}
                      className="rounded-full border border-[var(--rule)] bg-[var(--panel)] px-3 py-1.5 text-[11.5px] font-medium text-[var(--ink-soft)] transition-all hover:border-[var(--accent-line)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] active:scale-95"
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              </ResponseBody>
            </ResponseCard>
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
        content: (
          <ResponseCard>
            <ResponseHeader label="Please wait" meta="Directory loading" />
            <ResponseBody>
              <ResponseText className="text-[13px]">
                I'm still preparing the directory. Please wait just a second.
              </ResponseText>
            </ResponseBody>
          </ResponseCard>
        ),
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

      recordMissingNameSearch(userText);
      const missingSubject = String(userText || '').trim();
      setMissingFlow({
        name: missingSubject,
        step: 'ask_computing',
        source: 'fallback',
        rawQuery: userText
      });

      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'bot',
        content: (
          <div className="space-y-3">
            <ResponseCard>
              <ResponseHeader label="Directory" meta="School of Computing" />
              <ResponseBody>
                <ResponseText className="text-[13px]">
                  I couldn't find <strong>"{missingSubject}"</strong> in the <strong>School of Computing</strong> directory.
                </ResponseText>
                <ResponseText className="mt-2 text-[13px] text-[var(--ink-soft)]">
                  Is this person in the <strong>School of Computing</strong>?
                </ResponseText>
              </ResponseBody>
              <ResponseActions className="px-3.5 pb-3.5">
                <button
                  type="button"
                  onClick={() => {
                    setMissingFlow({ name: missingSubject, step: 'allow_add', source: 'fallback', rawQuery: userText });
                    setMessages(p => [...p, {
                      id: Date.now(),
                      type: 'bot',
                      content: (
                        <ResponseCard>
                          <ResponseHeader label="Directory" meta="School of Computing" />
                          <ResponseBody>
                            <ResponseText className="text-[13px]">
                              Got it. If <strong>"{missingSubject}"</strong> <strong>teaches in the School of Computing</strong>, I can collect the name for the directory.
                            </ResponseText>
                            <ResponseText className="mt-2 text-[12.5px] text-[var(--ink-soft)]">
                              Just the name is enough to add it. If they're only in another school, <strong>reporting</strong> still helps us track the request.
                            </ResponseText>
                          </ResponseBody>
                          <ResponseActions className="px-3.5 pb-3.5">
                            <button
                              type="button"
                              onClick={() => {
                                setContributeName(missingSubject);
                                setContributeOpen(true);
                                setMissingFlow(f => f ? { ...f, step: 'done' } : f);
                              }}
                              className="w-full rounded-xl bg-[var(--accent)] px-3 py-2 text-left text-[12.5px] font-semibold text-white transition-colors hover:bg-[var(--accent-dark)]"
                            >
                              Add {missingSubject || 'this instructor'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                openFeedbackForm({ category: 'missing_name', missingName: missingSubject, userQuery: userText });
                                setMissingFlow(f => f ? { ...f, step: 'done' } : f);
                              }}
                              className="w-full rounded-xl border border-[var(--rule)] bg-[var(--panel)] px-3 py-2 text-left text-[11.5px] font-medium text-[var(--ink-soft)] transition-colors hover:bg-[var(--surface)]"
                            >
                              Report as missing
                            </button>
                          </ResponseActions>
                        </ResponseCard>
                      ),
                      timestamp: getCurrentTime(),
                      variant: 'no_results',
                      rawText: `Add or report ${missingSubject}`,
                      quickReplies: ['By department']
                    }]);
                  }}
                  className="w-full rounded-xl bg-[var(--accent)] px-3 py-2 text-left text-[12.5px] font-semibold text-white transition-colors hover:bg-[var(--accent-dark)]"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMissingFlow({ name: missingSubject, step: 'ask_other_school', source: 'fallback', rawQuery: userText });
                    setMessages(p => [...p, {
                      id: Date.now(),
                      type: 'bot',
                      content: (
                        <ResponseCard>
                          <ResponseHeader label="Directory" meta="School check" />
                          <ResponseBody>
                            <ResponseText className="text-[13px]">Which school are they in?</ResponseText>
                          </ResponseBody>
                          <ResponseActions className="px-3.5 pb-3.5">
                            <button
                              type="button"
                              onClick={() => {
                                setMissingFlow({ name: missingSubject, step: 'allow_add', source: 'fallback', rawQuery: userText });
                                setMessages(pp => [...pp, {
                                  id: Date.now(),
                                  type: 'bot',
                                  content: (
                                    <ResponseCard>
                                      <ResponseHeader label="Directory" meta="School of Computing" />
                                      <ResponseBody>
                                        <ResponseText className="text-[13px]">
                                          Got it. If <strong>"{missingSubject}"</strong> <strong>teaches in the School of Computing</strong>, I can collect the name for the directory.
                                        </ResponseText>
                                        <ResponseText className="mt-2 text-[12.5px] text-[var(--ink-soft)]">
                                          Just the name is enough to add it. If they're only in another school, <strong>reporting</strong> still helps us track the request.
                                        </ResponseText>
                                      </ResponseBody>
                                      <ResponseActions className="px-3.5 pb-3.5">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setContributeName(missingSubject);
                                            setContributeOpen(true);
                                            setMissingFlow(f => f ? { ...f, step: 'done' } : f);
                                          }}
                                          className="w-full rounded-xl bg-[var(--accent)] px-3 py-2 text-left text-[12.5px] font-semibold text-white transition-colors hover:bg-[var(--accent-dark)]"
                                        >
                                          Add {missingSubject || 'this instructor'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            openFeedbackForm({ category: 'missing_name', missingName: missingSubject, userQuery: userText });
                                            setMissingFlow(f => f ? { ...f, step: 'done' } : f);
                                          }}
                                          className="w-full rounded-xl border border-[var(--rule)] bg-[var(--panel)] px-3 py-2 text-left text-[11.5px] font-medium text-[var(--ink-soft)] transition-colors hover:bg-[var(--surface)]"
                                        >
                                          Report as missing
                                        </button>
                                      </ResponseActions>
                                    </ResponseCard>
                                  ),
                                  timestamp: getCurrentTime(),
                                  variant: 'no_results',
                                  rawText: `Add or report ${missingSubject}`,
                                  quickReplies: ['By department']
                                }]);
                              }}
                              className="w-full rounded-xl border border-[var(--rule)] bg-[var(--panel)] px-3 py-2 text-left text-[12.5px] font-medium text-[var(--ink-soft)] transition-colors hover:bg-[var(--surface)]"
                            >
                              School of Basic Sciences and Humanities
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMissingFlow({ name: missingSubject, step: 'engineering_only', source: 'fallback', rawQuery: userText });
                                setMessages(pp => [...pp, {
                                  id: Date.now(),
                                  type: 'bot',
                                  content: (
                                    <ResponseCard>
                                      <ResponseHeader label="Directory" meta="Scope" />
                                      <ResponseBody>
                                        <ResponseText className="text-[13px]">
                                          <strong>MUBXBot only supports the School of Computing.</strong> We don't have a directory for the <strong>School of Engineering</strong> yet.
                                        </ResponseText>
                                      </ResponseBody>
                                      <ResponseActions className="px-3.5 pb-3.5">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            openFeedbackForm({ category: 'missing_name', missingName: missingSubject, userQuery: userText, note: 'Engineering - out of scope' });
                                            setMissingFlow(f => f ? { ...f, step: 'done' } : f);
                                          }}
                                          className="w-full rounded-xl border border-[var(--rule)] bg-[var(--panel)] px-3 py-2 text-left text-[11.5px] font-medium text-[var(--ink-soft)] transition-colors hover:bg-[var(--surface)]"
                                        >
                                          Report this request
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setMissingFlow(null);
                                            handleBotResponse('Ask something else');
                                          }}
                                          className="w-full rounded-xl border border-[var(--rule)] bg-[var(--panel)] px-3 py-2 text-left text-[11.5px] font-medium text-[var(--ink-soft)] transition-colors hover:bg-[var(--surface)]"
                                        >
                                          Ask something else
                                        </button>
                                      </ResponseActions>
                                    </ResponseCard>
                                  ),
                                  timestamp: getCurrentTime(),
                                  variant: 'no_results',
                                  rawText: `Out of scope for ${missingSubject}`,
                                  quickReplies: ['By department']
                                }]);
                              }}
                              className="w-full rounded-xl border border-[var(--rule)] bg-[var(--panel)] px-3 py-2 text-left text-[12.5px] font-medium text-[var(--ink-soft)] transition-colors hover:bg-[var(--surface)]"
                            >
                              School of Engineering
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMissingFlow({ name: missingSubject, step: 'allow_add', source: 'fallback', rawQuery: userText });
                                setMessages(pp => [...pp, {
                                  id: Date.now(),
                                  type: 'bot',
                                  content: (
                                    <ResponseCard>
                                      <ResponseHeader label="Directory" meta="School of Computing" />
                                      <ResponseBody>
                                        <ResponseText className="text-[13px]">
                                          Got it. If <strong>"{missingSubject}"</strong> <strong>teaches in the School of Computing</strong>, I can collect the name for the directory.
                                        </ResponseText>
                                        <ResponseText className="mt-2 text-[12.5px] text-[var(--ink-soft)]">
                                          Just the name is enough to add it. If they're only in another school, <strong>reporting</strong> still helps us track the request.
                                        </ResponseText>
                                      </ResponseBody>
                                      <ResponseActions className="px-3.5 pb-3.5">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setContributeName(missingSubject);
                                            setContributeOpen(true);
                                            setMissingFlow(f => f ? { ...f, step: 'done' } : f);
                                          }}
                                          className="w-full rounded-xl bg-[var(--accent)] px-3 py-2 text-left text-[12.5px] font-semibold text-white transition-colors hover:bg-[var(--accent-dark)]"
                                        >
                                          Add {missingSubject || 'this instructor'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            openFeedbackForm({ category: 'missing_name', missingName: missingSubject, userQuery: userText });
                                            setMissingFlow(f => f ? { ...f, step: 'done' } : f);
                                          }}
                                          className="w-full rounded-xl border border-[var(--rule)] bg-[var(--panel)] px-3 py-2 text-left text-[11.5px] font-medium text-[var(--ink-soft)] transition-colors hover:bg-[var(--surface)]"
                                        >
                                          Report as missing
                                        </button>
                                      </ResponseActions>
                                    </ResponseCard>
                                  ),
                                  timestamp: getCurrentTime(),
                                  variant: 'no_results',
                                  rawText: `Add or report ${missingSubject}`,
                                  quickReplies: ['By department']
                                }]);
                              }}
                              className="w-full rounded-xl border border-[var(--rule)] bg-[var(--panel)] px-3 py-2 text-left text-[12.5px] font-medium text-[var(--ink-soft)] transition-colors hover:bg-[var(--surface)]"
                            >
                              Not sure / Other
                            </button>
                          </ResponseActions>
                        </ResponseCard>
                      ),
                      timestamp: getCurrentTime(),
                      variant: 'no_results',
                      rawText: 'Which school?',
                      quickReplies: ['By department']
                    }]);
                  }}
                  className="w-full rounded-xl border border-[var(--rule)] bg-[var(--panel)] px-3 py-2 text-left text-[12.5px] font-medium text-[var(--ink-soft)] transition-colors hover:bg-[var(--surface)]"
                >
                  No
                </button>
              </ResponseActions>
            </ResponseCard>
          </div>
        ),
        timestamp: getCurrentTime(),
        variant: 'no_results',
        rawText: `Not found: ${missingSubject}`,
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
                isNew={doctor.isNew}
                showTeamsButton={shouldShowTeamsButton(hoursData[0].department || doctor.department)}
                onUpdate={(instructor) => openInstructorUpdate(instructor)}
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
                isNew={doctor.isNew}
                showTeamsButton={shouldShowTeamsButton(doctor.department)}
                onUpdate={(instructor) => openInstructorUpdate(instructor)}
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
            <ResponseCard>
              <ResponseHeader
                label="Choose a match"
                meta={`${results.length} ${results.length === 1 ? 'match' : 'matches'}`}
              />
              <div className="divide-y divide-[var(--rule)]">
                {results.slice(0, 5).map((r, i) => (
                  <ResponseRow key={i} onClick={() => handleSendMessage(r.item.name, r.item)}>
                    <ResponseAvatar>{r.item.name.charAt(0)}</ResponseAvatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-[var(--ink)]">
                        {r.item.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-[var(--muted)]">
                        {r.item.department || 'Faculty'}
                      </span>
                    </span>
                    <span className="text-[13px] text-[var(--accent)]">→</span>
                  </ResponseRow>
                ))}
              </div>
            </ResponseCard>
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
      <div className="flex h-[100dvh] w-full items-center justify-center bg-[var(--paper)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-[var(--rule)] border-t-[var(--accent)]" />
          <p className="animate-pulse text-[12.5px] text-[var(--muted)]">Getting things ready…</p>
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
    <main className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[var(--paper)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: homeStructuredDataJson }}
      />

      <noscript>
        MUBXBot is the HTU School of Computing and Informatics assistant for finding instructor emails, office hours, departments, and office locations.
      </noscript>

      {/* Header */}
      <ChatHeader
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenFeedback={() => openFeedbackForm({ category: 'general' })}
        onNewChat={handleClearConversation}
        showNewChat={hasConversationHistory}
      />

      {/* Live academic calendar banner */}
      <AcademicStatusBanner />

      {/* Messages Area */}
      <div className="relative flex-1 overflow-y-auto bg-[var(--paper)] chat-scroll">
        <div className="mx-auto flex min-h-full w-full max-w-[768px] flex-col py-4 sm:py-6">
          {hasConversationHistory && (
            <div className="flex flex-wrap items-center justify-end gap-1 px-4 pb-1 sm:px-6">
              <button
                type="button"
                onClick={handleCopyLastAnswer}
                className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--ink)]"
                aria-label="Copy last answer"
              >
                <Copy className="h-3.5 w-3.5" strokeWidth={1.8} /> Copy
              </button>
              <button
                type="button"
                onClick={handlePinLastAnswer}
                className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--ink)]"
                aria-label="Pin useful result"
              >
                <Pin className="h-3.5 w-3.5" strokeWidth={1.8} /> Pin
              </button>
            </div>
          )}

          {pinnedResponses.length > 0 && (
            <div className="px-4 pb-3 sm:px-6">
              <div className="space-y-2 rounded-2xl border border-[var(--rule)] bg-[var(--surface)]/50 p-3">
                <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-[var(--ink-soft)]">
                  <Pin className="h-3.5 w-3.5 text-[var(--accent)]" strokeWidth={1.8} />
                  Pinned notes
                </div>
                {pinnedResponses.map((item) => (
                  <div key={item} className="border-b border-[var(--rule)] pb-2 text-[12.5px] leading-relaxed text-[var(--ink-soft)] last:border-0 last:pb-0">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col justify-center">
              <EmptyState onAsk={(query) => handleSendMessage(query)} />
            </div>
          ) : (
            <div className="space-y-3 pb-2 sm:space-y-4">
              {messages.map((message, index) => (
                <div key={message.id} className="space-y-3 sm:space-y-4">
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
      </div>

      {/* Suggestions Overlay */}
      {suggestions.length > 0 && (
        <div className="absolute bottom-[92px] left-3 right-3 z-50 overflow-hidden rounded-2xl border border-[var(--rule)] bg-[var(--panel)] shadow-[0_18px_50px_rgba(0,0,0,0.12)] animate-in slide-in-from-bottom-2 fade-in duration-200 sm:bottom-[96px] sm:left-1/2 sm:right-auto sm:w-[min(720px,calc(100%-2rem))] sm:-translate-x-1/2">
          <div className="flex items-center justify-between border-b border-[var(--rule)] px-3.5 py-2.5">
            <span className="text-[11.5px] font-medium text-[var(--muted)]">Suggestions</span>
            <button onClick={() => { setSuggestions([]); setHighlightedSuggestionIndex(-1); }} className="rounded-full p-1 text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--ink)]" aria-label="Close suggestions"><X size={14} /></button>
          </div>
          <div className="max-h-[45dvh] overflow-y-auto p-1.5 sm:max-h-[240px]">
            {suggestions.map((s, index) => (
              <button
                key={`${s.item?.name || 'suggestion'}-${index}`}
                onClick={() => handleSendMessage(s.item.name, s.item)}
                className={`group flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors ${
                  highlightedSuggestionIndex === index ? 'bg-[var(--surface)]' : 'hover:bg-[var(--surface)]'
                }`}
                aria-label={`Choose ${s.item.name}`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[12px] font-semibold text-[var(--ink-soft)] transition-colors group-hover:bg-[var(--paper)]">
                  {s.item.name.charAt(0)}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="truncate text-[13.5px] font-medium text-[var(--ink)]">{highlightQueryMatch(s.item.name, inputValue)}</div>
                  <div className="truncate text-[11px] text-[var(--muted)]">{s.item.department}</div>
                </div>
                <Search size={14} className="shrink-0 text-[var(--muted)] opacity-50" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contribute Bottom Sheet */}
      <ContributeFlow
        variant="modal"
        open={contributeOpen}
        onOpenChange={(v) => {
          setContributeOpen(v);
          if (!v) {
            setContributeName('');
            setContributeInstructor(null);
            setContributeTab('add');
          }
        }}
        initialName={contributeName}
        initialInstructor={contributeInstructor}
        initialTab={contributeTab}
      />

      {/* Input Bar */}
      <ChatInput
        value={inputValue}
        onSend={handleSendMessage}
        onChange={handleInputChange}
        onKeyDown={handleInputKeyDown}
        inlineSuggestion={inlineSuggestion}
        placeholder="Ask about an instructor, office, or department…"
        accessoryOpen={contributeOpen}
        onAccessoryClick={() => {
          if (contributeOpen) {
            setContributeOpen(false);
            setContributeName('');
          } else {
            setContributeOpen(true);
          }
        }}
      />

      {feedbackOpen && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <button
            aria-label="Close feedback modal"
            onClick={closeFeedbackForm}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          />
          <div className="relative w-full rounded-t-3xl border border-[var(--rule)] bg-[var(--panel)] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.2)] sm:max-w-xl sm:rounded-3xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[20px] font-semibold leading-tight tracking-[-0.01em] text-[var(--ink)]">
                  {feedbackCategory === 'missing_name' ? 'Add a missing name' : 'Send feedback'}
                </h2>
                <p className="mt-1 text-[12.5px] text-[var(--muted)]">
                  Help us keep the directory accurate for everyone.
                </p>
              </div>
              <button onClick={closeFeedbackForm} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--ink)]" aria-label="Close feedback">✕</button>
            </div>

            {feedbackCategory === 'missing_name' && (
              <div className="mb-4 rounded-xl border border-[var(--rule)] bg-[var(--surface)]/60 px-3.5 py-3 text-[13px] leading-relaxed">
                <div className="font-medium text-[var(--ink)]">
                  {feedbackMissingName ? `${feedbackMissingName} isn't in the directory yet.` : 'Which instructor is missing?'}
                </div>
                <div className="mt-0.5 text-[var(--muted)]">
                  Flagging it bumps them up our list, so the next person searching that name gets a real answer.
                </div>
              </div>
            )}

            {feedbackCategory === 'missing_name' && (
              <div className="mb-4 flex flex-wrap gap-1.5">
                {(contributeName ? [contributeName] : []).filter(Boolean).map((n) => (
                  <span key={n} className="text-[11px] px-2 py-1 rounded-full bg-black/5 dark:bg-white/10">
                    from your search: {n}
                  </span>
                ))}
                {feedbackContext?.requestLabel && (
                  <span className="text-[11px] px-2 py-1 rounded-full bg-black/5 dark:bg-white/10">
                    asked for: {feedbackContext.requestLabel}
                  </span>
                )}
              </div>
            )}

            <form onSubmit={submitFeedback} className="space-y-4">
              <div>
                <label htmlFor="feedback-type" className="text-[12px] font-medium text-[var(--ink-soft)]">Type</label>
                <select
                  id="feedback-type"
                  value={feedbackCategory}
                  onChange={(e) => setFeedbackCategory(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[var(--rule)] bg-[var(--paper)] px-3 py-2.5 text-[14px] text-[var(--ink)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
                >
                  <option value="general">General feedback</option>
                  <option value="missing_name">Missing instructor name</option>
                </select>
              </div>

              {feedbackCategory === 'missing_name' && (
                <div>
                  <label htmlFor="feedback-missing-name" className="text-[12px] font-medium text-[var(--ink-soft)]">Instructor name</label>
                  <input
                    id="feedback-missing-name"
                    value={feedbackMissingName}
                    onChange={(e) => setFeedbackMissingName(e.target.value)}
                    placeholder="Example: Dr. Jane Doe"
                    className="mt-1.5 w-full rounded-xl border border-[var(--rule)] bg-[var(--paper)] px-3 py-2.5 text-[14px] text-[var(--ink)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
                  />
                </div>
              )}

              <div>
                <label htmlFor="feedback-details" className="text-[12px] font-medium text-[var(--ink-soft)]">Details</label>
                <textarea
                  id="feedback-details"
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  rows={4}
                  placeholder="Tell us what is missing or how we can improve"
                  className="mt-1.5 w-full rounded-xl border border-[var(--rule)] bg-[var(--paper)] px-3 py-2.5 text-[14px] text-[var(--ink)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
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
                className="w-full rounded-full bg-[var(--ink)] px-4 py-3 text-[13.5px] font-medium text-[var(--paper)] transition-all hover:opacity-85 active:scale-[0.99] disabled:opacity-50"
              >
                {feedbackSubmitting
                  ? 'Sending...'
                  : feedbackCategory === 'missing_name'
                    ? 'Add to the missing list'
                    : 'Submit feedback'}
              </button>
            </form>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-5 left-1/2 z-[200] -translate-x-1/2 rounded-full bg-[var(--ink)] px-4 py-2.5 text-[12px] font-medium text-[var(--paper)] shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
          {toastMessage}
        </div>
      )}
    </main>
  );
}
