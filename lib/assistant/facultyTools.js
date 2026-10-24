'use strict';

/**
 * Directory helpers used by the assistant for non-time questions.
 */

const { getAllOfficeHours } = require('../getOfficeHours.js');
const { normalize } = require('./intents.js');

function normalizeDepartment(value = '') {
  return normalize(value).replace(/[^a-z0-9]+/g, ' ').trim();
}

function matchesDepartment(entry, department) {
  if (!department) return true;
  const dept = normalizeDepartment(entry.department);
  const filter = normalizeDepartment(department);

  if (filter.includes('computer science') || filter === 'cs') return dept.includes('computer science');
  if (filter.includes('information technology') || filter === 'it') return dept.includes('information technology');
  if (filter.includes('cyber')) return dept.includes('cyber');
  if (filter.includes('artificial') || filter.includes('data') || filter === 'ai') {
    return dept.includes('artificial') || dept.includes('data') || dept.includes('ai');
  }
  if (filter.includes('basic')) return dept.includes('basic');
  if (filter.includes('leadership')) return dept.includes('leadership');
  if (filter.includes('games')) return dept.includes('game');

  return dept.includes(filter);
}

async function loadVerifiedNames() {
  try {
    const mod = await import('../newDataStore.js');
    if (typeof mod?.loadNewDataNames === 'function') {
      return await mod.loadNewDataNames();
    }
  } catch {
    // Fall back to no verification list; callers may inject one.
  }
  return [];
}

function isVerified(name, names) {
  if (!Array.isArray(names) || names.length === 0) return true;
  const target = normalize(name);
  return names.some((candidate) => normalize(candidate) === target);
}

async function buildRosterAnswer({ department = null, now = new Date(), data, newDataNames } = {}) {
  const allData = Array.isArray(data) ? data : await getAllOfficeHours();
  const verifiedNames = Array.isArray(newDataNames) ? newDataNames : await loadVerifiedNames();
  const seen = new Set();
  const professors = [];

  for (const entry of allData) {
    const name = entry.professor || entry.name || '';
    if (!name) continue;
    if (!matchesDepartment(entry, department)) continue;
    if (!isVerified(name, verifiedNames)) continue;
    const key = normalize(name);
    if (seen.has(key)) continue;
    seen.add(key);
    professors.push({
      name,
      department: entry.department || '',
      email: entry.email || '',
      office: entry.office || ''
    });
  }

  professors.sort((a, b) => a.name.localeCompare(b.name));

  const where = department || 'the directory';
  if (professors.length === 0) {
    return {
      type: 'assistant',
      intent: 'roster',
      response: `I couldn't find any verified faculty in ${where}. Try another department, or ask “who's free tomorrow?”.`,
      quickReplies: ["Who's free tomorrow?", 'When does the semester end?'],
      professors: []
    };
  }

  const shown = professors.slice(0, 12);
  const lines = shown.map((prof) => `• ${prof.name}${prof.department ? ` — ${prof.department}` : ''}`);
  const more = professors.length > shown.length ? `\n…and ${professors.length - shown.length} more.` : '';

  return {
    type: 'assistant',
    intent: 'roster',
    response: [
      `I found ${professors.length} verified ${professors.length === 1 ? 'instructor' : 'instructors'} in ${where}:`,
      lines.join('\n') + more
    ].join('\n\n'),
    quickReplies: [
      `Who is free now?`,
      "Who's free tomorrow?",
      "What's the next deadline?",
      "By department"
    ],
    professors
  };
}

module.exports = {
  buildRosterAnswer,
  matchesDepartment
};
