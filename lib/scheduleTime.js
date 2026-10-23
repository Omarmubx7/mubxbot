'use strict';

/**
 * Shared office-hours time normalization.
 *
 * Source data mixes 12-hour and 24-hour values, with and without meridiem.
 * University office hours are daytime/evening, so a bare 1-7 hour is treated
 * as PM. Explicit AM/PM and 24-hour values always win.
 */

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatMinutes(minutes) {
  if (!Number.isFinite(minutes)) return '';
  const safe = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(safe / 60))}:${pad(safe % 60)}`;
}

function parseScheduleTime(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const match = raw.toLowerCase().match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const meridiem = (match[3] || '').toLowerCase();

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (minutes < 0 || minutes > 59) return null;

  if (meridiem === 'am' || meridiem === 'pm') {
    if (hours < 1 || hours > 12) return null;
    if (meridiem === 'am' && hours === 12) hours = 0;
    if (meridiem === 'pm' && hours < 12) hours += 12;
  } else {
    if (hours > 23) return null;
    if (hours >= 1 && hours <= 7) hours += 12;
  }

  if (hours < 0 || hours > 23) return null;

  return {
    raw,
    hours,
    minutes,
    totalMinutes: hours * 60 + minutes,
    normalized: `${pad(hours)}:${pad(minutes)}`,
    explicitMeridiem: Boolean(meridiem),
    inferredMeridiem: !meridiem && Number(match[1]) >= 1 && Number(match[1]) <= 7
  };
}

function normalizeScheduleSlot(startValue, endValue) {
  const rawStart = String(startValue ?? '').trim();
  let rawEnd = String(endValue ?? '').trim();

  // Some imported rows put the whole range in `start` and leave `end` blank,
  // e.g. "11:30 PM – 1:00 PM". Split that before parsing.
  if (!rawEnd) {
    const combined = rawStart.match(
      /^(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:–|—|-|to|until|till)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)$/i
    );
    if (combined) {
      rawEnd = combined[2].trim();
      startValue = combined[1].trim();
    }
  }

  const start = parseScheduleTime(startValue);
  const end = parseScheduleTime(rawEnd);

  if (!start || !end) {
    return {
      rawStart,
      rawEnd,
      start: rawStart,
      end: rawEnd,
      startMinutes: null,
      endMinutes: null,
      valid: false,
      inferredStartMeridiem: Boolean(start?.inferredMeridiem),
      inferredEndMeridiem: Boolean(end?.inferredMeridiem)
    };
  }

  let startMinutes = start.totalMinutes;
  let endMinutes = end.totalMinutes;

  // A range like 11:30 PM – 1:00 PM is a data-entry error for 11:30 AM – 1:00 PM.
  // Only correct it when both sides say PM and the start would otherwise be
  // later than the end.
  if (startMinutes > endMinutes
    && startMinutes >= 12 * 60
    && endMinutes >= 12 * 60
    && /\bpm\b/i.test(String(startValue))
    && /\bpm\b/i.test(String(rawEnd))) {
    startMinutes -= 12 * 60;
  }

  // A range like 11:30 - 1:00 should resolve to 11:30 - 13:00. The parser
  // already treats a bare 1 as PM. This fallback catches remaining same-day
  // ranges such as 12:30 - 1:00 where the end is still before the start.
  if (endMinutes <= startMinutes && endMinutes < 12 * 60) {
    endMinutes += 12 * 60;
  }

  const valid = endMinutes > startMinutes && endMinutes < 24 * 60;

  return {
    rawStart,
    rawEnd,
    start: valid ? formatMinutes(startMinutes) : start.normalized,
    end: valid ? formatMinutes(endMinutes) : end.normalized,
    startMinutes: valid ? startMinutes : null,
    endMinutes: valid ? endMinutes : null,
    valid,
    inferredStartMeridiem: Boolean(start.inferredMeridiem),
    inferredEndMeridiem: Boolean(end.inferredMeridiem)
  };
}

function toMinutes(value) {
  const parsed = parseScheduleTime(value);
  return parsed ? parsed.totalMinutes : Number.MAX_SAFE_INTEGER;
}

module.exports = {
  formatMinutes,
  parseScheduleTime,
  normalizeScheduleSlot,
  toMinutes
};
