'use strict';

/**
 * Intent + entity extraction for the MUBX assistant.
 *
 * The goal is to understand a student's message before we ever touch the
 * faculty search index. Greetings, calendar questions, and "who is free"
 * questions must never be treated as a professor name.
 */

const calendar = require('../academicCalendar.js');
const { parseScheduleTime } = require('../scheduleTime.js');

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_INDEX = DAYS.reduce((acc, day, index) => {
  acc[day] = index;
  return acc;
}, {});

const MONTHS = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12
};

const TITLE_WORDS = new Set(['dr', 'dr.', 'doctor', 'eng', 'eng.', 'prof', 'prof.', 'professor', 'lecturer', 'mr', 'mr.', 'mrs', 'ms']);

const QUESTION_WORDS = new Set([
  'who', 'whom', 'whose', 'whos', 'what', 'whats', 'when', 'whens', 'where', 'wheres',
  'which', 'why', 'how', 'hows',
  'is', 'are', 'am', 'was', 'were', 'do', 'does', 'did', 'can', 'could', 'would',
  'should', 'will', 'shall', 'may', 'might', 'please', 'tell', 'show', 'give', 'find',
  'me', 'us', 'i', 'my', 'our', 'the', 'a', 'an', 'of', 'to', 'for', 'in', 'on', 'at',
  'with', 'from', 'about', 'and', 'or', 'any', 'anyone', 'somebody', 'someone',
  'there', 'here', 'it', 'its', 'this', 'that', 'these', 'those', 'now', 'right',
  'currently', 'today', 'tonight', 'tomorrow', 'current', 'time', 'hour', 'free',
  'available', 'availability', 'open', 'meet', 'meeting', 'see', 'visit', 'office',
  'hours', 'hour', 'schedule', 'email', 'mail', 'contact', 'department', 'dept',
  'faculty', 'instructor', 'instructors', 'professor', 'professors', 'doctor', 'doctors',
  'teacher', 'teachers', 'staff', 'member', 'members', 'list', 'all', 'browse',
  'morning', 'afternoon', 'evening', 'night', 'noon', 'midday', 'between', 'after',
  'before', 'until', 'till', 'around', 'at', 'past', 'next', 'last', 'this',
  'him', 'her', 'his', 'hers', 'their', 'theirs', 'they', 'she', 'he', 'same', 'one',
  'again', 'still', 'also', 'too', 'sir', 'madam',
  'named', 'called', 'name', 'lecturer', 'lecturers', 'you', 'know', 'looking',
  'look', 'search', 'searching', 'mubx', 'mubxbot', 'has', 'have'
]);

const DEPARTMENT_PATTERNS = [
  { name: 'Computer Science', pattern: /\b(cs|computer science|comp sci|computing)\b/ },
  { name: 'Cybersecurity', pattern: /\b(cyber ?security|cybersecurity|security)\b/ },
  { name: 'AI & Data Science', pattern: /\b(ai|artificial intelligence|data science|data and ai|ds)\b/ },
  { name: 'Information Technology', pattern: /\b(it|information technology|informatics)\b/ },
  { name: 'Basic Sciences', pattern: /\bbasic sciences\b/ },
  { name: 'Engineering', pattern: /\bengineering\b/ },
  { name: 'Finance', pattern: /\bfinance\b/ },
  { name: 'Languages', pattern: /\blanguages?\b/ },
  { name: 'Leadership & Entrepreneurship', pattern: /\bleadership\b/ },
  { name: 'Games Design and Development', pattern: /\bgames? design\b/ }
];

const GREETING_PATTERN = /^(hi|hii+|hey+|heyy+|hello+|hallo|hiya|yo|sup|salam|salaam|marhaba|marhaban|greetings|good morning|good afternoon|good evening|good day)( there| again| all| everyone| mubx| mubxbot| bot)?$/;
const GREETING_PLUS_PATTERN = /^(hi|hii+|hey+|heyy+|hello+|hiya|yo|salam|marhaba|good morning|good afternoon|good evening)[,!.\s]+(it'?s me|its me|im back|i'?m back|how are you|how r u|how are u|what'?s up|whats up)$/;
const THANKS_PATTERN = /^(thanks|thank you|thank u|thx|ty|many thanks|shukran|merci|appreciate it|that helps|perfect|great|awesome|nice)( so much| a lot| very much| again)?$/;
const BYE_PATTERN = /^(bye|goodbye|good bye|see you|see ya|cya|later|good night|goodnight|take care|salam|ma salama)$/;
const IDENTITY_PATTERN = /\b(who|what) (are|r) (you|u)\b|\byour name\b|\bwhat is mubx( ?bot)?\b|\bwho (made|built|created) you\b|\bare you (a )?(bot|ai|robot)\b/;
const CAPABILITIES_PATTERN = /\b(what can you do|what do you do|how can you help|how do you work|what do you know|what can i ask|commands|features|capabilities)\b|^help( me)?$/;
const TIME_PATTERN = /\b(what|whats|what's) (is )?(the )?(time|hour)\b|\bcurrent (time|hour)\b|\bwhat time is it\b|\btime now\b|\bwhats the time\b/;
const DATE_PATTERN = /\b(what|whats|what's) (is )?(the )?(day|date)\b|\bwhat day is (it|today)\b|\bwhats the date\b|\bwhat is today'?s date\b|\btoday'?s date\b/;
const CALENDAR_PATTERN = /\b(semester|term|academic calendar|calendar|holiday|holidays|vacation|break|deadline|finals?|exams?|christmas|new year|eid|ramadan|registration|quiet week|classes (start|end)|end of (the )?(semester|term|classes)|next semester|days left|weeks? (left|in)|which week)\b/;
const FREE_PATTERN = /\b(free|available|availability|open now|open right now|who can i (meet|see)|can i (meet|see)|who should i (meet|see))\b/;
const ROSTER_PATTERN = /\b(who|which|list|show|all|browse) (is |are )?(the )?(instructors?|professors?|faculty|staff|doctors?|teachers?)?\s*(in|of|from|teaches?|teaching)?\s*(computer science|cs|cyber ?security|cybersecurity|ai|artificial intelligence|data science|information technology|it|basic sciences|engineering|finance|languages|leadership|games design)\b|\b(instructors?|professors?|faculty|staff) in\b|\bwho teaches\b/;
const FIELD_PATTERN = /\b(email|e-mail|mail|contact|office|room|location|where|department|dept|schedule|hours|when|free|available)\b/;
const PRONOUN_PATTERN = /\b(his|her|hers|their|theirs|him|she|he|they|that (professor|instructor|doctor|person)|same)\b/;
const FOLLOWUP_START_PATTERN = /^(and|also|then|ok(ay)?|what about|how about|same|what else)\b/;

const ACTION_WORDS = new Set([
  'make', 'create', 'write', 'build', 'code', 'fix', 'help', 'give', 'tell', 'show',
  'open', 'close', 'play', 'eat', 'cook', 'buy', 'send', 'call', 'need', 'want',
  'learn', 'study', 'explain', 'define', 'translate', 'summarize', 'search', 'book',
  'register', 'apply', 'download', 'upload', 'print', 'calculate', 'solve', 'draw'
]);

function normalize(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s:.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value = '') {
  return normalize(value).split(' ').filter(Boolean);
}

function getTodayParts(now = new Date()) {
  return calendar.getZonedParts(now);
}

function dateKeyForOffset(parts, offsetDays = 0) {
  return calendar.addDays(calendar.toDateKey(parts), offsetDays);
}

function weekdayForDateKey(dateKey) {
  const { year, month, day } = calendar.parseDateKey(dateKey);
  const index = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return DAYS[index];
}

function formatDayLabel(dateKey, todayKey) {
  const offset = calendar.diffDays(todayKey, dateKey);
  if (offset === 0) return 'today';
  if (offset === 1) return 'tomorrow';
  const weekday = weekdayForDateKey(dateKey);
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${calendar.formatDateKey(dateKey, { withYear: false })}`;
}

/**
 * Resolve "today", "tomorrow", "on Monday", "next Wednesday", or a date such
 * as "24 Oct". Returns a date key plus a human label.
 */
function parseDay(text, now = new Date()) {
  const q = normalize(text);
  const parts = getTodayParts(now);
  const todayKey = calendar.toDateKey(parts);
  const todayIndex = DAY_INDEX[weekdayForDateKey(todayKey)];

  const explicitDate = q.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\b/)
    || q.match(/\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+(\d{1,2})(?:st|nd|rd|th)?\b/);

  if (explicitDate) {
    const dayFirst = /^\d/.test(explicitDate[1]);
    const day = Number(dayFirst ? explicitDate[1] : explicitDate[2]);
    const month = MONTHS[dayFirst ? explicitDate[2] : explicitDate[1]];
    if (Number.isFinite(day) && month) {
      let year = parts.year;
      let key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (calendar.diffDays(todayKey, key) < 0) {
        year += 1;
        key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
      return {
        dateKey: key,
        offsetDays: calendar.diffDays(todayKey, key),
        weekday: weekdayForDateKey(key),
        label: formatDayLabel(key, todayKey),
        explicit: true
      };
    }
  }

  if (/\bday after tomorrow\b/.test(q)) {
    const key = dateKeyForOffset(parts, 2);
    return { dateKey: key, offsetDays: 2, weekday: weekdayForDateKey(key), label: formatDayLabel(key, todayKey), explicit: true };
  }

  if (/\btomorrow\b/.test(q)) {
    const key = dateKeyForOffset(parts, 1);
    return { dateKey: key, offsetDays: 1, weekday: weekdayForDateKey(key), label: 'tomorrow', explicit: true };
  }

  if (/\b(today|tonight|this morning|this afternoon|this evening)\b/.test(q)) {
    return { dateKey: todayKey, offsetDays: 0, weekday: weekdayForDateKey(todayKey), label: 'today', explicit: true };
  }

  for (const day of DAYS) {
    if (!new RegExp(`\\b${day}\\b`).test(q)) continue;

    let offset = (DAY_INDEX[day] - todayIndex + 7) % 7;
    if (/\bnext\b/.test(q) && offset === 0) offset = 7;
    const key = dateKeyForOffset(parts, offset);

    return {
      dateKey: key,
      offsetDays: offset,
      weekday: day,
      label: formatDayLabel(key, todayKey),
      explicit: true
    };
  }

  return null;
}

function parseTimeToken(token) {
  const parsed = parseScheduleTime(token);
  return parsed ? parsed.totalMinutes : null;
}

/**
 * Resolve a time window: "at 10", "10:30 am", "between 2 and 4",
 * "from 10 to 12", "after 3", "before noon", "this morning".
 */
function parseTimeWindow(text) {
  const q = normalize(text);

  const period = (() => {
    if (/\b(tonight|night)\b/.test(q)) return { startMinutes: 17 * 60, endMinutes: 23 * 60 + 59, label: 'tonight' };
    if (/\b(morning)\b/.test(q)) return { startMinutes: 8 * 60, endMinutes: 12 * 60, label: 'this morning' };
    if (/\b(afternoon)\b/.test(q)) return { startMinutes: 12 * 60, endMinutes: 17 * 60, label: 'this afternoon' };
    if (/\b(evening)\b/.test(q)) return { startMinutes: 17 * 60, endMinutes: 21 * 60, label: 'this evening' };
    if (/\b(noon|midday)\b/.test(q)) return { startMinutes: 12 * 60, endMinutes: 13 * 60, label: 'around noon' };
    return null;
  })();

  const range = q.match(/\b(?:between|from)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:and|to|-|until|till)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/)
    || q.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*(?:-|to|until|till)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/);

  if (range) {
    const start = parseTimeToken(range[1]);
    let end = parseTimeToken(range[2]);
    if (start != null && end != null) {
      if (end <= start && end < 12 * 60) end += 12 * 60;
      if (end > start) {
        return {
          startMinutes: start,
          endMinutes: end,
          label: `${formatTime(start)}–${formatTime(end)}`,
          explicit: true
        };
      }
    }
  }

  const after = q.match(/\b(?:after|past|from)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/);
  if (after) {
    const start = parseTimeToken(after[1]);
    if (start != null) {
      return {
        startMinutes: start,
        endMinutes: 23 * 60 + 59,
        label: `after ${formatTime(start)}`,
        explicit: true
      };
    }
  }

  const before = q.match(/\b(?:before|until|till|by)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/);
  if (before) {
    const end = parseTimeToken(before[1]);
    if (end != null) {
      return {
        startMinutes: 0,
        endMinutes: end,
        label: `before ${formatTime(end)}`,
        explicit: true
      };
    }
  }

  const at = q.match(/\b(?:at|around|about)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/)
    || q.match(/\b(\d{1,2}:\d{2}\s*(?:am|pm))\b/)
    || q.match(/\b(\d{1,2}\s*(?:am|pm))\b/);

  if (at) {
    const start = parseTimeToken(at[1]);
    if (start != null) {
      return {
        startMinutes: start,
        endMinutes: start + 1,
        label: `at ${formatTime(start)}`,
        explicit: true
      };
    }
  }

  return period;
}

function formatTime(minutes) {
  if (!Number.isFinite(minutes)) return '';
  const hour24 = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

function extractDepartment(text) {
  const q = normalize(text);
  for (const entry of DEPARTMENT_PATTERNS) {
    if (entry.pattern.test(q)) return entry.name;
  }
  return null;
}

/**
 * Strip question words, calendar words, department names, and time phrases to
 * leave a possible instructor name.
 */
function extractPersonName(text, options = {}) {
  const q = normalize(text);
  const department = extractDepartment(q);
  let working = q;

  if (department) {
    for (const entry of DEPARTMENT_PATTERNS) {
      if (entry.name === department) working = working.replace(entry.pattern, ' ');
    }
  }

  working = working
    .replace(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/g, ' ')
    .replace(/\b(today|tonight|tomorrow|morning|afternoon|evening|night|noon|midday|now|currently)\b/g, ' ')
    .replace(/\b(day after tomorrow)\b/g, ' ')
    .replace(/\b(this|next|last|coming|on)\b/g, ' ');

  const tokens = working.split(' ').filter(Boolean);
  const kept = [];

  for (const token of tokens) {
    if (TITLE_WORDS.has(token)) continue;
    if (QUESTION_WORDS.has(token)) continue;
    if (DAYS.includes(token)) continue;
    if (options.dropWords && options.dropWords.has(token)) continue;
    if (token.length < 2) continue;
    kept.push(token);
  }

  if (kept.length === 0 || kept.length > 4) return null;

  const joined = kept.join(' ');
  if (['everyone', 'everybody', 'people', 'person', 'prof', 'doctor'].includes(joined)) return null;
  return joined;
}

function parseAvailabilityQuery(text, now = new Date()) {
  const q = normalize(text);
  if (!FREE_PATTERN.test(q)) return null;

  // "where is X office" / "what is X email" are profile questions even when
  // they contain the word "open" or "available" in another clause.
  if (/\b(office|email|mail|department)\b/.test(q) && !/\b(free|available|availability|meet|see)\b/.test(q)) {
    return null;
  }

  const day = parseDay(q, now);
  const timeWindow = parseTimeWindow(q);
  const isNow = /\b(now|right now|currently|at the moment|this moment)\b/.test(q);
  const department = extractDepartment(q);
  const personName = extractPersonName(q);
  const wantsSchedule = /\bwhen\b/.test(q) || (!isNow && !timeWindow && !day);

  return {
    isAvailability: true,
    day,
    dayOffset: day?.offsetDays ?? null,
    weekday: day?.weekday ?? null,
    timeWindow,
    isNow,
    department,
    personName,
    wantsSchedule
  };
}

function detectIntent(text, now = new Date()) {
  const raw = String(text || '').trim();
  const q = normalize(raw);

  if (!q) {
    return { name: 'unknown', confidence: 0, entities: {} };
  }

  const parts = getTodayParts(now);
  const todayKey = calendar.toDateKey(parts);

  if (GREETING_PATTERN.test(q) || GREETING_PLUS_PATTERN.test(q)) {
    return { name: 'greeting', confidence: 0.99, entities: { parts, todayKey } };
  }

  if (THANKS_PATTERN.test(q) && !/\b(free|available|office|email|week|semester)\b/.test(q)) {
    return { name: 'thanks', confidence: 0.95, entities: { parts, todayKey } };
  }

  if (BYE_PATTERN.test(q)) {
    return { name: 'goodbye', confidence: 0.95, entities: { parts, todayKey } };
  }

  if (IDENTITY_PATTERN.test(q)) {
    return { name: 'identity', confidence: 0.95, entities: { parts, todayKey } };
  }

  if (CAPABILITIES_PATTERN.test(q)) {
    return { name: 'capabilities', confidence: 0.95, entities: { parts, todayKey } };
  }

  if (TIME_PATTERN.test(q)) {
    return {
      name: 'time',
      confidence: 0.95,
      entities: { parts, todayKey, day: parseDay(q, now), timeWindow: parseTimeWindow(q) }
    };
  }

  if (DATE_PATTERN.test(q)) {
    return { name: 'date', confidence: 0.95, entities: { parts, todayKey } };
  }

  const availability = parseAvailabilityQuery(q, now);
  if (availability) {
    return {
      name: 'availability',
      confidence: 0.9,
      entities: { parts, todayKey, availability }
    };
  }

  if (CALENDAR_PATTERN.test(q)) {
    return {
      name: 'calendar',
      confidence: 0.9,
      entities: { parts, todayKey, day: parseDay(q, now) }
    };
  }

  const rosterDepartment = extractDepartment(q);
  const rosterPersonName = extractPersonName(q);
  const isDepartmentOnlyRoster = Boolean(rosterDepartment)
    && !rosterPersonName
    && !FREE_PATTERN.test(q)
    && !CALENDAR_PATTERN.test(q)
    && (
      normalize(q) === normalize(rosterDepartment)
      || /\b(department|dept|instructors?|professors?|faculty|staff|browse|list|show|all|who|which)\b/.test(q)
    );

  if (ROSTER_PATTERN.test(q) || isDepartmentOnlyRoster || /^(list|show|browse) (all |the )?(instructors?|professors?|faculty|staff|doctors?|teachers?)$/.test(q)) {
    return {
      name: 'roster',
      confidence: 0.85,
      entities: { parts, todayKey, department: extractDepartment(q), personName: extractPersonName(q) }
    };
  }

  const department = extractDepartment(q);
  const personName = extractPersonName(q);
  const nameTokens = personName ? personName.split(' ') : [];
  const hasActionWord = nameTokens.some((token) => ACTION_WORDS.has(token));
  const rawTokens = raw.split(/\s+/).filter(Boolean);
  const hasTitle = /\b(dr|doctor|prof|professor|eng|instructor|lecturer|teacher|faculty)\.?\b/i.test(raw);
  const hasCapital = rawTokens.some((token) => /^[A-Z][a-z]/.test(token));
  const hasNameIntro = /\b(who is|who'?s|whos|tell me about|profile of|do you know|what about)\b/i.test(raw);
  const explicitField = FIELD_PATTERN.test(q);

  let looksLikeName = false;
  if (personName && !hasActionWord) {
    if (rawTokens.length === 1) {
      looksLikeName = true;
    } else if (nameTokens.length >= 2) {
      looksLikeName = true;
    } else if (hasTitle || hasCapital || hasNameIntro) {
      looksLikeName = true;
    }
  }

  if (personName && (explicitField || hasNameIntro || looksLikeName)) {
    return {
      name: 'faculty',
      confidence: explicitField ? 0.85 : 0.7,
      entities: { parts, todayKey, personName, department }
    };
  }

  return {
    name: 'unknown',
    confidence: 0.2,
    entities: { parts, todayKey, personName, department }
  };
}

function resolveFollowUpQuery(text, lastProfessor) {
  const professor = String(lastProfessor || '').trim();
  if (!professor) return null;

  const q = normalize(text);
  if (!PRONOUN_PATTERN.test(q) && !FOLLOWUP_START_PATTERN.test(q)) return null;

  if (/\b(email|e-mail|mail|contact)\b/.test(q)) return `${professor} email`;
  if (/\b(office|room|location|where)\b/.test(q)) return `where ${professor} office`;
  if (/\b(department|dept|major)\b/.test(q)) return `${professor} department`;
  if (/\b(hours?|schedule|free|available|when|time|meet)\b/.test(q)) return `when ${professor}`;

  return professor;
}

module.exports = {
  DAYS,
  DAY_INDEX,
  MONTHS,
  normalize,
  tokenize,
  parseDay,
  parseTimeWindow,
  formatTime,
  extractDepartment,
  extractPersonName,
  parseAvailabilityQuery,
  detectIntent,
  resolveFollowUpQuery
};
