const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getAllOfficeHours,
  searchOfficeHours,
  extractQueryContext,
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