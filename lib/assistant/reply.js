'use strict';

/**
 * Conversational replies that don't need the directory or calendar engine.
 */

const calendar = require('../academicCalendar.js');

const GREETINGS = [
  "Hey! I'm the MUBX assistant. I can tell you who's free right now, what week we're in, or look up a professor.",
  "Hi there. Ask me who's available now, when the semester ends, or for any instructor's office hours.",
  "Hello! Need a professor's office hours, a free slot today, or a calendar date? I've got you."
];

const NIGHT_GREETINGS = [
  "Hey — it's late. I can still check office hours or the academic calendar for you.",
  "Hi! If you're up studying, I can tell you who's free tomorrow or when the next deadline is."
];

const THANKS = [
  "Anytime. Want me to check who's free next?",
  "You're welcome. I can also look up another instructor or a calendar date.",
  "Glad that helped. Anything else I can check for you?"
];

const GOODBYES = [
  'See you! Good luck with classes.',
  'Bye — come back whenever you need an office hour or a deadline.',
  'Take care. I’ll be here when you need the calendar or the directory.'
];

const IDENTITY = [
  "I'm the MUBX assistant. I read the faculty office-hours directory and the academic calendar, then answer in plain language.",
  "I'm MUBX — a directory and calendar assistant for MUBX students. I can find free instructors, office hours, emails, and academic dates."
];

const CAPABILITIES = [
  [
    'Here are a few things I can do:',
    '• **Availability** — “Who is free now?”, “Who is free tomorrow at 10?”, “Is Dr Mariam free now?”',
    '• **Faculty** — office hours, office, email, and department for any instructor.',
    '• **Calendar** — current teaching week, days left, semester dates, next deadline, and holidays.',
    '• **Follow-ups** — after a professor, you can ask “what is their email?” or “when are they free?”'
  ].join('\n')
];

const UNKNOWN = [
  "I didn't quite catch that. I'm best at office hours and the academic calendar.",
  'Try “who is free now?”, “is Dr Mariam free tomorrow?”, “which week are we in?”, or “when does the semester end?”.'
];

function hash(value = '') {
  let total = 0;
  for (let index = 0; index < value.length; index += 1) {
    total = (total * 31 + value.charCodeAt(index)) % 100000;
  }
  return total;
}

function pick(list, seed = '') {
  return list[hash(seed) % list.length];
}

function greetingReply({ now = new Date(), message = '' } = {}) {
  const parts = calendar.getZonedParts(now);
  const hour = parts.hour;
  const pool = hour < 5 || hour >= 23 ? NIGHT_GREETINGS : GREETINGS;

  return {
    type: 'assistant',
    intent: 'greeting',
    response: pick(pool, `${message}-${calendar.formatClock(now)}`),
    quickReplies: ["Who's free now?", 'Which week are we in?', "What's the next deadline?"]
  };
}

function thanksReply({ message = '' } = {}) {
  return {
    type: 'assistant',
    intent: 'thanks',
    response: pick(THANKS, message),
    quickReplies: ["Who's free tomorrow?", 'When does the semester end?']
  };
}

function goodbyeReply({ message = '' } = {}) {
  return {
    type: 'assistant',
    intent: 'goodbye',
    response: pick(GOODBYES, message),
    quickReplies: []
  };
}

function identityReply({ message = '' } = {}) {
  return {
    type: 'assistant',
    intent: 'identity',
    response: pick(IDENTITY, message),
    quickReplies: ['What can you do?', "Who's free now?"]
  };
}

function capabilitiesReply() {
  return {
    type: 'assistant',
    intent: 'capabilities',
    response: CAPABILITIES[0],
    quickReplies: ["Who's free now?", 'Which week are we in?', "What's the next deadline?"]
  };
}

function unknownReply({ message = '' } = {}) {
  return {
    type: 'assistant',
    intent: 'unknown',
    response: `${pick(UNKNOWN, message)}\n\nAsk me things like “who's free tomorrow?”, “is Dr Mariam free now?”, or “when does the semester end?”.`,
    quickReplies: ["Who's free now?", 'When does the semester end?', "What's the next deadline?"]
  };
}

module.exports = {
  greetingReply,
  thanksReply,
  goodbyeReply,
  identityReply,
  capabilitiesReply,
  unknownReply,
  pick
};
