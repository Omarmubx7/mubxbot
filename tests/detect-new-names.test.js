const test = require('node:test');
const assert = require('node:assert/strict');

const OLD_ROWS = [
  { faculty: 'Murad A. Yaghi', department: 'Computer Science' },
  { faculty: 'Razan AlQuraan', department: 'Cybersecurity' },
  { faculty: 'Sama Hamza', department: 'AI & Data Science' }
];

const NEW_ROWS = [
  ...OLD_ROWS,
  { faculty: 'Faisal Alkhateeb', department: 'Computer Science' },
  { faculty: 'Dr. Faisal Alkhateeb', department: 'Computer Science' },
  { faculty: 'Layla Nasser', department: 'Cybersecurity' }
];

test('diffNewNames returns only names absent from the old dataset', async () => {
  const { diffNewNames } = await import('../lib/newNameDiff.js');

  const added = diffNewNames(OLD_ROWS, NEW_ROWS);
  assert.deepEqual(added, ['Faisal Alkhateeb', 'Layla Nasser']);
});

test('diffNewNames collapses duplicate/titled spellings of the same person', async () => {
  const { diffNewNames } = await import('../lib/newNameDiff.js');

  const added = diffNewNames([], [
    { faculty: 'Faisal Alkhateeb' },
    { faculty: 'Dr. Faisal Alkhateeb' },
    { professor: 'faisal  alkhateeb' }
  ]);

  assert.equal(added.length, 1);
});

test('diffNewNames returns nothing when the dataset is unchanged', async () => {
  const { diffNewNames } = await import('../lib/newNameDiff.js');
  assert.deepEqual(diffNewNames(OLD_ROWS, OLD_ROWS), []);
});

test('mergeNames appends deduplicated additions and reports what was added', async () => {
  const { mergeNames } = await import('../lib/newNameDiff.js');

  const { names, added } = mergeNames(['Murad A. Yaghi'], ['murad a. yaghi', 'Layla Nasser']);
  assert.deepEqual(added, ['Layla Nasser']);
  assert.deepEqual(names, ['Murad A. Yaghi', 'Layla Nasser']);
});

test('every instructor reads as OLD DATA until the dynamic store marks them NEW', async () => {
  const { isNewDataName } = await import('../lib/updateList.js');

  assert.equal(isNewDataName('Murad A. Yaghi'), false);
  assert.equal(isNewDataName('Razan AlQuraan'), false);
  assert.equal(isNewDataName('Somebody Not In Any List'), false);
  // Only an explicit dynamic-store entry flips a name to NEW.
  assert.equal(isNewDataName('Layla Nasser', ['Layla Nasser']), true);
});
