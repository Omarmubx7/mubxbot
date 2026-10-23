'use strict';

/**
 * Office-hours availability.
 *
 * Answers "who is free now / today / tomorrow / on Monday / at 10 /
 * between 2 and 4" using published office hours. Results are restricted to
 * the verified faculty list by default; availability is never presented as
 * live presence.
 */

const calendar = require('./academicCalendar.js');
const intents = require('./assistant/intents.js');
const { normalizeScheduleSlot } = require('./scheduleTime.js');
const { getAllOfficeHours } = require('./getOfficeHours.js');

const TIME_ZONE = 'Asia/Amman';
const DAY_NAMES = {
  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday'
};

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatTimeLabel(minutes) {
  if (!Number.isFinite(minutes)) return '';
  const hour24 = Math.floor(minutes / 60) % 24;
  const minute = Math.round(minutes % 60);
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

function weekdayForDateKey(dateKey) {
  const { year, month, day } = calendar.parseDateKey(dateKey);
  return WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

function dayLabelFor(dateKey, todayKey) {
  const offset = calendar.diffDays(todayKey, dateKey);
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  return weekdayForDateKey(dateKey);
}

function shortDateLabel(dateKey, todayKey) {
  const offset = calendar.diffDays(todayKey, dateKey);
  if (offset === 0) return 'today';
  if (offset === 1) return 'tomorrow';
  return `${weekdayForDateKey(dateKey).slice(0, 3)} ${calendar.formatDateKey(dateKey, { withYear: false })}`;
}

function normalizeName(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(dr|doctor|eng|prof|professor|mr|mrs|ms)\.?\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function nameTokens(value = '') {
  return normalizeName(value).split(' ').filter((token) => token.length > 1);
}

function isVerifiedName(name, verifiedNames) {
  if (!Array.isArray(verifiedNames) || verifiedNames.length === 0) return true;
  const target = normalizeName(name);
  if (!target) return false;

  return verifiedNames.some((verified) => {
    const candidate = normalizeName(verified);
    if (!candidate) return false;
    if (candidate === target) return true;
    return nameTokens(target).every((token) => nameTokens(candidate).includes(token));
  });
}

function matchesPerson(name, personName) {
  if (!personName) return true;
  const targetTokens = nameTokens(personName);
  if (targetTokens.length === 0) return true;
  const candidateTokens = nameTokens(name);
  return targetTokens.every((token) => candidateTokens.includes(token));
}

function normalizeDepartmentToken(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function matchesDepartment(entry, departmentFilter = null) {
  if (!departmentFilter) return true;
  const dept = normalizeDepartmentToken(entry.department);
  const filter = normalizeDepartmentToken(departmentFilter);
  if (!filter) return true;

  if (filter.includes('computer science') || filter === 'cs') {
    return dept.includes('computer science');
  }
  if (filter.includes('information technology') || filter === 'it') {
    return dept.includes('information technology');
  }
  if (filter.includes('cyber')) {
    return dept.includes('cyber');
  }
  if (filter.includes('artificial') || filter.includes('data') || filter === 'ai') {
    return dept.includes('artificial') || dept.includes('data') || dept.includes('ai');
  }
  if (filter.includes('basic sciences')) {
    return dept.includes('basic');
  }
  if (filter.includes('leadership')) {
    return dept.includes('leadership');
  }
  if (filter.includes('games')) {
    return dept.includes('game');
  }

  return dept.includes(filter);
}

function toSlot(slot) {
  const normalized = normalizeScheduleSlot(slot.start, slot.end);
  if (!normalized.valid) return null;
  return {
    day: String(slot.day || '').toLowerCase().trim(),
    start: normalized.start,
    end: normalized.end,
    startMinutes: normalized.startMinutes,
    endMinutes: normalized.endMinutes,
    type: slot.type || 'In-Person'
  };
}

function entrySlots(entry) {
  if (!Array.isArray(entry.officeHours)) return [];
  const slots = [];
  for (const raw of entry.officeHours) {
    const slot = toSlot(raw);
    if (slot) slots.push(slot);
  }
  slots.sort((a, b) => (a.startMinutes - b.startMinutes) || (a.endMinutes - b.endMinutes));
  return slots;
}

function overlaps(slot, window) {
  return slot.startMinutes < window.endMinutes && slot.endMinutes > window.startMinutes;
}

function coversPoint(slot, minute) {
  return slot.startMinutes <= minute && slot.endMinutes > minute;
}

function buildTarget(intent, nowParts) {
  const todayKey = calendar.toDateKey(nowParts);
  const nowMinutes = nowParts.hour * 60 + nowParts.minute;
  const availability = intent || {};

  let dateKey = todayKey;
  let isExplicitDay = false;

  if (availability.day?.dateKey) {
    dateKey = availability.day.dateKey;
    isExplicitDay = true;
  } else if (Number.isInteger(availability.dayOffset)) {
    dateKey = calendar.addDays(todayKey, availability.dayOffset);
    isExplicitDay = availability.dayOffset !== 0;
  }

  const isNow = Boolean(availability.isNow) && !availability.timeWindow && !isExplicitDay;
  let startMinutes = availability.timeWindow?.startMinutes ?? null;
  let endMinutes = availability.timeWindow?.endMinutes ?? null;
  const hasWindow = startMinutes != null && endMinutes != null;

  if (isNow) {
    startMinutes = nowMinutes;
    endMinutes = nowMinutes + 1;
  } else if (!hasWindow) {
    startMinutes = 0;
    endMinutes = 24 * 60;
  } else if (endMinutes <= startMinutes) {
    endMinutes = startMinutes + 1;
  }

  const wholeDay = startMinutes === 0 && endMinutes === 24 * 60;
  const offset = calendar.diffDays(todayKey, dateKey);
  const weekday = weekdayForDateKey(dateKey);
  const isToday = offset === 0;
  const dayWord = isToday
    ? 'today'
    : offset === 1
      ? 'tomorrow'
      : `${weekday} ${calendar.formatDateKey(dateKey, { withYear: false })}`;
  const dayDetail = isToday || offset === 1 ? `${dayWord} (${weekday})` : dayWord;

  let timeLabel;
  if (isNow) {
    timeLabel = `now (${formatTimeLabel(nowMinutes)})`;
  } else if (wholeDay) {
    timeLabel = null;
  } else if (endMinutes === startMinutes + 1) {
    timeLabel = `at ${formatTimeLabel(startMinutes)}`;
  } else {
    timeLabel = `${formatTimeLabel(startMinutes)}–${formatTimeLabel(endMinutes)}`;
  }

  const windowAlreadyPassed = isToday && !wholeDay && !isNow && endMinutes <= nowMinutes;
  const windowInProgress = isToday && !wholeDay && !isNow && startMinutes <= nowMinutes && nowMinutes < endMinutes;

  return {
    dateKey,
    offsetDays: offset,
    weekday,
    dayLabel: DAY_NAMES[weekday.toLowerCase()] || weekday,
    isToday,
    isTomorrow: offset === 1,
    isNow,
    wholeDay,
    startMinutes,
    endMinutes,
    timeLabel,
    windowAlreadyPassed,
    windowInProgress,
    targetLabel: `${dayDetail}${wholeDay ? '' : ` ${timeLabel}`}`,
    nowMinutes
  };
}

function slotPayload(entry, slot) {
  return {
    name: entry.professor || entry.name || '',
    department: entry.department || '',
    email: entry.email || '',
    office: entry.office || '',
    day: DAY_NAMES[slot.day] || slot.day,
    start: slot.start,
    end: slot.end,
    startMinutes: slot.startMinutes,
    endMinutes: slot.endMinutes,
    type: slot.type || 'In-Person'
  };
}

function sortResults(a, b) {
  if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
  return a.name.localeCompare(b.name);
}

function findNextSlots(entries, nowParts, options = {}) {
  const todayKey = calendar.toDateKey(nowParts);
  const nowMinutes = nowParts.hour * 60 + nowParts.minute;
  const limitDays = options.limitDays ?? 4;
  const limitSlots = options.limitSlots ?? 4;
  const personName = options.personName || null;
  const days = [];

  for (let offset = 0; offset <= 14 && days.length < limitDays; offset += 1) {
    const dateKey = calendar.addDays(todayKey, offset);
    const weekday = weekdayForDateKey(dateKey).toLowerCase();
    const slots = [];

    for (const entry of entries) {
      if (personName && !matchesPerson(entry.professor || entry.name || '', personName)) continue;
      for (const slot of entrySlots(entry)) {
        if (slot.day !== weekday) continue;
        if (offset === 0 && slot.endMinutes <= nowMinutes) continue;
        slots.push(slotPayload(entry, slot));
      }
    }

    if (slots.length === 0) continue;

    slots.sort(sortResults);
    days.push({
      dateKey,
      dayLabel: dayLabelFor(dateKey, todayKey),
      dayName: weekdayForDateKey(dateKey),
      shortLabel: shortDateLabel(dateKey, todayKey),
      dateLabel: calendar.formatDateKey(dateKey),
      slots: slots.slice(0, limitSlots)
    });
  }

  return days;
}

function emptyResult({ message, now, nowParts, target, intent, verifiedNames, verifiedFilterApplied, extra = {} }) {
  const todayKey = calendar.toDateKey(nowParts);
  return {
    type: 'availability',
    query: message,
    intent,
    now: {
      iso: now.toISOString(),
      dateKey: todayKey,
      weekday: weekdayForDateKey(todayKey),
      clock: formatTimeLabel(nowParts.hour * 60 + nowParts.minute),
      dateLabel: calendar.formatLongDate(now),
      timeZone: TIME_ZONE
    },
    currentTimeLabel: `${formatTimeLabel(nowParts.hour * 60 + nowParts.minute)} · ${calendar.formatLongDate(now)}`,
    target,
    targetLabel: target?.targetLabel || '',
    verifiedFilterApplied,
    count: 0,
    total: 0,
    results: [],
    nextAvailable: [],
    disclaimer: verifiedFilterApplied
      ? 'Based on published office hours for verified faculty, not live presence.'
      : 'Based on published office hours, not live presence.',
    ...extra
  };
}

async function resolveVerifiedNames(options = {}) {
  if (Array.isArray(options.newDataNames)) return options.newDataNames;
  if (Array.isArray(options.verifiedNames)) return options.verifiedNames;

  try {
    const mod = await import('./newDataStore.js');
    if (typeof mod?.loadNewDataNames === 'function') {
      return await mod.loadNewDataNames();
    }
  } catch {
    // The caller may run in a context where the ESM store is unavailable.
  }

  return [];
}

/**
 * Find instructors whose published office hours overlap the requested time.
 * Pass `options.data` and `options.newDataNames` to run without I/O.
 */
async function findAvailableInstructors(message, options = {}) {
  const moment = options.now instanceof Date ? options.now : new Date();
  const nowParts = calendar.getZonedParts(moment);
  const parsed = options.intent
    ? (options.intent.isAvailability ? options.intent : options.intent.availability || options.intent)
    : intents.parseAvailabilityQuery(message, moment);

  if (!parsed || parsed.isAvailability === false) return null;

  const intent = { isAvailability: true, ...parsed };
  const target = buildTarget(intent, nowParts);
  const verifiedNames = await resolveVerifiedNames(options);
  const verifiedFilterApplied = Array.isArray(verifiedNames) && verifiedNames.length > 0;
  const allData = Array.isArray(options.data) ? options.data : await getAllOfficeHours();
  const personName = intent.personName || null;

  const eligible = allData.filter((entry) => {
    const name = entry.professor || entry.name || '';
    if (!name) return false;
    if (verifiedFilterApplied && !isVerifiedName(name, verifiedNames)) return false;
    if (!matchesDepartment(entry, intent.department)) return false;
    return true;
  });

  const personMatches = personName
    ? eligible.filter((entry) => matchesPerson(entry.professor || entry.name || '', personName))
    : [];

  // If a name was requested but nobody matches, do not silently show all
  // faculty instead. The caller can suggest alternatives.
  if (personName && personMatches.length === 0) {
    return emptyResult({
      message,
      now: moment,
      nowParts,
      target,
      intent,
      verifiedNames,
      verifiedFilterApplied,
      extra: {
        person: { name: personName, found: false },
        personMatches: [],
        nextAvailable: findNextSlots(eligible, nowParts, { personName, limitDays: 2, limitSlots: 3 })
      }
    });
  }

  const scanEntries = personName ? personMatches : eligible;
  const results = [];

  for (const entry of scanEntries) {
    const name = entry.professor || entry.name || '';
    const slots = entrySlots(entry).filter((slot) => slot.day === target.weekday.toLowerCase());
    if (slots.length === 0) continue;

    const matching = slots.filter((slot) => overlaps(slot, target));

    if (matching.length === 0) continue;

    let chosen = matching[0];
    if (target.isNow) {
      chosen = matching.find((slot) => coversPoint(slot, target.nowMinutes)) || null;
      if (!chosen) continue;
    } else if (target.windowInProgress) {
      chosen = matching.find((slot) => coversPoint(slot, target.nowMinutes)) || matching[0];
    }

    results.push({
      ...slotPayload(entry, chosen),
      status: target.isNow ? 'free-now' : target.windowInProgress ? 'free-at-this-time' : 'scheduled',
      statusLabel: target.isNow
        ? 'Free now'
        : target.windowInProgress
          ? 'Free at this time'
          : 'Available in this window',
      matches: matching.map((slot) => ({ start: slot.start, end: slot.end }))
    });
  }

  results.sort(sortResults);

  const limited = results.slice(0, 8);
  const base = emptyResult({
    message,
    now: moment,
    nowParts,
    target,
    intent,
    verifiedNames,
    verifiedFilterApplied
  });

  const nextAvailable = findNextSlots(scanEntries, nowParts, {
    personName,
    limitDays: personName ? 3 : 3,
    limitSlots: personName ? 5 : 3
  });

  let person = null;
  if (personName && personMatches.length === 1) {
    const entry = personMatches[0];
    const todaySlots = entrySlots(entry)
      .filter((slot) => slot.day === weekdayForDateKey(calendar.toDateKey(nowParts)).toLowerCase())
      .map((slot) => ({ start: slot.start, end: slot.end, type: slot.type }));
    const freeNowSlot = entrySlots(entry).find((slot) => (
      slot.day === weekdayForDateKey(calendar.toDateKey(nowParts)).toLowerCase()
      && coversPoint(slot, nowParts.hour * 60 + nowParts.minute)
    )) || null;

    person = {
      name: entry.professor || entry.name || '',
      department: entry.department || '',
      email: entry.email || '',
      office: entry.office || '',
      found: true,
      freeNow: Boolean(freeNowSlot),
      freeNowSlot: freeNowSlot ? { start: freeNowSlot.start, end: freeNowSlot.end } : null,
      todaySlots,
      nextSlots: nextAvailable.flatMap((day) => day.slots.map((slot) => ({
        ...slot,
        dayLabel: day.shortLabel,
        dayName: day.dayName,
        dateLabel: day.dateLabel
      }))).slice(0, 6)
    };
  } else if (personName) {
    person = {
      name: personName,
      found: personMatches.length > 0,
      ambiguous: personMatches.length > 1,
      matches: personMatches.slice(0, 6).map((entry) => ({
        name: entry.professor || entry.name || '',
        department: entry.department || ''
      }))
    };
  }

  const dayNote = buildDayNote(target);
  const windowNote = buildWindowNote(target);

  return {
    ...base,
    person,
    count: limited.length,
    total: results.length,
    results: limited,
    nextAvailable: limited.length > 0 ? [] : nextAvailable,
    allNextAvailable: nextAvailable,
    dayNote,
    windowNote
  };
}

function buildDayNote(target) {
  if (!target.isToday) return null;
  if (target.weekday.toLowerCase() === 'friday') {
    return 'There are no published Friday office hours in the directory.';
  }
  if (target.windowAlreadyPassed) {
    return `${target.timeLabel} today has already passed. Here are the next verified slots.`;
  }
  return null;
}

function buildWindowNote(target) {
  if (target.isNow) return 'Checked against the current Amman time.';
  if (target.wholeDay) return 'Showing published slots for the whole day.';
  return null;
}

function detectAvailabilityQuery(message) {
  return intents.parseAvailabilityQuery(message, new Date());
}

module.exports = {
  TIME_ZONE,
  detectAvailabilityQuery,
  findAvailableInstructors,
  findNextSlots,
  buildTarget,
  formatTimeLabel,
  nameTokens,
  isVerifiedName,
  matchesPerson
};
