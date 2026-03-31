const fs = require('fs/promises');
const path = require('path');
const Fuse = require('fuse.js');
const { Client } = require('pg');

const OFFICE_HOURS_PATH = path.join(process.cwd(), 'data', 'office_hours.json');
const OFFICE_HOURS_CACHE_TTL_MS = 30 * 1000;
const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';

let officeHoursCache = {
  data: null,
  loadedAt: 0,
  mtimeMs: 0
};

const DAY_ORDER = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};

const QUESTION_STOPWORDS = new Set([
  'when', 'what', 'where', 'who', 'how', 'is', 'are', 'am', 'can', 'could', 'would', 'will', 'do', 'does',
  'for', 'about', 'the', 'a', 'an', 'me', 'show', 'find', 'tell', 'available', 'availability', 'free',
  'office', 'hours', 'hour', 'schedule', 'on', 'at', 'in', 'during', 'please', 'dr', 'doctor', 'time',
  'eng', 'prof', 'professor', 'of', 'to', 'and', 'with', 'email', 'mail', 'contact', 'phone', 'get', 'give',
  'number', 'department', 'dept', 'morning', 'afternoon', 'evening', 'night', 'today', 'meet', 'meeting',
  'saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'
]);

const TOKEN_ALIASES = {
  ahmad: ['ahmed'],
  ahmed: ['ahmad'],
  balqees: ['balqis', 'balqes'],
  balqis: ['balqees', 'balqes'],
  razan: ['razen'],
  murad: ['morad'],
  weam: ['weaam']
};

function normalizeText(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(dr|doctor|eng|prof|professor)\.?\b/g, ' ')
    .replace(/[^a-z0-9@.\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSearchTokens(query) {
  const normalized = normalizeText(query);
  const rawTokens = normalized.split(' ').filter(Boolean);
  const filtered = rawTokens.filter(token => token.length > 1 && !QUESTION_STOPWORDS.has(token));

  const expanded = new Set(filtered);
  for (const token of filtered) {
    (TOKEN_ALIASES[token] || []).forEach(alias => expanded.add(alias));
  }

  return {
    normalized,
    rawTokens,
    strictTokens: filtered,
    tokens: Array.from(expanded)
  };
}

function toMinutes(timeString = '') {
  const raw = String(timeString).trim().toLowerCase();
  if (!raw) return Number.MAX_SAFE_INTEGER;

  const match = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return Number.MAX_SAFE_INTEGER;

  let hours = Number(match[1]);
  const minutes = Number(match[2] || '0');
  const meridiem = match[3];

  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

function normalizeTime(value = '') {
  return String(value)
    .replace(/\s+/g, '')
    .replace(/am/i, ' AM')
    .replace(/pm/i, ' PM')
    .trim();
}

function normalizeFacultyName(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function normalizeDepartmentValue(value = '') {
  const raw = String(value).trim();
  if (!raw) return '';

  const key = normalizeText(raw);
  const aliases = {
    cs: 'Computer Science',
    ai: 'Artificial Intelligence',
    cyber: 'Cybersecurity',
    cybersecurity: 'Cybersecurity',
    'information technology': 'Information Technology',
    it: 'Information Technology',
    petersons: 'Petersons'
  };

  return aliases[key] || raw;
}

function normalizeOfficeCode(value = '') {
  const raw = String(value).trim();
  if (!raw) return '';

  const compact = raw.replace(/\s+/g, '');
  const letterDigitMatch = compact.match(/^([A-Za-z])[-_ ]?(\d{2,4})$/);
  if (letterDigitMatch) {
    return `${letterDigitMatch[1].toUpperCase()}-${letterDigitMatch[2]}`;
  }

  return raw;
}

function buildSearchBlob(entry) {
  const hoursText = (entry.officeHours || [])
    .map(slot => `${slot.day} ${slot.start}-${slot.end}`)
    .join(' ');

  return normalizeText([
    entry.professor,
    entry.name,
    entry.email,
    entry.department,
    entry.office,
    hoursText
  ].filter(Boolean).join(' '));
}

function groupRowsByFaculty(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const faculty = normalizeFacultyName(row.faculty || '');
    if (!faculty) continue;

    const key = normalizeText(faculty);
    if (!grouped.has(key)) {
      grouped.set(key, {
        professor: faculty,
        name: faculty,
        email: String(row.email || '').trim().toLowerCase(),
        office: normalizeOfficeCode(row.office || ''),
        department: normalizeDepartmentValue(row.department || ''),
        school: '',
        officeHours: []
      });
    }

    const item = grouped.get(key);

    if (!item.email && row.email) item.email = String(row.email).trim().toLowerCase();
    if (!item.office && row.office) item.office = normalizeOfficeCode(row.office || '');
    if (!item.department && row.department) item.department = normalizeDepartmentValue(row.department || '');

    item.officeHours.push({
      day: String(row.day || '').trim(),
      start: normalizeTime(row.start || ''),
      end: normalizeTime(row.end || ''),
      type: String(row.type || 'In-Person').trim()
    });
  }

  const entries = Array.from(grouped.values());
  for (const entry of entries) {
    entry.officeHours.sort((a, b) => {
      const aDay = DAY_ORDER[normalizeText(a.day)] ?? 99;
      const bDay = DAY_ORDER[normalizeText(b.day)] ?? 99;
      if (aDay !== bDay) return aDay - bDay;
      return toMinutes(a.start) - toMinutes(b.start);
    });

    entry.schedule = Array.from(
      new Set(entry.officeHours.map(slot => normalizeText(slot.day)).filter(Boolean))
    );

    entry.rawText = entry.officeHours
      .map(slot => `${slot.day}: ${slot.start} - ${slot.end}`)
      .join('\n');
  }

  return entries;
}

async function getAllOfficeHours() {
  const now = Date.now();

  // When using the database, always fetch fresh data — no caching.
  if (DATABASE_URL) {
    const client = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    try {
      const { rows } = await client.query(
        `
          SELECT
            faculty,
            department,
            email,
            office,
            day,
            start,
            "end",
            type
          FROM office_hours_entries
          ORDER BY
            faculty,
            CASE LOWER(TRIM(day))
              WHEN 'sunday'    THEN 0
              WHEN 'monday'    THEN 1
              WHEN 'tuesday'   THEN 2
              WHEN 'wednesday' THEN 3
              WHEN 'thursday'  THEN 4
              WHEN 'friday'    THEN 5
              WHEN 'saturday'  THEN 6
              ELSE 7
            END,
            start
        `
      );

      const groupedFromDb = groupRowsByFaculty(rows);
      officeHoursCache = {
        data: groupedFromDb,
        loadedAt: now,
        mtimeMs: 0
      };

      return groupedFromDb;
    } finally {
      await client.end();
    }
  }

  let fileStat = null;
  try {
    fileStat = await fs.stat(OFFICE_HOURS_PATH);
  } catch {
    fileStat = null;
  }

  if (
    officeHoursCache.data &&
    fileStat &&
    officeHoursCache.mtimeMs === fileStat.mtimeMs
  ) {
    officeHoursCache.loadedAt = now;
    return officeHoursCache.data;
  }

  const raw = await fs.readFile(OFFICE_HOURS_PATH, 'utf8');
  const rows = JSON.parse(raw || '[]');
  const grouped = groupRowsByFaculty(Array.isArray(rows) ? rows : []);

  officeHoursCache = {
    data: grouped,
    loadedAt: now,
    mtimeMs: fileStat?.mtimeMs || 0
  };

  return grouped;
}

function extractQueryContext(query) {
  const q = normalizeText(query);
  const explicitQuestionIntent = /\bwhen\b/.test(q)
    ? 'hours'
    : /\bwhere\b/.test(q)
      ? 'office'
      : /\bwhat\b/.test(q)
        ? 'email'
        : null;
  const wantsEmail = explicitQuestionIntent === 'email' || (!explicitQuestionIntent && /\b(email|e-mail|mail|contact)\b/.test(q));
  const wantsDepartment = !explicitQuestionIntent && /\b(department|dept|section|program|major)\b/.test(q);
  const mentionsOffice = /\b(office|location|room)\b/.test(q);
  const asksWhere = explicitQuestionIntent === 'office';
  const wantsHours = explicitQuestionIntent === 'hours' || (!explicitQuestionIntent && /\b(when|free|available|availability|office hours|hours|schedule|meet|meeting)\b/.test(q));
  const wantsOffice = explicitQuestionIntent === 'office' || (!explicitQuestionIntent && (mentionsOffice || (asksWhere && !wantsEmail && !wantsDepartment)));
  const context = {
    specificDay: null,
    explicitQuestionIntent,
    wantsEmail,
    wantsOffice,
    wantsHours,
    wantsDepartment,
    answerType: wantsEmail ? 'email' : wantsOffice ? 'office' : wantsHours ? 'hours' : wantsDepartment ? 'department' : 'profile',
    isQuestion: /\?|\b(when|what|where|how)\b/.test(q),
    keywords: []
  };

  const days = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  for (const day of days) {
    if (q.includes(day)) {
      context.specificDay = day;
      break;
    }
  }

  if (context.wantsEmail) context.keywords.push('email');
  if (context.wantsOffice) context.keywords.push('office');
  if (context.wantsHours) context.keywords.push('hours');
  if (context.wantsDepartment) context.keywords.push('department');

  return context;
}

function extractQuerySubject(query) {
  const { strictTokens } = extractSearchTokens(query);
  return strictTokens.join(' ').trim();
}

function capitalizeWord(value = '') {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildContextualQuery(selectedProfessor, context = {}) {
  const normalizedName = String(selectedProfessor || '').trim();
  if (!normalizedName) return '';

  switch (context?.answerType) {
    case 'email':
      return `what ${normalizedName}`;
    case 'office':
      return `where ${normalizedName}`;
    case 'department':
      return `${normalizedName} department`;
    case 'hours':
      return context?.specificDay
        ? `when ${normalizedName} on ${capitalizeWord(context.specificDay)}`
        : `when ${normalizedName}`;
    default:
      return normalizedName;
  }
}

function rankProfessorMatch(entry, normalizedQuery, strictTokens = []) {
  const blob = buildSearchBlob(entry);
  const professorName = normalizeText(entry.professor || '');
  const displayName = normalizeText(entry.name || '');

  let score = 0;

  if (normalizedQuery && (professorName === normalizedQuery || displayName === normalizedQuery)) {
    score += 300;
  }

  if (normalizedQuery && (professorName.startsWith(normalizedQuery) || displayName.startsWith(normalizedQuery))) {
    score += 120;
  }

  if (normalizedQuery && blob.includes(normalizedQuery)) {
    score += 60;
  }

  for (const token of strictTokens) {
    if (blob.includes(token)) {
      score += 20;
      if (professorName.includes(token) || displayName.includes(token)) {
        score += 10;
      }
    }
  }

  return score;
}

function formatOfficeHours(professor, specificDay = null) {
  const slots = professor.officeHours || [];
  if (slots.length === 0) return 'No office hours available.';

  const filtered = specificDay
    ? slots.filter(slot => normalizeText(slot.day) === normalizeText(specificDay))
    : slots;

  if (filtered.length === 0) {
    const dayLabel = specificDay.charAt(0).toUpperCase() + specificDay.slice(1);
    return `No office hours listed for ${dayLabel}.`;
  }

  return filtered
    .map(slot => `${slot.day}: ${slot.start} - ${slot.end}`)
    .join('\n');
}

function isSimpleNameSearch(query) {
  const q = normalizeText(query);
  const isShort = q.split(' ').length <= 4;
  const hasNoQuestionWords = !/\b(when|what|where|how|is|are|can|do|does|email|office|free|available|schedule|hours)\b/.test(q);
  return isShort && hasNoQuestionWords;
}

function generateSmartResponse(professor, query) {
  const context = extractQueryContext(query);
  const isNameOnly = isSimpleNameSearch(query);

  // Rule: "what" questions and contact/email queries => email only
  if (context.answerType === 'email') {
    return professor.email || 'No email available.';
  }

  // Rule: "where" questions and office/location queries => office code only
  if (context.answerType === 'office') {
    return professor.office || 'No office code available.';
  }

  // Rule: "when" questions and schedule queries => office hours only
  if (context.answerType === 'hours') {
    return formatOfficeHours(professor, context.specificDay);
  }

  // Rule: department questions => department only
  if (context.answerType === 'department') {
    return professor.department || 'No department available.';
  }

  // Rule: typing only the name => everything
  if (isNameOnly) {
    const lines = [
      `Name: ${professor.name}`,
      `Department: ${professor.department || 'N/A'}`,
      `Email: ${professor.email || 'N/A'}`,
      `Office: ${professor.office || 'N/A'}`,
      'Office Hours:',
      formatOfficeHours(professor)
    ];

    return lines.join('\n');
  }

  // Fallback for mixed queries
  return [
    `Name: ${professor.name}`,
    `Department: ${professor.department || 'N/A'}`,
    `Email: ${professor.email || 'N/A'}`,
    `Office: ${professor.office || 'N/A'}`,
    'Office Hours:',
    formatOfficeHours(professor, context.specificDay)
  ].join('\n');
}

async function searchOfficeHours(query) {
  const allData = await getAllOfficeHours();
  const { normalized, strictTokens, tokens } = extractSearchTokens(query);

  if (!normalized) return [];

  // If user typed an exact faculty name, return only that record to avoid noisy disambiguation.
  const exactNameMatches = allData.filter(entry => {
    const professorName = normalizeText(entry.professor || '');
    const displayName = normalizeText(entry.name || '');
    return normalized === professorName || normalized === displayName;
  });

  if (exactNameMatches.length > 0) {
    return exactNameMatches;
  }

  const exactMatches = allData.filter(entry => {
    const blob = buildSearchBlob(entry);

    if (blob.includes(normalized)) return true;

    if (strictTokens.length > 0) {
      return strictTokens.every(token => blob.includes(token));
    }

    return false;
  });

  const fuse = new Fuse(allData, {
    includeScore: true,
    threshold: 0.36,
    ignoreLocation: true,
    minMatchCharLength: 2,
    keys: [
      { name: 'professor', weight: 0.45 },
      { name: 'name', weight: 0.3 },
      { name: 'email', weight: 0.15 },
      { name: 'department', weight: 0.1 }
    ]
  });

  const fuseTerm = tokens.length > 0 ? tokens.join(' ') : normalized;
  const fuzzyMatches = fuse
    .search(fuseTerm, { limit: 12 })
    .filter(result => {
      if (strictTokens.length === 0) return true;

      const personBlob = normalizeText([
        result.item.professor,
        result.item.name,
        result.item.email
      ].filter(Boolean).join(' '));

      const matchedCount = strictTokens.reduce((count, token) => {
        if (token.length < 3) {
          return count + (personBlob.includes(token) ? 1 : 0);
        }
        return count + (personBlob.includes(token.slice(0, 3)) ? 1 : 0);
      }, 0);

      // For multi-word name queries, require stronger token overlap to avoid false positives.
      const requiredMatches = strictTokens.length >= 3 ? 2 : 1;
      return matchedCount >= requiredMatches;
    })
    .map(result => result.item);

  const unique = new Map();
  [...exactMatches, ...fuzzyMatches].forEach(item => {
    if (!unique.has(item.professor)) {
      unique.set(item.professor, item);
    }
  });

  return Array.from(unique.values())
    .sort((a, b) => {
      const rankA = rankProfessorMatch(a, normalized, strictTokens);
      const rankB = rankProfessorMatch(b, normalized, strictTokens);
      return rankB - rankA;
    });
}

async function suggestClosestProfessors(query, limit = 5) {
  const allData = await getAllOfficeHours();
  const { normalized, strictTokens, tokens } = extractSearchTokens(query);

  const term = tokens.length > 0 ? tokens.join(' ') : normalized;
  if (!term) return [];

  const fuzzy = new Fuse(allData, {
    includeScore: true,
    threshold: 0.62,
    ignoreLocation: true,
    minMatchCharLength: 2,
    keys: [
      { name: 'professor', weight: 0.6 },
      { name: 'name', weight: 0.3 },
      { name: 'email', weight: 0.1 }
    ]
  });

  return fuzzy
    .search(term, { limit: Math.max(limit * 2, 8) })
    .filter(entry => {
      if (typeof entry.score === 'number' && entry.score > 0.45) return false;

      if (strictTokens.length === 0) return true;

      const personBlob = normalizeText([
        entry.item.professor,
        entry.item.name,
        entry.item.email
      ].filter(Boolean).join(' '));

      return strictTokens.some(token => {
        if (token.length < 3) return personBlob.includes(token);
        return personBlob.includes(token.slice(0, 3));
      });
    })
    .slice(0, limit)
    .map(entry => entry.item);
}

function generateDisambiguationMessage(query, results) {
  const cleanName = query.trim();

  return {
    message: `I found ${results.length} professors matching "${cleanName}". Which one do you mean?`,
    options: results.map(prof => ({
      professor: prof.professor,
      name: prof.name,
      department: prof.department,
      email: prof.email,
      office: prof.office
    }))
  };
}

module.exports = {
  getAllOfficeHours,
  searchOfficeHours,
  suggestClosestProfessors,
  extractQueryContext,
  extractQuerySubject,
  buildContextualQuery,
  generateSmartResponse,
  isSimpleNameSearch,
  generateDisambiguationMessage
};
