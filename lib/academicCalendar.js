'use strict';

/**
 * Academic calendar + banner engine.
 *
 * All date math is done against Asia/Amman wall-clock dates so a student
 * opening the bot from another timezone still sees the correct "today".
 * Events are inclusive: a one-day event is active from 00:00 until 23:59:59
 * on its date; a range is active through the end date.
 */

const TIME_ZONE = 'Asia/Amman';

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const WEEKDAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

const SEMESTERS = [
  {
    id: 'fall-2026',
    label: 'Fall 2026/2027',
    shortLabel: 'Fall 26/27',
    startDate: '2026-10-04',
    // Week 1 begins on the first Sunday of the semester. Teaching runs
    // Sunday through Thursday; Friday and Saturday are the weekend.
    classesStartDate: '2026-10-04',
    endDate: '2027-01-21',
    totalWeeks: 16
  },
  {
    id: 'spring-2027',
    label: 'Spring 2026/2027',
    shortLabel: 'Spring 26/27',
    startDate: '2027-03-28',
    classesStartDate: '2027-03-28',
    endDate: null,
    totalWeeks: null
  }
];

/**
 * One-off events. Keep titles short: they have to fit the compact banner.
 * `kind` drives the countdown style, `tone` drives the accent colour and
 * `priority` decides which event wins when several overlap.
 */
const EVENTS = [
  {
    id: 'staff-return-fall-2026',
    title: 'Academic staff return',
    description: 'Attendance of existing academic staff returning from vacation, and new academic staff.',
    startDate: '2026-09-20',
    kind: 'milestone',
    tone: 'ink',
    priority: 30
  },
  {
    id: 'special-cases-registration-2026',
    title: 'Special cases registration day',
    description: 'Registration day for special-case students.',
    startDate: '2026-09-24',
    kind: 'registration',
    tone: 'blue',
    priority: 50
  },
  {
    id: 'summer-graduates-approval-2026',
    title: 'Summer graduates approved',
    description: "Deans' Council approval of Summer 2025/2026 graduation names.",
    startDate: '2026-10-01',
    kind: 'milestone',
    tone: 'ink',
    priority: 30
  },
  {
    id: 'new-student-orientation-2026',
    title: 'New student orientation',
    description: 'Orientation day for new students.',
    startDate: '2026-10-11',
    kind: 'milestone',
    tone: 'green',
    priority: 45
  },
  {
    id: 'classes-start-fall-2026',
    title: 'Classes start',
    description: 'First day of classes for the Fall 2026/2027 semester.',
    startDate: '2026-10-04',
    kind: 'milestone',
    tone: 'green',
    priority: 72,
    countdown: { value: '01', unit: 'day of term' }
  },
  {
    id: 'add-drop-fall-2026',
    title: 'Add / Drop period',
    description: 'Add or drop courses without a financial penalty. Closes at the end of the first week.',
    startDate: '2026-10-04',
    endDate: '2026-10-08',
    kind: 'period',
    tone: 'green',
    priority: 60
  },
  {
    id: 'coursera-approval-deadline-2026',
    title: 'Coursera approval deadline',
    description: 'Last day for students to seek approval to study Coursera or other online-platform courses.',
    startDate: '2026-10-22',
    kind: 'deadline',
    tone: 'red',
    priority: 80
  },
  {
    id: 'credit-equivalence-deadline-2026',
    title: 'Credit-hour equivalence deadline',
    description: 'Last day for credit-hour equivalence decisions for transferred students.',
    startDate: '2026-11-22',
    kind: 'deadline',
    tone: 'red',
    priority: 80
  },
  {
    id: 'formative-assessment-fall-2026',
    title: 'Formative assessment period',
    description: 'Formative assessment period for Fall 2026/2027.',
    startDate: '2026-11-22',
    endDate: '2026-12-03',
    kind: 'period',
    tone: 'amber',
    priority: 74
  },
  {
    id: 'postpone-semester-deadline-2026',
    title: 'Last day to postpone the semester',
    description: 'Last day to postpone the Fall 2026/2027 semester.',
    startDate: '2026-12-03',
    kind: 'deadline',
    tone: 'red',
    priority: 80
  },
  {
    id: 'coursera-evidence-deadline-2026',
    title: 'Coursera evidence due',
    description: 'Last day for students to submit Coursera or online-platform course completion evidence.',
    startDate: '2026-12-17',
    kind: 'deadline',
    tone: 'red',
    priority: 80
  },
  {
    id: 'spring-schedule-deadline-2027',
    title: 'Spring schedule due',
    description: 'Last day to deliver the Spring 2026/2027 semester schedule.',
    startDate: '2027-01-07',
    kind: 'deadline',
    tone: 'ink',
    priority: 55
  },
  {
    id: 'quiet-week-spring-2027',
    title: 'Quiet week',
    description: 'No student events, minimum homework, no in-class tests or quizzes. Attendance and classes continue as normal.',
    startDate: '2027-01-10',
    endDate: '2027-01-14',
    kind: 'quiet',
    tone: 'amber',
    priority: 100
  },
  {
    id: 'discontinue-deadline-2027',
    title: 'Final course discontinue date',
    description: 'Last day to discontinue a course with a financial penalty.',
    startDate: '2027-01-21',
    kind: 'deadline',
    tone: 'ink',
    priority: 62
  },
  {
    id: 'classes-end-fall-2026',
    title: 'End of classes',
    description: 'Last day of classes for the Fall 2026/2027 semester.',
    startDate: '2027-01-21',
    kind: 'milestone',
    tone: 'green',
    priority: 82,
    countdown: { value: 'END', unit: 'of classes' }
  },
  {
    id: 'spring-registration-2027',
    title: 'Spring registration',
    description: 'Registration for the Spring 2026/2027 semester.',
    startDate: '2027-01-24',
    endDate: '2027-02-04',
    kind: 'registration',
    tone: 'blue',
    priority: 52
  },
  {
    id: 'summative-assessment-2027',
    title: 'Summative assessment period',
    description: 'Summative assessment period for Fall 2026/2027.',
    startDate: '2027-01-24',
    endDate: '2027-01-28',
    kind: 'period',
    tone: 'red',
    priority: 78
  },
  {
    id: 'summative-feedback-2027',
    title: 'Summative feedback',
    description: 'Summative feedback window for Fall 2026/2027.',
    startDate: '2027-01-31',
    endDate: '2027-02-04',
    kind: 'period',
    tone: 'amber',
    priority: 65
  },
  {
    id: 'final-grades-deadline-2027',
    title: 'Final grades due',
    description: 'Final date to submit final grades.',
    startDate: '2027-02-08',
    kind: 'deadline',
    tone: 'red',
    priority: 80
  },
  {
    id: 'grade-appeal-requests-2027',
    title: 'Reassessment & grade appeals',
    description: 'Reassessment and grade appeal request window.',
    startDate: '2027-02-09',
    endDate: '2027-02-11',
    kind: 'period',
    tone: 'amber',
    priority: 66
  },
  {
    id: 'fall-reassessment-2027',
    title: 'Fall reassessment period',
    description: 'Fall reassessment period.',
    startDate: '2027-02-14',
    endDate: '2027-02-18',
    kind: 'period',
    tone: 'red',
    priority: 76
  },
  {
    id: 'reassessment-grades-deadline-2027',
    title: 'Reassessment grades due',
    description: 'Final date to submit reassessment final grades.',
    startDate: '2027-02-23',
    kind: 'deadline',
    tone: 'red',
    priority: 80
  },
  {
    id: 'staff-vacation-2027',
    title: 'Academic staff vacation',
    description: 'Academic staff vacation period.',
    startDate: '2027-03-07',
    endDate: '2027-03-18',
    kind: 'vacation',
    tone: 'ink',
    priority: 20
  },
  {
    id: 'fall-graduates-approval-2027',
    title: 'Fall graduates approved',
    description: "Deans' Council approval of Fall graduates' names.",
    startDate: '2027-03-18',
    kind: 'milestone',
    tone: 'ink',
    priority: 30
  },
  {
    id: 'staff-return-spring-2027',
    title: 'Academic staff return',
    description: 'Attendance of existing academic staff for the Spring semester.',
    startDate: '2027-03-21',
    kind: 'milestone',
    tone: 'ink',
    priority: 30
  },
  {
    id: 'classes-start-spring-2027',
    title: 'Spring classes start',
    description: 'First day of classes for the Spring 2026/2027 semester.',
    startDate: '2027-03-28',
    kind: 'milestone',
    tone: 'green',
    priority: 72,
    countdown: { value: '01', unit: 'day of term' }
  }
];

/**
 * Fixed-date observances that repeat every year. This is how a holiday such
 * as Christmas automatically appears at 00:00 and disappears at midnight
 * without anyone editing the file.
 *
 * To add another fixed holiday, append an entry here, for example:
 * { id: 'us-independence', title: 'US Independence Day', month: 7, day: 4,
 *   kind: 'holiday', tone: 'red', priority: 95, description: 'Official holiday.' }
 */
const RECURRING_EVENTS = [
  {
    id: 'christmas',
    title: 'Christmas',
    description: 'Glorious Christmas — official holiday.',
    month: 12,
    day: 25,
    kind: 'holiday',
    tone: 'red',
    priority: 95
  },
  {
    id: 'new-year',
    title: 'New Year',
    description: 'New Year — official holiday.',
    month: 1,
    day: 1,
    kind: 'holiday',
    tone: 'red',
    priority: 95
  },
  {
    id: 'labour-day',
    title: 'Labour Day',
    description: 'Labour Day — official holiday.',
    month: 5,
    day: 1,
    kind: 'holiday',
    tone: 'red',
    priority: 95
  },
  {
    id: 'jordan-independence-day',
    title: 'Jordan Independence Day',
    description: 'Jordan Independence Day — official holiday.',
    month: 5,
    day: 25,
    kind: 'holiday',
    tone: 'red',
    priority: 95
  }
];

const zonedFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23'
});

function pad(value) {
  return String(value).padStart(2, '0');
}

function getZonedParts(date = new Date()) {
  const safeDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  const parts = zonedFormatter.formatToParts(safeDate);
  const map = {};

  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second)
  };
}

function toDateKey(parts) {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

function parseDateKey(key) {
  const [year, month, day] = String(key).split('-').map(Number);
  return { year, month, day };
}

function weekdayIndexForDateKey(key) {
  const { year, month, day } = parseDateKey(key);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function weekdayNameForDateKey(key) {
  return WEEKDAYS[weekdayIndexForDateKey(key)] || '';
}

function keyToUtc(key) {
  const { year, month, day } = parseDateKey(key);
  return Date.UTC(year, month - 1, day);
}

function diffDays(fromKey, toKeyValue) {
  return Math.round((keyToUtc(toKeyValue) - keyToUtc(fromKey)) / 86400000);
}

function addDays(key, amount) {
  const date = new Date(keyToUtc(key) + amount * 86400000);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function isBetween(key, startKey, endKey) {
  return key >= startKey && key <= endKey;
}

function formatDateKey(key, { withYear = true } = {}) {
  if (!key) return '';
  const { year, month, day } = parseDateKey(key);
  return `${day} ${MONTHS_SHORT[month - 1]}${withYear ? ` ${year}` : ''}`;
}

function formatRange(event) {
  if (!event?.startDate) return '';
  if (!event.endDate || event.endDate === event.startDate) {
    return formatDateKey(event.startDate);
  }

  const start = parseDateKey(event.startDate);
  const end = parseDateKey(event.endDate);

  if (start.year === end.year && start.month === end.month) {
    return `${start.day}–${end.day} ${MONTHS_SHORT[end.month - 1]} ${end.year}`;
  }

  if (start.year === end.year) {
    return `${start.day} ${MONTHS_SHORT[start.month - 1]} – ${end.day} ${MONTHS_SHORT[end.month - 1]} ${end.year}`;
  }

  return `${formatDateKey(event.startDate)} – ${formatDateKey(event.endDate)}`;
}

function eventEndKey(event) {
  return event.endDate || event.startDate;
}

function materializeRecurringEvent(event, year) {
  const startDate = `${year}-${pad(event.month)}-${pad(event.day)}`;
  const duration = Math.max(1, Number(event.durationDays) || 1);
  return {
    ...event,
    startDate,
    endDate: duration > 1 ? addDays(startDate, duration - 1) : startDate,
    recurrenceYear: year
  };
}

function getActiveEvents(todayKey = toDateKey(getZonedParts())) {
  const active = [];

  for (const event of EVENTS) {
    if (!event.startDate) continue;
    if (isBetween(todayKey, event.startDate, eventEndKey(event))) {
      active.push({
        ...event,
        endDate: eventEndKey(event)
      });
    }
  }

  const { year } = parseDateKey(todayKey);
  for (const event of RECURRING_EVENTS) {
    for (let candidateYear = year - 1; candidateYear <= year + 1; candidateYear += 1) {
      const recurring = materializeRecurringEvent(event, candidateYear);
      if (isBetween(todayKey, recurring.startDate, eventEndKey(recurring))) {
        active.push({
          ...recurring,
          id: `${event.id}-${candidateYear}`
        });
      }
    }
  }

  return active.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    if (a.startDate !== b.startDate) return a.startDate < b.startDate ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}

function getSemesterForDate(todayKey) {
  const containing = SEMESTERS.find((semester) => {
    if (!semester.startDate) return false;
    const end = semester.endDate || semester.startDate;
    return isBetween(todayKey, semester.startDate, end);
  });

  if (containing) return containing;

  // Between semesters, keep showing the most recently finished term for a
  // short while (useful while grades and reassessments are still running).
  const finished = SEMESTERS
    .filter((semester) => semester.endDate && todayKey > semester.endDate)
    .sort((a, b) => (a.endDate < b.endDate ? 1 : -1));

  if (finished.length > 0) {
    const latest = finished[0];
    if (diffDays(latest.endDate, todayKey) <= 45) return latest;
  }

  const upcoming = SEMESTERS
    .filter((semester) => semester.startDate && todayKey < semester.startDate)
    .sort((a, b) => (a.startDate > b.startDate ? 1 : -1));

  return upcoming[0] || null;
}

function getSemesterProgress(semester, todayKey = toDateKey(getZonedParts())) {
  if (!semester?.startDate || !semester?.endDate) return null;

  const totalDays = Math.max(1, diffDays(semester.startDate, semester.endDate));
  const rawElapsed = diffDays(semester.startDate, todayKey);
  const elapsedDays = Math.min(totalDays, Math.max(0, rawElapsed));
  const daysLeft = Math.max(0, diffDays(todayKey, semester.endDate));
  const percent = Math.max(0, Math.min(100, Math.round((elapsedDays / totalDays) * 100)));
  const totalWeeks = semester.totalWeeks || Math.ceil(totalDays / 7);
  const week = Math.max(1, Math.min(totalWeeks, Math.floor(elapsedDays / 7) + 1));

  return {
    startDate: semester.startDate,
    endDate: semester.endDate,
    totalDays,
    elapsedDays,
    daysLeft,
    percent,
    week,
    totalWeeks,
    weeksLeft: Math.max(0, Math.ceil(daysLeft / 7)),
    started: rawElapsed >= 0,
    finished: rawElapsed >= totalDays
  };
}

function getTeachingWeek(semester, todayKey = toDateKey(getZonedParts())) {
  if (!semester?.startDate) return null;

  const start = semester.classesStartDate || semester.startDate;
  const end = semester.endDate || start;
  const totalWeeks = semester.totalWeeks || Math.max(1, Math.ceil(diffDays(start, end) / 7));
  const elapsed = diffDays(start, todayKey);

  if (elapsed < 0) {
    return {
      week: 0,
      totalWeeks,
      started: false,
      finished: false,
      phase: 'before',
      startsInDays: Math.abs(elapsed),
      label: `Classes start in ${Math.abs(elapsed)} ${Math.abs(elapsed) === 1 ? 'day' : 'days'}`
    };
  }

  const week = Math.min(totalWeeks, Math.floor(elapsed / 7) + 1);
  const weekStart = addDays(start, (week - 1) * 7);
  const weekEnd = addDays(weekStart, 4);
  const nextWeekStart = addDays(weekStart, 7);
  const finished = Boolean(semester.endDate && todayKey > semester.endDate);
  const weekday = weekdayIndexForDateKey(todayKey);
  const weekend = !finished && (weekday === 5 || weekday === 6);
  const hasNextWeek = !finished && week < totalWeeks;
  const phase = finished ? 'finished' : weekend ? 'weekend' : 'in-session';

  let phaseLabel = '';
  if (phase === 'weekend' && hasNextWeek) {
    phaseLabel = `Classes ended ${weekdayNameForDateKey(weekEnd)} ${formatDateKey(weekEnd, { withYear: false })}`;
  } else if (phase === 'finished') {
    phaseLabel = 'Semester complete';
  }

  return {
    week,
    totalWeeks,
    startDate: start,
    weekStart,
    weekEnd,
    nextWeekStart,
    phase,
    inSession: phase === 'in-session',
    weekend: phase === 'weekend',
    hasNextWeek,
    phaseLabel,
    nextWeekLabel: hasNextWeek
      ? `Week ${week + 1} starts ${weekdayNameForDateKey(nextWeekStart)} ${formatDateKey(nextWeekStart, { withYear: false })}`
      : '',
    started: true,
    finished,
    startsInDays: 0,
    label: `Week ${week} of ${totalWeeks}`
  };
}

function getNextSemester(todayKey = toDateKey(getZonedParts()), currentSemester = null) {
  const lowerBound = currentSemester?.startDate && currentSemester.startDate > todayKey
    ? currentSemester.startDate
    : todayKey;

  const candidates = SEMESTERS
    .filter((semester) => semester.startDate && semester.startDate > lowerBound)
    .sort((a, b) => (a.startDate < b.startDate ? -1 : 1));

  return candidates[0] || null;
}

function getUpcomingEvents(todayKey = toDateKey(getZonedParts()), limit = 5) {
  const upcoming = [];

  for (const event of EVENTS) {
    if (!event.startDate || event.startDate < todayKey) continue;
    upcoming.push({ ...event, endDate: eventEndKey(event) });
  }

  const { year } = parseDateKey(todayKey);
  for (const event of RECURRING_EVENTS) {
    for (let candidateYear = year; candidateYear <= year + 2; candidateYear += 1) {
      const recurring = materializeRecurringEvent(event, candidateYear);
      if (recurring.startDate < todayKey) continue;
      upcoming.push({ ...recurring, id: `${event.id}-${candidateYear}` });
    }
  }

  return upcoming
    .sort((a, b) => {
      if (a.startDate !== b.startDate) return a.startDate < b.startDate ? -1 : 1;
      return (b.priority || 0) - (a.priority || 0);
    })
    .slice(0, Math.max(0, limit));
}

function buildNextEvent(event, todayKey, zonedParts) {
  if (!event) return null;

  return {
    ...serializeEvent(event),
    daysUntil: Math.max(0, diffDays(todayKey, event.startDate)),
    countdown: buildCountdown(event, todayKey, zonedParts)
  };
}

function buildEventProgress(event, todayKey) {
  const totalDays = Math.max(1, diffDays(event.startDate, eventEndKey(event)) + 1);
  if (totalDays <= 1) return null;
  const elapsed = Math.min(totalDays, Math.max(0, diffDays(event.startDate, todayKey) + 1));
  return elapsed / totalDays;
}

function buildCountdown(event, todayKey, zonedParts) {
  if (event.countdown?.value) return event.countdown;

  const daysLeft = Math.max(0, diffDays(todayKey, eventEndKey(event)));
  const totalDays = diffDays(event.startDate, eventEndKey(event)) + 1;

  if (event.kind === 'holiday') {
    return { value: 'ALL', unit: 'day' };
  }

  if (event.kind === 'quiet') {
    return {
      value: String(daysLeft),
      unit: daysLeft === 0 ? 'last day' : daysLeft === 1 ? 'day left' : 'days left'
    };
  }

  if (totalDays === 1 && event.kind === 'deadline') {
    const minutesLeft = Math.max(0, (23 * 60 + 59) - (zonedParts.hour * 60 + zonedParts.minute));
    const hours = String(Math.floor(minutesLeft / 60)).padStart(2, '0');
    const minutes = String(minutesLeft % 60).padStart(2, '0');
    return {
      value: `${hours}:${minutes}`,
      unit: 'left today'
    };
  }

  if (totalDays === 1) {
    return { value: 'TODAY', unit: 'all day' };
  }

  return {
    value: String(daysLeft),
    unit: daysLeft === 0 ? 'last day' : daysLeft === 1 ? 'day left' : 'days left'
  };
}

function eventLabel(event) {
  if (event.kind === 'quiet') return 'QUIET WEEK';
  if (event.kind === 'holiday') return 'HOLIDAY';
  if (event.kind === 'deadline') return 'DEADLINE';
  if (event.kind === 'period') return 'IN PROGRESS';
  if (event.kind === 'registration') return 'REGISTRATION';
  if (event.kind === 'vacation') return 'VACATION';
  return 'TODAY';
}

function serializeEvent(event) {
  return {
    id: event.id,
    title: event.title,
    description: event.description || '',
    kind: event.kind,
    tone: event.tone || 'ink',
    startDate: event.startDate,
    endDate: eventEndKey(event),
    range: formatRange(event),
    priority: event.priority || 0
  };
}

const clockFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
});

const longDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric'
});

const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  weekday: 'long'
});

function formatClock(now = new Date()) {
  return clockFormatter.format(now);
}

function formatLongDate(now = new Date()) {
  return longDateFormatter.format(now);
}

function getWeekday(now = new Date()) {
  return weekdayFormatter.format(now);
}

function serializeSemester(semester) {
  if (!semester) return null;
  return {
    id: semester.id,
    label: semester.label,
    shortLabel: semester.shortLabel,
    startDate: semester.startDate,
    classesStartDate: semester.classesStartDate || semester.startDate,
    endDate: semester.endDate,
    range: semester.endDate
      ? `${formatDateKey(semester.startDate)} – ${formatDateKey(semester.endDate)}`
      : `From ${formatDateKey(semester.startDate)}`
  };
}

/**
 * Everything the assistant needs to answer time / term / deadline questions.
 * Pure and deterministic for a supplied `now`.
 */
function getCalendarSnapshot(now = new Date()) {
  const zonedParts = getZonedParts(now);
  const todayKey = toDateKey(zonedParts);
  const semester = getSemesterForDate(todayKey);
  const semesterProgress = semester ? getSemesterProgress(semester, todayKey) : null;
  const teachingWeek = semester ? getTeachingWeek(semester, todayKey) : null;
  const nextSemester = getNextSemester(todayKey, semester);
  const activeEvents = getActiveEvents(todayKey);
  const upcoming = getUpcomingEvents(todayKey, 6);
  const nextEvent = buildNextEvent(
    upcoming.find((event) => event.startDate > todayKey) || upcoming[0],
    todayKey,
    zonedParts
  );
  const quiet = activeEvents.find((event) => event.kind === 'quiet');
  const primary = quiet || activeEvents[0] || null;

  return {
    now: now.toISOString(),
    timeZone: TIME_ZONE,
    todayKey,
    timeLabel: formatClock(now),
    dateLabel: formatLongDate(now),
    weekday: getWeekday(now),
    semester: serializeSemester(semester),
    semesterProgress,
    teachingWeek,
    nextSemester: nextSemester
      ? {
          ...serializeSemester(nextSemester),
          daysUntil: Math.max(0, diffDays(todayKey, nextSemester.startDate))
        }
      : null,
    activeEvents: activeEvents.map(serializeEvent),
    upcomingEvents: upcoming.map((event) => ({
      ...serializeEvent(event),
      daysUntil: Math.max(0, diffDays(todayKey, event.startDate)),
      countdown: buildCountdown(event, todayKey, zonedParts)
    })),
    nextEvent,
    primaryEvent: primary ? {
      ...serializeEvent(primary),
      label: eventLabel(primary),
      countdown: buildCountdown(primary, todayKey, zonedParts),
      progress: buildEventProgress(primary, todayKey)
    } : null,
    mode: quiet ? 'quiet' : primary ? 'event' : semester ? 'semester' : 'none'
  };
}

/**
 * The compact banner view model. Always returns term information while a
 * semester is known, so the bar never disappears between events.
 */
function resolveBanner(now = new Date(), options = {}) {
  const snapshot = getCalendarSnapshot(now);
  const zonedParts = getZonedParts(now);
  const todayKey = snapshot.todayKey;
  const semester = options.semester || getSemesterForDate(todayKey);
  const semesterProgress = semester ? getSemesterProgress(semester, todayKey) : null;
  const teachingWeek = semester ? getTeachingWeek(semester, todayKey) : null;
  const nextSemester = getNextSemester(todayKey, semester);
  const activeEvents = getActiveEvents(todayKey);
  const quiet = activeEvents.find((event) => event.kind === 'quiet');
  const primary = quiet || activeEvents[0] || null;
  const nextEvent = snapshot.nextEvent;
  const serializedSemester = serializeSemester(semester);
  const serializedNextSemester = nextSemester
    ? {
        ...serializeSemester(nextSemester),
        daysUntil: Math.max(0, diffDays(todayKey, nextSemester.startDate))
      }
    : null;

  const shared = {
    activeEvents: activeEvents.map(serializeEvent),
    upcomingEvents: snapshot.upcomingEvents,
    nextEvent,
    nextSemester: serializedNextSemester,
    daysToNextSemester: serializedNextSemester?.daysUntil ?? null,
    semester: serializedSemester,
    semesterProgress,
    teachingWeek,
    todayKey,
    timeLabel: snapshot.timeLabel,
    dateLabel: snapshot.dateLabel,
    weekday: snapshot.weekday,
    timeZone: TIME_ZONE
  };

  if (primary) {
    return {
      ...shared,
      mode: quiet ? 'quiet' : 'event',
      label: eventLabel(primary),
      title: primary.title,
      description: primary.description || '',
      tone: primary.tone || 'red',
      kind: primary.kind,
      range: formatRange(primary),
      countdown: buildCountdown(primary, todayKey, zonedParts),
      progress: buildEventProgress(primary, todayKey),
      others: activeEvents.slice(1).map(serializeEvent)
    };
  }

  if (!semester) {
    return {
      ...shared,
      mode: 'none',
      activeEvents: []
    };
  }

  const startsLater = Boolean(semester.startDate && todayKey < semester.startDate);
  const startsIn = startsLater ? Math.max(0, diffDays(todayKey, semester.startDate)) : 0;

  if (startsLater) {
    return {
      ...shared,
      mode: 'semester',
      label: 'UPCOMING',
      title: semester.label,
      description: `Starts in ${startsIn} ${startsIn === 1 ? 'day' : 'days'}${semester.endDate ? ` · ends ${formatDateKey(semester.endDate)}` : ''}`,
      tone: 'blue',
      kind: 'semester',
      range: serializedSemester.range,
      countdown: {
        value: String(startsIn),
        unit: startsIn === 1 ? 'day to go' : 'days to go'
      },
      progress: 0,
      percent: 0,
      others: []
    };
  }

  const daysLeft = semesterProgress?.daysLeft ?? null;
  const percent = semesterProgress?.percent ?? 0;
  let description;

  if (teachingWeek && !teachingWeek.started) {
    description = `${teachingWeek.label}${daysLeft != null ? ` · ${daysLeft} days left` : ''}`;
  } else if (teachingWeek && semesterProgress) {
    description = `${teachingWeek.label} · ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`;
  } else if (teachingWeek) {
    description = teachingWeek.label;
  } else {
    description = daysLeft != null ? `${daysLeft} days left` : 'In session';
  }

  return {
    ...shared,
    mode: 'semester',
    label: semesterProgress?.finished ? 'TERM ENDED' : 'TERM',
    title: semester.label,
    description,
    tone: 'red',
    kind: 'semester',
    range: serializedSemester.range,
    countdown: daysLeft != null
      ? {
          value: String(daysLeft),
          unit: daysLeft === 1 ? 'day left' : 'days left'
        }
      : { value: '—', unit: 'in session' },
    progress: percent / 100,
    percent,
    others: []
  };
}

module.exports = {
  TIME_ZONE,
  SEMESTERS,
  EVENTS,
  RECURRING_EVENTS,
  getZonedParts,
  toDateKey,
  parseDateKey,
  diffDays,
  addDays,
  formatDateKey,
  formatRange,
  formatClock,
  formatLongDate,
  getWeekday,
  getActiveEvents,
  getUpcomingEvents,
  getNextSemester,
  getSemesterForDate,
  getSemesterProgress,
  getTeachingWeek,
  getCalendarSnapshot,
  resolveBanner
};
