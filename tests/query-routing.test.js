const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getAllOfficeHours,
  searchOfficeHours,
  extractQueryContext,
  extractQuerySubject,
  buildContextualQuery,
  generateSmartResponse
} = require('../lib/getOfficeHours.js');

async function getSampleProfessors(limit = 5) {
  const allProfessors = await getAllOfficeHours();

  return allProfessors
    .filter(professor => {
      const hasName = Boolean(professor.professor || professor.name);
      const hasEmail = Boolean(professor.email);
      const hasOffice = Boolean(professor.office);
      const hasHours = Array.isArray(professor.officeHours) && professor.officeHours.length > 0;

      return hasName && hasEmail && hasOffice && hasHours;
    })
    .slice(0, limit);
}

test('question intent mapping stays deterministic', () => {
  assert.equal(extractQueryContext('what murad yaghi').answerType, 'email');
  assert.equal(extractQueryContext('when murad yaghi').answerType, 'hours');
  assert.equal(extractQueryContext('where murad yaghi').answerType, 'office');
  assert.equal(extractQueryContext('murad yaghi department').answerType, 'department');
  assert.equal(extractQueryContext('murad yaghi').answerType, 'profile');
});

test('what queries return the matched professor email across multiple names', async () => {
  const sampleProfessors = await getSampleProfessors();
  assert.ok(sampleProfessors.length > 0, 'Expected sample professors in the dataset');

  for (const professor of sampleProfessors) {
    const query = `what ${professor.professor}`;
    const results = await searchOfficeHours(query);

    assert.ok(results.length >= 1, `Expected at least one match for query: ${query}`);
    assert.equal(generateSmartResponse(results[0], query), results[0].email || 'No email available.');
  }
});

test('when queries return office hours across multiple names', async () => {
  const sampleProfessors = await getSampleProfessors();
  assert.ok(sampleProfessors.length > 0, 'Expected sample professors in the dataset');

  for (const professor of sampleProfessors) {
    const query = `when ${professor.professor}`;
    const results = await searchOfficeHours(query);

    assert.ok(results.length >= 1, `Expected at least one match for query: ${query}`);

    const response = generateSmartResponse(results[0], query);
    assert.match(response, /:/, `Expected office-hours formatting for query: ${query}`);
  }
});

test('where queries return office codes across multiple names', async () => {
  const sampleProfessors = await getSampleProfessors();
  assert.ok(sampleProfessors.length > 0, 'Expected sample professors in the dataset');

  for (const professor of sampleProfessors) {
    const query = `where ${professor.professor}`;
    const results = await searchOfficeHours(query);

    assert.ok(results.length >= 1, `Expected at least one match for query: ${query}`);
    assert.equal(generateSmartResponse(results[0], query), results[0].office || 'No office code available.');
  }
});

test('query subject extraction removes question stopwords', () => {
  assert.equal(extractQuerySubject('when is razan free on wednesday'), 'razan');
  assert.equal(extractQuerySubject('where is asma office'), 'asma');
  assert.equal(extractQuerySubject('what is dr murad email'), 'murad');
});

test('contextual query builder preserves original intent', () => {
  assert.equal(
    buildContextualQuery('Asma Ahmad', { answerType: 'office' }),
    'where Asma Ahmad'
  );

  assert.equal(
    buildContextualQuery('Asma Ahmad', { answerType: 'email' }),
    'what Asma Ahmad'
  );

  assert.equal(
    buildContextualQuery('Asma Ahmad', { answerType: 'hours', specificDay: 'wednesday' }),
    'when Asma Ahmad on Wednesday'
  );
});

test('day-specific when queries return only the requested day', async () => {
  const sampleProfessors = await getSampleProfessors(20);
  const professorWithWednesday = sampleProfessors.find(professor =>
    professor.officeHours.some(slot => slot.day.toLowerCase() === 'wednesday')
  );

  assert.ok(professorWithWednesday, 'Expected a sample professor with Wednesday office hours');

  const query = `when ${professorWithWednesday.professor} on wednesday`;
  const response = generateSmartResponse(professorWithWednesday, query);

  assert.match(response.toLowerCase(), /wednesday:/, 'Expected Wednesday office hours in response');

  const lines = response
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  assert.ok(lines.length > 0, 'Expected at least one office-hour line in response');
  for (const line of lines) {
    assert.match(line.toLowerCase(), /^wednesday:/, `Expected only Wednesday entries, got: ${line}`);
  }
});