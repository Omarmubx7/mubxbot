'use strict';

/**
 * Natural-language answers for time, date, semester and academic-calendar
 * questions. Everything is derived from the shared calendar snapshot.
 */

const calendar = require('../academicCalendar.js');
const { normalize } = require('./intents.js');

const STOPWORDS = new Set([
  'when', 'what', 'whats', 'which', 'who', 'where', 'how', 'many', 'much', 'is', 'are',
  'the', 'a', 'an', 'of', 'to', 'for', 'in', 'on', 'at', 'do', 'does', 'did', 'will',
  'there', 'this', 'that', 'next', 'last', 'current', 'today', 'now', 'day', 'days',
  'week', 'weeks', 'semester', 'term', 'calendar', 'academic', 'start', 'starts',
  'end', 'ends', 'left', 'until', 'till', 'remaining', 'date', 'time'
]);

const QUICK_REPLIES = [
  "Who's free tomorrow?",
  'When does the semester end?',
  "What's the next deadline?"
];

function buildCalendarAnswer({ message = '', now = new Date() } = {}) {
  const snapshot = calendar.getCalendarSnapshot(now);
  const q = normalize(message);
  const response = compose(q, snapshot);
  const labels = buildFacts(snapshot);

  return {
    type: 'calendar',
    intent: 'calendar',
    response,
    snapshot,
    facts: labels,
    quickReplies: QUICK_REPLIES
  };
}

function buildFacts(snapshot) {
  const facts = [];
  const teaching = snapshot.teachingWeek;

  if (teaching) {
    facts.push({
      label: 'Week',
      value: teaching.started ? `${teaching.week} of ${teaching.totalWeeks}` : teaching.label,
      detail: teaching.weekend && teaching.hasNextWeek
        ? teaching.nextWeekLabel
        : teaching.started
          ? 'Classes run Sunday–Thursday'
          : '',
      emphasis: true
    });
  }

  if (snapshot.semester) {
    facts.push({
      label: 'Semester',
      value: snapshot.semester.shortLabel || snapshot.semester.label,
      detail: snapshot.semester.range
    });
  }

  if (snapshot.semesterProgress) {
    facts.push({
      label: 'Days left',
      value: String(snapshot.semesterProgress.daysLeft),
      detail: `until ${calendar.formatDateKey(snapshot.semester.endDate, { withYear: false })}`
    });
  }

  if (snapshot.nextEvent) {
    facts.push({
      label: 'Next',
      value: snapshot.nextEvent.title,
      detail: `${snapshot.nextEvent.range} · in ${snapshot.nextEvent.daysUntil} days`
    });
  }

  if (snapshot.nextSemester) {
    facts.push({
      label: 'Next semester',
      value: snapshot.nextSemester.shortLabel || snapshot.nextSemester.label,
      detail: `${snapshot.nextSemester.range} · in ${snapshot.nextSemester.daysUntil} days`
    });
  }

  return facts;
}

function compose(q, snapshot) {
  if (/\b(what|whats) (is )?(the )?time\b|\bwhat time is it\b|\bcurrent (time|hour)\b/.test(q)) {
    return `It's ${snapshot.timeLabel} on ${snapshot.dateLabel} in Amman (${snapshot.timeZone}).`;
  }

  if (/\b(what|whats) (is )?(the )?(day|date)\b|\bwhat day is (it|today)\b|\btoday'?s date\b/.test(q)) {
    return `Today is ${snapshot.dateLabel} in Amman.`;
  }

  const nextSemesterMatch = /\b(next|coming|following) semester\b/.test(q) || /\bwhen (does|do) (the )?(next )?semester (start|begin)\b/.test(q);
  if (nextSemesterMatch) {
    if (!snapshot.nextSemester) {
      return 'I do not have a start date for the next semester yet.';
    }
    const next = snapshot.nextSemester;
    return [
      `${next.label} starts on ${calendar.formatDateKey(next.startDate)} — ${next.daysUntil} days from today.`,
      snapshot.semester ? `The current term, ${snapshot.semester.label}, ends on ${calendar.formatDateKey(snapshot.semester.endDate)}.` : ''
    ].filter(Boolean).join(' ');
  }

  const endMatch = /\b(end|ends|ending|finish|finishes|last day)\b/.test(q)
    && /\b(semester|term|classes|class)\b/.test(q);
  if (endMatch && snapshot.semester) {
    if (!snapshot.semester.endDate) {
      return `I do not have an end date for ${snapshot.semester.label} yet.`;
    }
    const days = snapshot.semesterProgress?.daysLeft;
    return `${snapshot.semester.label} ends on ${calendar.formatDateKey(snapshot.semester.endDate)}${Number.isFinite(days) ? ` — ${days} days from today` : ''}.`;
  }

  const startMatch = /\b(when|what date) (do|does|did) (classes|class|the semester|semester) (start|begin)\b/.test(q)
    || /\bclasses start\b/.test(q);
  if (startMatch && snapshot.semester) {
    const start = snapshot.semester.classesStartDate || snapshot.semester.startDate;
    return `Classes for ${snapshot.semester.label} started on ${calendar.formatDateKey(start)}. We are in week ${snapshot.teachingWeek?.week || 1} of ${snapshot.teachingWeek?.totalWeeks || '—'}.`;
  }

  const weekMatch = /\b(which|what) week\b|\bweek (are we|is it|number)\b|\bteaching week\b/.test(q);
  if (weekMatch) {
    if (!snapshot.semester) return 'I do not have an active semester in the calendar right now.';
    if (!snapshot.teachingWeek?.started) {
      return `${snapshot.teachingWeek?.label || 'Classes have not started yet'} for ${snapshot.semester.label}. The semester runs ${snapshot.semester.range}.`;
    }
    const teaching = snapshot.teachingWeek;
    return [
      `You're in week ${teaching.week} of ${teaching.totalWeeks} for ${snapshot.semester.label}.`,
      teaching.weekend && teaching.hasNextWeek
        ? `${teaching.phaseLabel}. ${teaching.nextWeekLabel}.`
        : teaching.phase === 'finished'
          ? 'The semester is complete.'
          : '',
      snapshot.semesterProgress ? `There are ${snapshot.semesterProgress.daysLeft} days left until the semester ends on ${calendar.formatDateKey(snapshot.semester.endDate)}.` : ''
    ].filter(Boolean).join(' ');
  }

  const daysLeftMatch = /\b(days?|weeks?) (left|remaining)\b|\bhow many (days|weeks) (left|remaining|until)\b/.test(q);
  if (daysLeftMatch) {
    if (/\bnext semester\b/.test(q) && snapshot.nextSemester) {
      return `${snapshot.nextSemester.daysUntil} days until ${snapshot.nextSemester.label} starts on ${calendar.formatDateKey(snapshot.nextSemester.startDate)}.`;
    }
    if (snapshot.semesterProgress) {
      return `${snapshot.semesterProgress.daysLeft} days left in ${snapshot.semester.label} (${snapshot.semesterProgress.weeksLeft} teaching weeks including this one). The last day is ${calendar.formatDateKey(snapshot.semester.endDate)}.`;
    }
  }

  const eventAnswer = answerEventQuestion(q, snapshot);
  if (eventAnswer) return eventAnswer;

  if (/\b(holiday|holidays|vacation|break|christmas|new year|eid|ramadan|quiet week)\b/.test(q)) {
    const upcomingBreak = findEvents(q, snapshot).find((event) => (
      event.kind === 'holiday' || event.kind === 'vacation' || event.kind === 'quiet'
    ));
    if (upcomingBreak) {
      return describeEvent(upcomingBreak);
    }
    return 'There are no holidays or breaks listed in the academic calendar from today onward.';
  }

  if (/\b(deadline|due|registration|add|drop|finals?|exams?|assessment|postpone|withdraw|discontinue)\b/.test(q)) {
    const event = findEvents(q, snapshot)[0] || snapshot.nextEvent;
    if (event) return describeEvent(event);
  }

  // Generic calendar question: show the term plus the next date.
  return summarize(snapshot);
}

function summarize(snapshot) {
  const parts = [];

  if (snapshot.semester) {
    const teaching = snapshot.teachingWeek?.started
      ? ` We're in week ${snapshot.teachingWeek.week} of ${snapshot.teachingWeek.totalWeeks}.`
      : ` ${snapshot.teachingWeek?.label || ''}`.trimEnd();
    parts.push(`${snapshot.semester.label} runs ${snapshot.semester.range}.${teaching}`);

    if (snapshot.semesterProgress) {
      parts.push(`${snapshot.semesterProgress.daysLeft} days left until ${calendar.formatDateKey(snapshot.semester.endDate)}.`);
    }
  }

  if (snapshot.nextSemester) {
    parts.push(`${snapshot.nextSemester.label} starts ${calendar.formatDateKey(snapshot.nextSemester.startDate)} (${snapshot.nextSemester.daysUntil} days away).`);
  }

  if (snapshot.nextEvent) {
    parts.push(`Next up: ${snapshot.nextEvent.title} on ${calendar.formatDateKey(snapshot.nextEvent.startDate)} (${snapshot.nextEvent.daysUntil} days).`);
  }

  if (parts.length === 0) {
    return 'I do not have academic-calendar data for today.';
  }

  return parts.join(' ');
}

function findEvents(q, snapshot) {
  const upcoming = calendar.getUpcomingEvents(snapshot.todayKey, 30);
  const queryTokens = q.split(' ').filter((token) => token.length > 2 && !STOPWORDS.has(token));
  if (queryTokens.length === 0) return upcoming;

  const matched = upcoming.filter((event) => {
    const haystack = normalize(`${event.title} ${event.description || ''} ${event.kind || ''}`);
    return queryTokens.some((token) => haystack.includes(token));
  });

  return matched.length > 0 ? matched : upcoming;
}

function answerEventQuestion(q, snapshot) {
  const wantsNext = /\b(next|coming|upcoming)\b/.test(q);
  const wantsDeadline = /\b(deadline|due|last day)\b/.test(q);
  const namedEvent = findEvents(q, snapshot)[0];

  if (wantsDeadline) {
    const event = findEvents(q, snapshot).find((item) => item.kind === 'deadline') || namedEvent;
    if (event) return describeEvent(event);
  }

  if (wantsNext && /\b(event|academic|calendar|happening|coming up)\b/.test(q)) {
    return snapshot.nextEvent ? describeEvent(snapshot.nextEvent) : 'There are no upcoming academic dates listed.';
  }

  if (/\b(add|drop)\b/.test(q) || /\bregistration\b/.test(q)) {
    const event = namedEvent;
    if (event) return describeEvent(event);
  }

  return null;
}

function describeEvent(event) {
  if (!event) return 'I could not find that in the academic calendar.';
  const date = event.endDate && event.endDate !== event.startDate
    ? `from ${calendar.formatDateKey(event.startDate)} to ${calendar.formatDateKey(event.endDate)}`
    : `on ${calendar.formatDateKey(event.startDate)}`;
  const countdown = Number.isFinite(event.daysUntil)
    ? event.daysUntil === 0
      ? ' That is today.'
      : ` That is in ${event.daysUntil} ${event.daysUntil === 1 ? 'day' : 'days'}.`
    : '';
  const description = event.description ? ` ${event.description}` : '';
  return `${event.title} is ${date}.${countdown}${description}`.trim();
}

module.exports = {
  buildCalendarAnswer,
  describeEvent
};
