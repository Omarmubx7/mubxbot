import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import pg from 'pg';
import { 
  searchOfficeHours, 
  suggestClosestProfessors,
  getAllOfficeHours, 
  extractQueryContext, 
  extractQuerySubject,
  buildContextualQuery,
  generateSmartResponse,
  isSimpleNameSearch,
  generateDisambiguationMessage 
} from '../../../lib/getOfficeHours.js';
import { findAvailableInstructors } from '../../../lib/officeHoursAvailability.js';
import { answer as answerAssistant } from '../../../lib/assistant/index.js';
import { rememberConversation } from '../../../lib/assistant/conversationStore.js';
import { chatMetricsStore as chatMetrics, pendingDisambiguationsStore as pendingDisambiguations } from '../../../lib/chatMetricsStore.js';
import { upsertSearch } from '../../../lib/missingNameMetrics.js';
import { isUnderTakeover } from '../../../lib/liveSessions.js';

const HOT_SEARCH_THRESHOLD = Number(process.env.MISSING_NAME_HOT_THRESHOLD || 3);

const DISAMBIGUATION_TTL_MS = 5 * 60 * 1000;
const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';
const { Client } = pg;

async function withDb(fn) {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: (process.env.PGSSL_MODE === 'disable' ? false : { rejectUnauthorized: true, ...(process.env.SSL_ROOT_CERT ? { ca: process.env.SSL_ROOT_CERT } : {}) })
  });

  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function logChatRequest({
  outcome,
  disambiguationIssued = false,
  disambiguationResolved = false,
  disambiguationExpired = false
}) {
  if (!DATABASE_URL) return;

  await withDb(async (client) => {
    await client.query(
      `
        INSERT INTO chat_request_logs (
          outcome,
          disambiguation_issued,
          disambiguation_resolved,
          disambiguation_expired
        ) VALUES ($1, $2, $3, $4)
      `,
      [outcome, disambiguationIssued, disambiguationResolved, disambiguationExpired]
    );
  });
}

async function getPersistedMetrics() {
  if (!DATABASE_URL) return null;

  return withDb(async (client) => {
    const result = await client.query(
      `
        SELECT
          COUNT(*)::int AS total_requests,
          COUNT(*) FILTER (WHERE outcome = 'smart_response')::int AS smart_responses,
          COUNT(*) FILTER (WHERE outcome = 'no_results')::int AS no_results,
          COUNT(*) FILTER (WHERE outcome = 'help')::int AS help_responses,
          COUNT(*) FILTER (WHERE outcome = 'error')::int AS errors,
          COUNT(*) FILTER (WHERE disambiguation_issued = true)::int AS disambiguations_issued,
          COUNT(*) FILTER (WHERE disambiguation_resolved = true)::int AS disambiguations_resolved,
          COUNT(*) FILTER (WHERE disambiguation_expired = true)::int AS disambiguations_expired
        FROM chat_request_logs
      `
    );

    const row = result.rows[0] || {};
    return {
      totalRequests: row.total_requests || 0,
      smartResponses: row.smart_responses || 0,
      disambiguationsIssued: row.disambiguations_issued || 0,
      disambiguationsResolved: row.disambiguations_resolved || 0,
      disambiguationsExpired: row.disambiguations_expired || 0,
      noResults: row.no_results || 0,
      helpResponses: row.help_responses || 0,
      errors: row.errors || 0,
      pendingDisambiguations: pendingDisambiguations.size
    };
  });
}

function cleanupExpiredDisambiguations() {
  const now = Date.now();
  for (const [token, value] of pendingDisambiguations.entries()) {
    if ((now - value.createdAt) > DISAMBIGUATION_TTL_MS) {
      pendingDisambiguations.delete(token);
    }
  }
}

function storeDisambiguationContext(context) {
  const token = crypto.randomUUID();
  pendingDisambiguations.set(token, {
    context,
    createdAt: Date.now()
  });
  return token;
}

function consumeDisambiguationContext(token) {
  const entry = pendingDisambiguations.get(token);
  if (!entry) return null;

  pendingDisambiguations.delete(token);

  const isExpired = (Date.now() - entry.createdAt) > DISAMBIGUATION_TTL_MS;
  if (isExpired) return null;

  return entry.context;
}

function getIntentLabel(context) {
  switch (context?.answerType) {
    case 'email':
      return 'email address';
    case 'office':
      return 'office location';
    case 'department':
      return 'department';
    case 'hours':
      return context?.specificDay ? `${context.specificDay} availability` : 'office hours';
    default:
      return 'faculty details';
  }
}

function formatPersonSubject(value = '') {
  const text = String(value || '').trim();
  if (!text) return '';
  // Keep emails, room codes and mixed tokens untouched; title-case plain names.
  if (!/^[a-z][a-z .'-]*$/i.test(text)) return text;
  return text.replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

async function ensureConversation({ conversationId, userId, environment = 'prod' }) {
  if (!DATABASE_URL || !conversationId) return;

  await withDb(async (client) => {
    await client.query(
      `
        INSERT INTO conversations (id, user_id, started_at, environment)
        VALUES ($1, $2, NOW(), $3)
        ON CONFLICT (id)
        DO UPDATE SET
          user_id = COALESCE(conversations.user_id, EXCLUDED.user_id)
      `,
      [conversationId, userId || null, environment]
    );
  });
}

async function logMessageEvent({ id, conversationId, sender, text, isErrorTrigger = false, tags = {} }) {
  if (!DATABASE_URL || !conversationId || !id || !sender) return;

  await withDb(async (client) => {
    await client.query(
      `
        INSERT INTO messages (id, conversation_id, sender, text, is_error_trigger, tags)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      `,
      [id, conversationId, sender, String(text || ''), isErrorTrigger, JSON.stringify(tags || {})]
    );
  });
}

async function logSearchEvent({
  conversationId,
  userId,
  searchType,
  query,
  normalizedName,
  resultCount,
  success,
  environment = 'prod'
}) {
  if (!DATABASE_URL || !conversationId || !searchType || !query) return;

  await withDb(async (client) => {
    await client.query(
      `
        INSERT INTO search_events (
          id, conversation_id, user_id, search_type, query, normalized_name, result_count, success, environment
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        crypto.randomUUID(),
        conversationId,
        userId || null,
        searchType,
        String(query || ''),
        normalizedName || null,
        Number(resultCount || 0),
        Boolean(success),
        environment
      ]
    );
  });
}

async function logErrorEvent({
  conversationId,
  messageId,
  userId,
  errorType,
  triggerSource = 'auto_detection',
  userTextAtError,
  botReplySnippet,
  environment = 'prod'
}) {
  if (!DATABASE_URL || !conversationId || !errorType) return;

  await withDb(async (client) => {
    await client.query(
      `
        INSERT INTO error_events (
          id,
          conversation_id,
          message_id,
          user_id,
          error_type,
          trigger_source,
          user_text_at_error,
          bot_reply_snippet,
          environment
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        crypto.randomUUID(),
        conversationId,
        messageId || null,
        userId || null,
        errorType,
        triggerSource,
        userTextAtError || null,
        botReplySnippet || null,
        environment
      ]
    );
  });
}

async function logPerformanceEvent({
  conversationId,
  messageId,
  totalLatencyMs,
  modelLatencyMs,
  environment = 'prod'
}) {
  if (!DATABASE_URL || !conversationId) return;

  await withDb(async (client) => {
    await client.query(
      `
        INSERT INTO performance_events (
          id, conversation_id, message_id, model_latency_ms, total_latency_ms, environment
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        crypto.randomUUID(),
        conversationId,
        messageId || null,
        Number(modelLatencyMs || totalLatencyMs || 0),
        Number(totalLatencyMs || 0),
        environment
      ]
    );
  });
}

async function updateConversationAggregate({
  conversationId,
  incrementMessages = 0,
  hasSmartSearch = false,
  hasError = false,
  success = null
}) {
  if (!DATABASE_URL || !conversationId) return;

  await withDb(async (client) => {
    await client.query(
      `
        UPDATE conversations
        SET
          ended_at = NOW(),
          message_count = message_count + $2,
          has_smart_search = has_smart_search OR $3,
          has_error = has_error OR $4,
          success = COALESCE($5, success)
        WHERE id = $1
      `,
      [conversationId, Number(incrementMessages || 0), Boolean(hasSmartSearch), Boolean(hasError), success]
    );
  });
}

export async function POST(req) {
  try {
    const requestStartedAt = Date.now();
    const environment = process.env.NODE_ENV === 'production' ? 'prod' : 'staging';
    chatMetrics.totalRequests += 1;
    cleanupExpiredDisambiguations();
    let disambiguationResolvedInRequest = false;

    const {
      message,
      disambiguationToken,
      selectedProfessor,
      conversationId,
      userId,
      history,
      lastProfessor
    } = await req.json();

    const assistantHistory = Array.isArray(history)
      ? history
        .filter((item) => item && typeof item.text === 'string' && item.text.trim())
        .slice(-8)
        .map((item) => ({
          role: item.role === 'user' ? 'user' : 'assistant',
          text: String(item.text).slice(0, 800)
        }))
      : [];

    const assistantLastProfessor = typeof lastProfessor === 'string' && lastProfessor.trim()
      ? lastProfessor.trim()
      : null;

    const analyticsConversationId = String(conversationId || crypto.randomUUID());
    const analyticsUserId = userId ? String(userId) : null;

    const hasMessage = message && message.trim().length > 0;
    const hasResolutionSelection = disambiguationToken && selectedProfessor;

    if (!hasMessage && !hasResolutionSelection) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    await ensureConversation({
      conversationId: analyticsConversationId,
      userId: analyticsUserId,
      environment
    }).catch(() => {});

    // Admin operator takeover: while a live session is under takeover, pause
    // automatic bot replies so the operator's messages are the only answers.
    // The user's message is still logged and they get a short holding reply.
    if (hasMessage && await isUnderTakeover(analyticsConversationId).catch(() => false)) {
      const holdUserMessageId = crypto.randomUUID();
      await logMessageEvent({
        id: holdUserMessageId,
        conversationId: analyticsConversationId,
        sender: 'user',
        text: message,
        tags: { underOperatorTakeover: true }
      }).catch(() => {});

      const holdBotMessageId = crypto.randomUUID();
      const holdText = 'One moment — checking that for you.';
      await logMessageEvent({
        id: holdBotMessageId,
        conversationId: analyticsConversationId,
        sender: 'bot',
        text: holdText,
        tags: { type: 'operator_hold' }
      }).catch(() => {});

      await updateConversationAggregate({
        conversationId: analyticsConversationId,
        incrementMessages: 2,
        success: true
      }).catch(() => {});

      return NextResponse.json({
        type: 'ai_response',
        response: holdText,
        conversationId: analyticsConversationId,
        operatorTakeover: true
      });
    }

    let effectiveMessage = hasMessage ? message : '';
    let normalizedNameForSearch = null;
    if (hasResolutionSelection) {
      const storedContext = consumeDisambiguationContext(disambiguationToken);
      if (!storedContext) {
        chatMetrics.disambiguationsExpired += 1;
        await logChatRequest({ outcome: 'expired_disambiguation', disambiguationExpired: true });
        const expiredBotId = crypto.randomUUID();
        await logMessageEvent({
          id: expiredBotId,
          conversationId: analyticsConversationId,
          sender: 'bot',
          text: 'That selection has expired. Please ask your question again.',
          tags: { type: 'expired_disambiguation' }
        }).catch(() => {});
        await logErrorEvent({
          conversationId: analyticsConversationId,
          messageId: expiredBotId,
          userId: analyticsUserId,
          errorType: 'expired_disambiguation',
          userTextAtError: String(message || selectedProfessor || ''),
          botReplySnippet: 'That selection has expired. Please ask your question again.',
          environment
        }).catch(() => {});
        await updateConversationAggregate({
          conversationId: analyticsConversationId,
          incrementMessages: 1,
          hasError: true,
          success: false
        }).catch(() => {});
        await logPerformanceEvent({
          conversationId: analyticsConversationId,
          messageId: expiredBotId,
          totalLatencyMs: Date.now() - requestStartedAt,
          environment
        }).catch(() => {});

        return NextResponse.json({
          type: 'expired_disambiguation',
          message: 'That selection has expired. Please ask your question again.',
          timestamp: new Date().toISOString(),
          conversationId: analyticsConversationId
        });
      }

      chatMetrics.disambiguationsResolved += 1;
      disambiguationResolvedInRequest = true;
      normalizedNameForSearch = String(selectedProfessor || '').trim().toLowerCase() || null;

      effectiveMessage = buildContextualQuery(selectedProfessor, storedContext);
    }

    const userMessageId = crypto.randomUUID();
    await logMessageEvent({
      id: userMessageId,
      conversationId: analyticsConversationId,
      sender: 'user',
      text: effectiveMessage,
      tags: { hasResolutionSelection: Boolean(hasResolutionSelection) }
    }).catch(() => {});

    const sendStructuredResponse = async (payload, options = {}) => {
      const botMessageId = crypto.randomUUID();
      const botText = String(
        options.botText
          || payload.response
          || payload.summary
          || payload.message
          || payload.type
      );

      await logMessageEvent({
        id: botMessageId,
        conversationId: analyticsConversationId,
        sender: 'bot',
        text: botText,
        isErrorTrigger: Boolean(options.isErrorMessage),
        tags: { type: payload.type || options.type || 'unknown' }
      }).catch(() => {});

      if (options.searchType) {
        await logSearchEvent({
          conversationId: analyticsConversationId,
          userId: analyticsUserId,
          searchType: options.searchType,
          query: effectiveMessage,
          normalizedName: options.normalizedName || normalizedNameForSearch,
          resultCount: options.resultCount,
          success: options.searchSuccess,
          environment
        }).catch(() => {});
      }

      if (options.errorType) {
        await logErrorEvent({
          conversationId: analyticsConversationId,
          messageId: botMessageId,
          userId: analyticsUserId,
          errorType: options.errorType,
          userTextAtError: effectiveMessage,
          botReplySnippet: botText,
          environment
        }).catch(() => {});
      }

      await updateConversationAggregate({
        conversationId: analyticsConversationId,
        incrementMessages: 2,
        hasSmartSearch: Boolean(options.hasSmartSearch),
        hasError: Boolean(options.errorType),
        success: options.success
      }).catch(() => {});

      await logPerformanceEvent({
        conversationId: analyticsConversationId,
        messageId: botMessageId,
        totalLatencyMs: Date.now() - requestStartedAt,
        environment
      }).catch(() => {});

      return NextResponse.json({
        ...payload,
        conversationId: analyticsConversationId
      });
    };

    // The assistant brain handles greetings, time/calendar questions, and
    // availability before the legacy faculty-search path. When it recognises a
    // faculty lookup it returns a rewritten query (useful for "what is her
    // email?") and we fall through to the existing search + disambiguation flow.
    let assistantResult = null;
    try {
      assistantResult = await answerAssistant(effectiveMessage, {
        now: new Date(),
        conversationId: analyticsConversationId,
        history: assistantHistory,
        lastProfessor: assistantLastProfessor
      });
    } catch (error) {
      console.error('Assistant brain failed, falling back to legacy search:', error);
    }

    const assistantFacultyLookup = assistantResult?.type === 'faculty';
    const assistantPersonName = assistantFacultyLookup
      ? String(assistantResult.personName || '').trim()
      : '';

    if (assistantFacultyLookup) {
      if (assistantResult.query) effectiveMessage = assistantResult.query;
      if (assistantPersonName) {
        rememberConversation(analyticsConversationId, { lastProfessor: assistantPersonName });
      }
    } else if (assistantResult) {
      const informationalTypes = new Set(['availability', 'calendar']);
      const isInformational = informationalTypes.has(assistantResult.type)
        || (assistantResult.type === 'assistant' && assistantResult.intent === 'roster')
        || (assistantResult.type === 'assistant' && assistantResult.intent === 'llm');
      const resultCount = Number(
        assistantResult.count
        ?? assistantResult.professors?.length
        ?? assistantResult.results?.length
        ?? 0
      );

      if (isInformational) {
        chatMetrics.smartResponses += 1;
        await logChatRequest({
          outcome: 'smart_response',
          disambiguationResolved: disambiguationResolvedInRequest
        });
      } else {
        chatMetrics.helpResponses += 1;
        await logChatRequest({
          outcome: 'help',
          disambiguationResolved: disambiguationResolvedInRequest
        });
      }

      return sendStructuredResponse({
        ...assistantResult,
        timestamp: new Date().toISOString()
      }, {
        searchType: isInformational ? 'smart' : 'other',
        normalizedName: assistantResult.person?.name
          ? String(assistantResult.person.name).trim().toLowerCase()
          : null,
        resultCount,
        searchSuccess: true,
        hasSmartSearch: isInformational,
        success: true,
        botText: assistantResult.response
      });
    }

    // Search for relevant office hours data
    const query = effectiveMessage.toLowerCase();

    // Legacy availability fallback: only reached if the assistant brain failed
    // before handling the request.
    const availabilityResult = await findAvailableInstructors(effectiveMessage).catch(() => null);
    if (availabilityResult) {
      chatMetrics.smartResponses += 1;
      await logChatRequest({ outcome: 'smart_response', disambiguationResolved: disambiguationResolvedInRequest });
      return sendStructuredResponse({
        ...availabilityResult,
        timestamp: new Date().toISOString()
      }, {
        searchType: 'smart',
        normalizedName: null,
        resultCount: availabilityResult.count || 0,
        searchSuccess: (availabilityResult.count || 0) > 0,
        hasSmartSearch: true,
        success: (availabilityResult.count || 0) > 0,
        botText: availabilityResult.count > 0
          ? `Found ${availabilityResult.count} scheduled available instructor(s) for ${availabilityResult.targetLabel}.`
          : `No verified instructors are scheduled available for ${availabilityResult.targetLabel}.`
      });
    }
    
    // Check if the user is asking for professor information (schedule/contact/department)
    const isOfficeHoursQuery =
      assistantFacultyLookup ||
      query.includes('office') ||
      query.includes('hours') ||
      query.includes('meet') ||
      query.includes('available') ||
      query.includes('when') ||
      query.includes('schedule') ||
      query.includes('email') ||
      query.includes('contact') ||
      query.includes('department') ||
      /\b(dr|doctor|prof|professor|instructor|lecturer|faculty|teacher|named|called)\b/.test(query) ||
      query.split(' ').length <= 4;

    const context = extractQueryContext(effectiveMessage);
    const results = await searchOfficeHours(effectiveMessage);

    // Deterministic structured responses.
    if (results.length > 0) {
      // Single result - generate smart response
      if (results.length === 1) {
        const smartResponse = generateSmartResponse(results[0], effectiveMessage);
        const resolvedProfessorName = String(results[0]?.professor || results[0]?.name || '').trim();
        if (resolvedProfessorName) {
          rememberConversation(analyticsConversationId, {
            lastProfessor: resolvedProfessorName,
            lastIntent: 'faculty'
          });
        }
        chatMetrics.smartResponses += 1;
        await logChatRequest({ outcome: 'smart_response', disambiguationResolved: disambiguationResolvedInRequest });
        
        return sendStructuredResponse({
          type: 'smart_response',
          response: smartResponse,
          results: results,
          count: 1,
          context: context,
          timestamp: new Date().toISOString(),
          model: 'smart_structured'
        }, {
          searchType: isSimpleNameSearch(effectiveMessage) ? 'name' : 'smart',
          normalizedName: String(results[0]?.professor || results[0]?.name || '').trim().toLowerCase() || null,
          resultCount: 1,
          searchSuccess: true,
          hasSmartSearch: true,
          success: true,
          botText: smartResponse
        });
      }
      
      // Multiple results - check if it's a simple name search
      if (isSimpleNameSearch(effectiveMessage) && results.length > 1 && results.length <= 10) {
        // User typed a simple name (like "razan") - ask which one they want
        const disambiguation = generateDisambiguationMessage(effectiveMessage, results);
        const disambiguationToken = storeDisambiguationContext(context);
        chatMetrics.disambiguationsIssued += 1;
        await logChatRequest({ outcome: 'disambiguation', disambiguationIssued: true, disambiguationResolved: disambiguationResolvedInRequest });
        
        return sendStructuredResponse({
          type: 'disambiguation',
          message: disambiguation.message,
          options: disambiguation.options,
          context: context,
          disambiguationToken,
          count: results.length,
          timestamp: new Date().toISOString(),
          model: 'smart_structured'
        }, {
          searchType: 'name',
          normalizedName: String(effectiveMessage || '').trim().toLowerCase() || null,
          resultCount: results.length,
          searchSuccess: false,
          hasSmartSearch: true,
          success: null,
          botText: disambiguation.message
        });
      }

      // If user asked for a specific field (email/office/hours) but multiple similar names match,
      // force disambiguation so we return the exact requested person's answer next.
      if ((context.wantsEmail || context.wantsOffice || context.wantsHours || context.wantsDepartment) && results.length > 1 && results.length <= 10) {
        const disambiguation = generateDisambiguationMessage(effectiveMessage, results);
        const disambiguationToken = storeDisambiguationContext(context);
        chatMetrics.disambiguationsIssued += 1;
        await logChatRequest({ outcome: 'disambiguation', disambiguationIssued: true, disambiguationResolved: disambiguationResolvedInRequest });

        return sendStructuredResponse({
          type: 'disambiguation',
          message: disambiguation.message,
          options: disambiguation.options,
          context: context,
          disambiguationToken,
          count: results.length,
          timestamp: new Date().toISOString(),
          model: 'smart_structured'
        }, {
          searchType: 'smart',
          normalizedName: String(effectiveMessage || '').trim().toLowerCase() || null,
          resultCount: results.length,
          searchSuccess: false,
          hasSmartSearch: true,
          success: null,
          botText: disambiguation.message
        });
      }
      
      // Multiple results with full query - return for frontend to display as list
      await logChatRequest({ outcome: 'office_hours', disambiguationResolved: disambiguationResolvedInRequest });
      return sendStructuredResponse({
        type: 'office_hours',
        results: results,
        count: results.length,
        context: context,
        timestamp: new Date().toISOString(),
        model: 'structured'
      }, {
        searchType: isSimpleNameSearch(effectiveMessage) ? 'name' : 'other',
        normalizedName: String(effectiveMessage || '').trim().toLowerCase() || null,
        resultCount: results.length,
        searchSuccess: results.length > 0,
        hasSmartSearch: false,
        success: true,
        botText: `Found ${results.length} matching result(s)`
      });
    } else if (isOfficeHoursQuery) {
      chatMetrics.noResults += 1;
      await logChatRequest({ outcome: 'no_results', disambiguationResolved: disambiguationResolvedInRequest });
      const suggestions = await suggestClosestProfessors(effectiveMessage, 5);
      const subject = formatPersonSubject(
        assistantPersonName || extractQuerySubject(effectiveMessage) || effectiveMessage.trim()
      );
      const requestLabel = getIntentLabel(context);
      const lookupContext = `${subject} ${effectiveMessage}`;
      const mentionsEngineering = /\b(engineering|engineer)\b/i.test(lookupContext);

      const scopeNote = mentionsEngineering
        ? 'MUBXBot only supports the School of Computing. Engineering, Medicine, Business, and other schools are outside this directory. If this person also teaches in Computing, you can add them here.'
        : 'MUBXBot only covers the School of Computing — Computer Science, Cybersecurity, AI & Data Science, and Information Technology. If this person teaches in Computing, they may just be missing.';

      const summary = suggestions.length > 0
        ? `I couldn't find an exact match for "${subject}" in the School of Computing directory.`
        : `I couldn't find "${subject}" in the School of Computing directory.`;

      const guidance = scopeNote;

      const hints = suggestions.length > 0
        ? [
            'Pick a close match below, or add the correct person.'
          ]
        : [
            'Try a shorter or alternate spelling, or the email prefix (example: murad.yaghi).'
          ];

      let missingNameStats = null;
      try {
        const record = await upsertSearch(subject);
        if (record) {
          missingNameStats = {
            searchCount: record.search_count || 0,
            reportCount: record.report_count || 0,
            isHot: (record.search_count || 0) >= HOT_SEARCH_THRESHOLD,
            searchThreshold: HOT_SEARCH_THRESHOLD
          };
        }
      } catch (e) {
        // metrics are best-effort; never block the response
      }

      const requestCount = missingNameStats ? missingNameStats.searchCount : 0;
      const requesterLine = requestCount > 1
        ? `${requestCount} people have looked this up recently — we'd love your help filling it in.`
        : 'If this person teaches in Computing, adding their details helps the next student.';

      return sendStructuredResponse({
        type: 'no_results',
        message: subject,
        summary,
        requestLabel,
        subject,
        context,
        guidance,
        scopeNote,
        hints,
        requesterLine,
        missingNameStats,
        suggestions: suggestions.map(item => ({
          professor: item.professor,
          name: item.name,
          department: item.department,
          email: item.email,
          office: item.office
        })),
        timestamp: new Date().toISOString()
      }, {
        searchType: isSimpleNameSearch(effectiveMessage) ? 'name' : 'other',
        normalizedName: String(effectiveMessage || '').trim().toLowerCase() || null,
        resultCount: 0,
        searchSuccess: false,
        hasSmartSearch: false,
        errorType: 'no_results',
        success: false,
        isErrorMessage: true,
        botText: summary
      });
    } else {
      chatMetrics.helpResponses += 1;
      await logChatRequest({ outcome: 'help', disambiguationResolved: disambiguationResolvedInRequest });
      return sendStructuredResponse({
        type: 'help',
        timestamp: new Date().toISOString()
      }, {
        searchType: 'other',
        normalizedName: null,
        resultCount: 0,
        searchSuccess: false,
        hasSmartSearch: false,
        success: true,
        botText: 'Help response'
      });
    }

  } catch (error) {
    chatMetrics.errors += 1;
    console.error('Chat API error:', error);
    await logChatRequest({ outcome: 'error' }).catch(() => {});
    return NextResponse.json(
      { error: 'Failed to process message', details: error.message },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to retrieve all office hours
export async function GET() {
  try {
    cleanupExpiredDisambiguations();
    const allData = await getAllOfficeHours();

    const persistedMetrics = await getPersistedMetrics().catch(() => null);
    const effectiveMetrics = persistedMetrics || {
      ...chatMetrics,
      pendingDisambiguations: pendingDisambiguations.size
    };

    return NextResponse.json({
      count: allData.length,
      professors: allData.map(d => d.professor),
      lastUpdated: allData[0]?.lastUpdated || null,
      metrics: effectiveMetrics
    });
  } catch (error) {
    console.error('Chat GET failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch office hours' },
      { status: 500 }
    );
  }
}
