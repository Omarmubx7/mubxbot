const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEPARTMENTS,
  BUILDINGS,
  normalizeDepartmentName,
  isValidEmail,
  formatRoom,
  parseRoom
} = require('../lib/directoryLists.js');

test('DEPARTMENTS contains the canonical department list', () => {
  assert.deepEqual(DEPARTMENTS, [
    'Computer Science',
    'Cybersecurity',
    'AI & Data Science',
    'Information Technology'
  ]);
});

test('BUILDINGS contains the supported building codes', () => {
  assert.deepEqual(BUILDINGS, ['S', 'W', 'N', 'WB', 'IJC']);
});

test('normalizeDepartmentName maps variants to canonical names', () => {
  assert.equal(normalizeDepartmentName('cs'), 'Computer Science');
  assert.equal(normalizeDepartmentName('Computer Science'), 'Computer Science');
  assert.equal(normalizeDepartmentName('  COMPUTER SCIENCE  '), 'Computer Science');

  assert.equal(normalizeDepartmentName('cyber security'), 'Cybersecurity');
  assert.equal(normalizeDepartmentName('Cybersecurity'), 'Cybersecurity');
  assert.equal(normalizeDepartmentName('Cyber Security Department'), 'Cybersecurity');

  assert.equal(normalizeDepartmentName('Data Science and Artificial Intelligence'), 'AI & Data Science');
  assert.equal(normalizeDepartmentName('AI and Data Science'), 'AI & Data Science');
  assert.equal(normalizeDepartmentName('AI & Data Science'), 'AI & Data Science');
  assert.equal(normalizeDepartmentName('Data Science and Artificial Intelligent'), 'AI & Data Science');

  assert.equal(normalizeDepartmentName('it'), 'Information Technology');
  assert.equal(normalizeDepartmentName('Information Technology'), 'Information Technology');
});

test('normalizeDepartmentName drops junk and unknown values', () => {
  assert.equal(normalizeDepartmentName(''), '');
  assert.equal(normalizeDepartmentName('Email: aseel.abuhaq@htu.edu.jo'), '');
  assert.equal(normalizeDepartmentName('Unknown'), '');
  assert.equal(normalizeDepartmentName('Time/Day:'), '');
  assert.equal(normalizeDepartmentName('zzz-not-a-department'), '');
});

test('isValidEmail accepts well-formed emails and rejects bad ones', () => {
  assert.equal(isValidEmail('professor@htu.edu.jo'), true);
  assert.equal(isValidEmail('a.b_c-d@sub.example.org'), true);
  assert.equal(isValidEmail(''), false);
  assert.equal(isValidEmail('not-an-email'), false);
  assert.equal(isValidEmail('missing@tld'), false);
  assert.equal(isValidEmail('spaces in@email.com'), false);
  assert.equal(isValidEmail('a@b@c.com'), false);
});

test('formatRoom builds canonical room codes', () => {
  assert.equal(formatRoom('S', '319'), 'S-319');
  assert.equal(formatRoom('s', '319'), 'S-319');
  assert.equal(formatRoom('W', 'b05'), 'W-B05');
  assert.equal(formatRoom('IJC', '04'), 'IJC-04');
  assert.equal(formatRoom('WB', '1300'), 'WB-1300');
  assert.equal(formatRoom('S', ' 310 '), 'S-310');
  assert.equal(formatRoom('', ''), '');
  assert.equal(formatRoom('S', ''), 'S');
  assert.equal(formatRoom('', '319'), '319');
});

test('parseRoom reads canonical and compact room codes', () => {
  assert.deepEqual(parseRoom('S-319'), { building: 'S', number: '319' });
  assert.deepEqual(parseRoom('s310'), { building: 'S', number: '310' });
  assert.deepEqual(parseRoom('W-B05'), { building: 'W', number: 'B05' });
  assert.deepEqual(parseRoom('W214'), { building: 'W', number: '214' });
  assert.deepEqual(parseRoom('IJC-04'), { building: 'IJC', number: '04' });
  assert.deepEqual(parseRoom('S-318'), { building: 'S', number: '318' });
});

test('parseRoom returns null for unparseable offices', () => {
  assert.equal(parseRoom(''), null);
  assert.equal(parseRoom("Dean's Office (S-319)"), null);
  assert.equal(parseRoom('Eiman Building | IJC-07'), null);
  assert.equal(parseRoom('Time/Day:'), null);
  assert.equal(parseRoom('4'), null);
});

test('formatRoom(parseRoom(x)) round-trips canonical room codes', () => {
  for (const raw of ['S-319', 'W-B05', 'IJC-04', 'S-310', 'W-214']) {
    const parsed = parseRoom(raw);
    assert.ok(parsed, `expected ${raw} to parse`);
    assert.equal(formatRoom(parsed.building, parsed.number), raw.toUpperCase());
  }
});
