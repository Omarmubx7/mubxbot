'use strict';

/**
 * The assistant brain.
 *
 * Deterministic tools answer directory and calendar questions. An optional
 * OpenAI-compatible model is only consulted for free-form messages that no
 * intent matched, and it is not allowed to invent data.
 */

const calendar = require('../academicCalendar.js');
const intents = require('./intents.js');
const { findAvailableInstructors } = require('../officeHoursAvailability.js');
const { buildAvailabilityAnswer } = require('./availabilityTools.js');
const { buildCalendarAnswer } = require('./calendarTools.js');
const { buildRosterAnswer } = require('./facultyTools.js');
const reply = require('./reply.js');
const llm = require('./llm.js');
const { rememberConversation, recallConversation } = require('./conversationStore.js');

const PRONOUN_PATTERN = /\b(his|her|hers|their|theirs|him|she|he|they)\b/;
const SIMPLE_FOLLOW_UP = /^(and|also|then|same|ok|okay|what about|how about)\s*\??$/;
const NON_AVAILABILITY_FOLLOW_UP = /\b(email|office|department|contact|phone|who are you|what can you do|semester|deadline|week)\b/;

function normalizeMessage(value = '') {
  return intents.normalize(value);
}

function hasPronoun(message = '') {
  return PRONOUN_PATTERN.test(normalizeMessage(message));
}

/**
 * True when a message only makes sense as a follow-up to the professor we just
 * discussed. An explicit new name ("what about Dr Ahmed?") is left alone.
 */
function isProfessorFollowUp(message = '') {
  const q = normalizeMessage(message);
  if (!q) return false;
  if (hasPronoun(q)) return true;
  if (SIMPLE_FOLLOW_UP.test(q)) return true;

  const fieldOnly = q
    .replace(/\b(what|whats|is|are|the|his|her|their|of|for|about|and|also|then|ok|okay|please|tell|me|show|give)\b/g, ' ')
    .replace(/\b(email|e-mail|mail|contact|office|room|location|department|dept|hours|hour|schedule|when|free|available|where)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return q.length <= 28 && fieldOnly.length === 0;
}

function isAvailabilityFollowUp(message = '', now = new Date()) {
  const q = normalizeMessage(message);
  if (!q) return false;
  if (NON_AVAILABILITY_FOLLOW_UP.test(q)) return false;

  const day = intents.parseDay(message, now);
  const timeWindow = intents.parseTimeWindow(message);

  return Boolean(day || timeWindow || SIMPLE_FOLLOW_UP.test(q) || /^(today|tomorrow|now|tonight)\b/.test(q));
}

function mergeAvailabilityIntent(base, previous = {}) {
  return {
    isAvailability: true,
    day: base.day || previous.day || null,
    dayOffset: base.day?.offsetDays ?? previous.dayOffset ?? null,
    weekday: base.day?.weekday ?? previous.weekday ?? null,
    timeWindow: base.timeWindow || previous.timeWindow || null,
    isNow: base.isNow || (!base.day && !base.timeWindow ? Boolean(previous.isNow) : false),
    department: base.department || previous.department || null,
    personName: base.personName || previous.personName || null,
    wantsSchedule: base.wantsSchedule
  };
}

function summarizeAvailabilityContext(intent) {
  return {
    isNow: Boolean(intent?.isNow),
    day: intent?.day || null,
    timeWindow: intent?.timeWindow || null,
    department: intent?.department || null,
    personName: intent?.personName || null
  };
}

function contextForLlm(message, options, snapshot, lastProfessor) {
  return {
    nowLabel: `${snapshot.dateLabel} at ${snapshot.timeLabel} (${snapshot.timeZone})`,
    snapshot,
    lastProfessor,
    history: options.history
  };
}

async function answer(message, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const conversationId = options.conversationId || '';
  const conversation = recallConversation(conversationId) || {};
  const lastProfessor = options.lastProfessor || conversation.lastProfessor || null;
  const snapshot = calendar.getCalendarSnapshot(now);
  const original = String(message || '').trim();

  if (!original) {
    return {
      type: 'assistant',
      intent: 'unknown',
      response: 'Ask me who is free, what week we are in, or for any instructor’s office hours.',
      quickReplies: ["Who's free now?", 'Which week are we in?']
    };
  }

  let workingMessage = original;
  let followUpProfessor = null;

  if (lastProfessor && isProfessorFollowUp(original)) {
    const rewritten = intents.resolveFollowUpQuery(original, lastProfessor);
    if (rewritten) {
      workingMessage = rewritten;
      followUpProfessor = lastProfessor;
    }
  }

  let intent = intents.detectIntent(workingMessage, now);

  // "and tomorrow?" / "what about 2pm?" after an availability answer keeps the
  // same person/department filter.
  if (conversation.lastIntent === 'availability'
    && intent.name !== 'availability'
    && intent.name !== 'faculty'
    && isAvailabilityFollowUp(original, now)) {
    const synthetic = `who is free ${original}`;
    const parsed = intents.parseAvailabilityQuery(synthetic, now);
    if (parsed) {
      intent = {
        name: 'availability',
        confidence: 0.75,
        entities: {
          parts: calendar.getZonedParts(now),
          todayKey: calendar.toDateKey(calendar.getZonedParts(now)),
          availability: mergeAvailabilityIntent(parsed, conversation.lastAvailability || {})
        }
      };
    }
  }

  // "is he free now" after a professor profile.
  if (intent.name === 'availability'
    && lastProfessor
    && !intent.entities.availability?.personName
    && hasPronoun(original)) {
    intent.entities.availability.personName = lastProfessor;
  }

  const entities = intent.entities || {};

  switch (intent.name) {
    case 'greeting':
      rememberConversation(conversationId, { lastIntent: 'greeting' });
      return reply.greetingReply({ now, message: original });

    case 'thanks':
      rememberConversation(conversationId, { lastIntent: 'thanks' });
      return reply.thanksReply({ message: original });

    case 'goodbye':
      rememberConversation(conversationId, { lastIntent: 'goodbye' });
      return reply.goodbyeReply({ message: original });

    case 'identity':
      rememberConversation(conversationId, { lastIntent: 'identity' });
      return reply.identityReply({ message: original });

    case 'capabilities':
      rememberConversation(conversationId, { lastIntent: 'capabilities' });
      return reply.capabilitiesReply();

    case 'time':
    case 'date':
    case 'calendar': {
      const result = buildCalendarAnswer({ message: original, now });
      rememberConversation(conversationId, { lastIntent: 'calendar' });
      return result;
    }

    case 'availability': {
      const raw = await findAvailableInstructors(original, {
        now,
        intent: entities.availability,
        data: options.data,
        newDataNames: options.newDataNames
      });

      if (!raw) break;

      const result = buildAvailabilityAnswer(raw);

      if (result.person?.found && result.person.name) {
        rememberConversation(conversationId, {
          lastIntent: 'availability',
          lastProfessor: result.person.name,
          lastAvailability: summarizeAvailabilityContext(entities.availability)
        });
      } else {
        rememberConversation(conversationId, {
          lastIntent: 'availability',
          lastAvailability: summarizeAvailabilityContext(entities.availability)
        });
      }

      return result;
    }

    case 'roster': {
      const result = await buildRosterAnswer({
        department: entities.department,
        now,
        data: options.data,
        newDataNames: options.newDataNames
      });
      rememberConversation(conversationId, { lastIntent: 'roster' });
      return result;
    }

    case 'faculty': {
      rememberConversation(conversationId, { lastIntent: 'faculty' });
      return {
        type: 'faculty',
        intent: 'faculty',
        query: workingMessage,
        personName: followUpProfessor || entities.personName || null,
        resolvedFrom: followUpProfessor ? lastProfessor : null
      };
    }

    default:
      break;
  }

  if (!options.disableLlm && llm.isLlmEnabled()) {
    const text = await llm.askAssistant({
      message: original,
      history: options.history,
      context: contextForLlm(original, options, snapshot, lastProfessor)
    });

    if (text) {
      rememberConversation(conversationId, { lastIntent: 'llm' });
      return {
        type: 'assistant',
        intent: 'llm',
        response: text,
        quickReplies: ["Who's free now?", 'When does the semester end?', "What's the next deadline?"]
      };
    }
  }

  rememberConversation(conversationId, { lastIntent: 'unknown' });
  return reply.unknownReply({ message: original });
}

module.exports = {
  answer,
  isProfessorFollowUp,
  isAvailabilityFollowUp
};
