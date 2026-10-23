const test = require('node:test');
const assert = require('node:assert/strict');

const { answer } = require('../lib/assistant/index.js');
const { detectIntent, parseDay, parseTimeWindow } = require('../lib/assistant/intents.js');
const { resolveBanner, getCalendarSnapshot } = require('../lib/academicCalendar.js');
const { normalizeScheduleSlot } = require('../lib/scheduleTime.js');
const { resetConversations } = require('../lib/assistant/conversationStore.js');

const at = (iso) => new Date(iso);

// Friday 23 Oct 2026, 00:30 in Amman (UTC+3).
const lateThursday = at('2026-10-22T21:30:00Z');
// Friday 23 Oct 2026, 09:30 in Amman.
const fridayMorning = at('2026-10-23T06:30:00Z');

const data = [
  {
    professor: 'Sara Ahmad',
    name: 'Sara Ahmad',
    department: 'Computer Science',
    email: 'sara@example.com',
    office: 'A-101',
    officeHours: [
      { day: 'Friday', start: '09:00', end: '10:00' },
      { day: 'Saturday', start: '10:00', end: '11:00' }
    ]
  },
  {
    professor: 'Omar Khaled',
    name: 'Omar Khaled',
    department: 'Cybersecurity',
    email: 'omar@example.com',
    office: 'B-202',
    officeHours: [
      { day: 'Saturday', start: '11:00', end: '12:00' }
    ]
  },
  {
    professor: 'Not Verified',
    name: 'Not Verified',
    department: 'Computer Science',
    email: 'nope@example.com',
    office: 'X-000',
    officeHours: [
      { day: 'Friday', start: '09:00', end: '10:00' }
    ]
  }
];

const newDataNames = ['Sara Ahmad', 'Omar Khaled'];

const options = (extra = {}) => ({
  now: lateThursday,
  data,
  newDataNames,
  disableLlm: true,
  conversationId: `test-${Math.random().toString(36).slice(2)}`,
  ...extra
});

test.beforeEach(() => {
  resetConversations();
});

test('greetings are greetings, not faculty searches', () => {
  assert.equal(detectIntent('hello', lateThursday).name, 'greeting');
  assert.equal(detectIntent('hey there', lateThursday).name, 'greeting');
  assert.equal(detectIntent('good morning', lateThursday).name, 'greeting');
});

test('the intent layer recognises availability, calendar, time and identity', () => {
  assert.equal(detectIntent('who is free now?', lateThursday).name, 'availability');
  assert.equal(detectIntent("who's free now?", lateThursday).name, 'availability');
  assert.equal(detectIntent("who's free tomorrow?", lateThursday).name, 'availability');
  assert.equal(detectIntent("who's free now?", lateThursday).entities.availability.personName, null);
  assert.equal(detectIntent('is dr mariam free now?', lateThursday).name, 'availability');
  assert.equal(detectIntent('which week are we in?', lateThursday).name, 'calendar');
  assert.equal(detectIntent('is there a doctor named lutfi', lateThursday).name, 'faculty');
  assert.equal(detectIntent('is there a doctor named lutfi', lateThursday).entities.personName, 'lutfi');
  assert.equal(detectIntent('is there an instructor named lutfi', lateThursday).name, 'faculty');
  assert.equal(detectIntent('when does the semester end?', lateThursday).name, 'calendar');
  assert.equal(detectIntent('what time is it?', lateThursday).name, 'time');
  assert.equal(detectIntent('who are you?', lateThursday).name, 'identity');
  assert.equal(detectIntent('list professors in cs', lateThursday).name, 'roster');
});

test('day and time parsing handles tomorrow, weekdays and windows', () => {
  const tomorrow = parseDay('tomorrow', lateThursday);
  assert.equal(tomorrow.dateKey, '2026-10-24');
  assert.equal(tomorrow.weekday, 'saturday');

  const monday = parseDay('on Monday', lateThursday);
  assert.equal(monday.dateKey, '2026-10-26');

  const nextMonday = parseDay('next Monday at 10', lateThursday);
  assert.equal(nextMonday.dateKey, '2026-10-26');

  const window = parseTimeWindow('between 2 and 4 pm');
  assert.equal(window.startMinutes, 14 * 60);
  assert.equal(window.endMinutes, 16 * 60);

  const after = parseTimeWindow('after 3');
  assert.equal(after.startMinutes, 15 * 60);

  const at10 = parseTimeWindow('at 10');
  assert.equal(at10.startMinutes, 10 * 60);
});

test('combined and mislabelled office-hour ranges are normalized', () => {
  const combined = normalizeScheduleSlot('11:30 PM – 1:00 PM', '');
  assert.equal(combined.valid, true);
  assert.equal(combined.startMinutes, 11 * 60 + 30);
  assert.equal(combined.endMinutes, 13 * 60);

  const plain = normalizeScheduleSlot('12:00 PM – 1:00 PM', '');
  assert.equal(plain.valid, true);
  assert.equal(plain.start, '12:00');
  assert.equal(plain.end, '13:00');

  const midnight = normalizeScheduleSlot('12:00', '1:00');
  assert.equal(midnight.valid, true);
  assert.equal(midnight.end, '13:00');
});

test('a greeting answer never mentions a faculty match', async () => {
  const result = await answer('hello', options());
  assert.equal(result.type, 'assistant');
  assert.equal(result.intent, 'greeting');
  assert.doesNotMatch(result.response, /couldn't find a faculty match/i);
});

test('time answers include the Amman clock and date', async () => {
  const result = await answer('what time is it?', options());
  assert.equal(result.type, 'calendar');
  assert.match(result.response, /12:30 AM/);
  assert.match(result.response, /Friday/);
  assert.match(result.response, /23 October 2026/);
});

test('week answers use the teaching week from the first day of classes', async () => {
  const result = await answer('which week are we in?', options());
  assert.equal(result.type, 'calendar');
  assert.match(result.response, /week 3 of 16/i);
  assert.match(result.response, /Classes ended Thursday 22 Oct/);
  assert.match(result.response, /Week 4 starts Sunday 25 Oct/);
  assert.match(result.response, /90 days/);
});

test('who is free now filters to verified faculty and the current slot', async () => {
  const result = await answer("who's free now?", options({ now: fridayMorning }));
  assert.equal(result.type, 'availability');
  assert.equal(result.count, 1);
  assert.equal(result.results[0].name, 'Sara Ahmad');
  assert.doesNotMatch(result.response, /Not Verified/);
  assert.match(result.response, /Right now/);
});

test('an empty now result explains Friday and shows the next verified slots', async () => {
  const result = await answer('who is free now?', options());
  assert.equal(result.type, 'availability');
  assert.equal(result.count, 0);
  assert.match(result.response, /No verified instructor/i);
  assert.match(result.response, /Saturday/);
  assert.match(result.response, /Sara Ahmad/);
});

test('who is free tomorrow returns the whole day', async () => {
  const result = await answer('who is free tomorrow?', options());
  assert.equal(result.type, 'availability');
  assert.equal(result.count, 2);
  assert.deepEqual(result.results.map((item) => item.name).sort(), ['Omar Khaled', 'Sara Ahmad']);
});

test('a specific professor gets a personal availability answer', async () => {
  const result = await answer('is sara free now?', options({ now: fridayMorning }));
  assert.equal(result.type, 'availability');
  assert.equal(result.person.found, true);
  assert.equal(result.person.freeNow, true);
  assert.match(result.response, /Yes/);
  assert.match(result.response, /Sara Ahmad/);
});

test('an unknown professor name is reported without leaking everyone else', async () => {
  const result = await answer('is zzz nobody free now?', options({ now: fridayMorning }));
  assert.equal(result.type, 'availability');
  assert.equal(result.person.found, false);
  assert.equal(result.count, 0);
  assert.match(result.response, /couldn't find/i);
});

test('a pronoun follow-up resolves to the last professor', async () => {
  const conversationId = 'follow-up-professor';
  const first = await answer('is sara free now?', options({ now: fridayMorning, conversationId }));
  assert.equal(first.person.name, 'Sara Ahmad');

  const second = await answer('what is her email?', options({ now: fridayMorning, conversationId }));
  assert.equal(second.type, 'faculty');
  assert.match(second.query, /Sara Ahmad/);
  assert.equal(second.resolvedFrom, 'Sara Ahmad');
});

test('an availability follow-up keeps the previous filter', async () => {
  const conversationId = 'follow-up-availability';
  const first = await answer('who is free now?', options({ conversationId }));
  assert.equal(first.count, 0);

  const second = await answer('what about tomorrow?', options({ conversationId }));
  assert.equal(second.type, 'availability');
  assert.equal(second.count, 2);
});

test('unknown messages get guidance instead of a faculty search', async () => {
  const result = await answer('make me a sandwich', options());
  assert.equal(result.type, 'assistant');
  assert.equal(result.intent, 'unknown');
  assert.match(result.response, /office hours|calendar/i);
});

test('the banner always shows term information between events', () => {
  const banner = resolveBanner(lateThursday);
  assert.equal(banner.mode, 'semester');
  assert.equal(banner.label, 'TERM');
  assert.match(banner.description, /week 3 of 16/i);
  assert.equal(banner.semesterProgress.daysLeft, 90);
  assert.equal(banner.nextEvent.title, 'Credit-hour equivalence deadline');
  assert.equal(banner.nextSemester.label, 'Spring 2026/2027');
});

test('the calendar snapshot exposes time, term, next event and next semester', () => {
  const snapshot = getCalendarSnapshot(lateThursday);
  assert.equal(snapshot.todayKey, '2026-10-23');
  assert.equal(snapshot.weekday, 'Friday');
  assert.equal(snapshot.timeLabel, '12:30 AM');
  assert.equal(snapshot.teachingWeek.week, 3);
  assert.equal(snapshot.teachingWeek.phase, 'weekend');
  assert.equal(snapshot.semesterProgress.daysLeft, 90);
  assert.equal(snapshot.nextSemester.daysUntil, 156);
  assert.equal(snapshot.nextEvent.startDate, '2026-11-22');
});

test('Sunday 25 October starts week 4', () => {
  const snapshot = getCalendarSnapshot(at('2026-10-25T09:00:00+03:00'));
  assert.equal(snapshot.teachingWeek.week, 4);
  assert.equal(snapshot.teachingWeek.phase, 'in-session');
});
