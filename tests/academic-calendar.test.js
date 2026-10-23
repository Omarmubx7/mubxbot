const test = require('node:test');
const assert = require('node:assert/strict');

const {
  TIME_ZONE,
  getZonedParts,
  toDateKey,
  diffDays,
  getActiveEvents,
  getSemesterProgress,
  getTeachingWeek,
  resolveBanner
} = require('../lib/academicCalendar.js');

const at = (iso) => new Date(iso);

test('calendar uses Amman wall-clock dates, not the server timezone', () => {
  // 22:30 UTC on 21 Oct is already 01:30 on 22 Oct in Amman (UTC+3).
  const parts = getZonedParts(at('2026-10-21T22:30:00Z'));
  assert.equal(TIME_ZONE, 'Asia/Amman');
  assert.equal(toDateKey(parts), '2026-10-22');
});

test('today shows the Coursera deadline after add/drop closed', () => {
  const banner = resolveBanner(at('2026-10-22T09:00:00+03:00'));
  const ids = banner.activeEvents.map((event) => event.id);

  assert.equal(banner.mode, 'event');
  assert.ok(!ids.includes('add-drop-fall-2026'));
  assert.ok(ids.includes('coursera-approval-deadline-2026'));
  assert.equal(banner.title, 'Coursera approval deadline');
  assert.equal(banner.others.length, 0);
  assert.match(banner.countdown.value, /^\d{2}:\d{2}$/);
  assert.equal(banner.countdown.unit, 'left today');
});

test('classes and add/drop open on 4 October and close after 8 October', () => {
  const firstDay = getActiveEvents('2026-10-04').map((event) => event.id);
  const lastDay = getActiveEvents('2026-10-08').map((event) => event.id);
  const dayAfter = getActiveEvents('2026-10-09').map((event) => event.id);

  assert.ok(firstDay.includes('classes-start-fall-2026'));
  assert.ok(firstDay.includes('add-drop-fall-2026'));
  assert.ok(lastDay.includes('add-drop-fall-2026'));
  assert.ok(!dayAfter.includes('add-drop-fall-2026'));
});

test('teaching weeks run Sunday to Thursday and reset on Sunday', () => {
  const semester = {
    startDate: '2026-10-01',
    classesStartDate: '2026-10-04',
    endDate: '2027-01-21',
    totalWeeks: 16
  };

  assert.equal(getTeachingWeek(semester, '2026-10-04').week, 1);
  assert.equal(getTeachingWeek(semester, '2026-10-22').week, 3);
  assert.equal(getTeachingWeek(semester, '2026-10-23').week, 3);
  assert.equal(getTeachingWeek(semester, '2026-10-24').week, 3);
  assert.equal(getTeachingWeek(semester, '2026-10-25').week, 4);
  assert.equal(getTeachingWeek(semester, '2026-10-25').phase, 'in-session');
  assert.equal(getTeachingWeek(semester, '2026-10-23').phase, 'weekend');
});

test('the banner falls back to term progress the day after an event ends', () => {
  const banner = resolveBanner(at('2026-10-23T00:01:00+03:00'));
  assert.equal(banner.mode, 'semester');
  assert.equal(banner.label, 'TERM');
  assert.deepEqual(banner.activeEvents, []);
  assert.match(banner.description, /week 3 of 16/i);
});

test('recurring holidays switch on at 00:00 and off at midnight', () => {
  const christmasEve = resolveBanner(at('2026-12-24T23:59:00+03:00'));
  const christmas = resolveBanner(at('2026-12-25T00:00:00+03:00'));
  const boxingDay = resolveBanner(at('2026-12-26T00:00:00+03:00'));

  assert.notEqual(christmasEve.mode, 'event');
  assert.equal(christmas.mode, 'event');
  assert.equal(christmas.title, 'Christmas');
  assert.deepEqual(christmas.countdown, { value: 'ALL', unit: 'day' });
  assert.notEqual(boxingDay.mode, 'event');
});

test('quiet week counts down to its final day', () => {
  const firstDay = resolveBanner(at('2027-01-10T09:00:00+03:00'));
  const lastDay = resolveBanner(at('2027-01-14T23:59:00+03:00'));
  const after = resolveBanner(at('2027-01-15T00:00:00+03:00'));

  assert.equal(firstDay.mode, 'quiet');
  assert.equal(firstDay.label, 'QUIET WEEK');
  assert.deepEqual(firstDay.countdown, { value: '4', unit: 'days left' });
  assert.equal(firstDay.progress, 0.2);

  assert.equal(lastDay.mode, 'quiet');
  assert.deepEqual(lastDay.countdown, { value: '0', unit: 'last day' });
  assert.equal(lastDay.progress, 1);

  assert.notEqual(after.mode, 'quiet');
});

test('December shows the term progress once the event calendar is clear', () => {
  const banner = resolveBanner(at('2026-12-10T12:00:00+03:00'));

  assert.equal(banner.mode, 'semester');
  assert.equal(banner.label, 'TERM');
  assert.equal(banner.percent, 61);
  assert.equal(banner.semesterProgress.daysLeft, 42);
  assert.equal(banner.semesterProgress.week, 10);
  assert.ok(banner.progress > 0.6 && banner.progress < 0.62);
});

test('semester progress is clamped at the start and end', () => {
  const semester = { startDate: '2026-10-04', endDate: '2027-01-21', totalWeeks: 16 };

  const before = getSemesterProgress(semester, '2026-09-20');
  const first = getSemesterProgress(semester, '2026-10-04');
  const last = getSemesterProgress(semester, '2027-01-21');
  const after = getSemesterProgress(semester, '2027-02-21');

  assert.equal(before.percent, 0);
  assert.equal(first.percent, 0);
  assert.equal(first.week, 1);
  assert.equal(last.percent, 100);
  assert.equal(last.daysLeft, 0);
  assert.equal(after.percent, 100);
  assert.equal(after.finished, true);
});

test('multi-day ranges stay active through their end date', () => {
  const dayOne = getActiveEvents('2026-11-22').map((event) => event.id);
  const lastDay = getActiveEvents('2026-12-03').map((event) => event.id);
  const dayAfter = getActiveEvents('2026-12-04').map((event) => event.id);

  assert.ok(dayOne.includes('formative-assessment-fall-2026'));
  assert.ok(lastDay.includes('formative-assessment-fall-2026'));
  assert.ok(!dayAfter.includes('formative-assessment-fall-2026'));
});

test('recurring holidays also resolve in future years', () => {
  const banner = resolveBanner(at('2027-12-25T12:00:00+03:00'));
  assert.equal(banner.mode, 'event');
  assert.equal(banner.title, 'Christmas');
});

test('date math is inclusive and timezone-safe across year boundaries', () => {
  assert.equal(diffDays('2026-12-31', '2027-01-01'), 1);
  assert.equal(diffDays('2026-10-04', '2027-01-21'), 109);
});
