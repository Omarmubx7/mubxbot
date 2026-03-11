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
import { chatMetricsStore as chatMetrics, pendingDisambiguationsStore as pendingDisambiguations } from '../../../lib/chatMetricsStore.js';

const DISAMBIGUATION_TTL_MS = 5 * 60 * 1000;
const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';
const { Client } = pg;

async function withDb(fn) {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
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
      userId
    } = await req.json();

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

    // Search for relevant office hours data
    const query = effectiveMessage.toLowerCase();
    
    // Check if the user is asking for professor information (schedule/contact/department)
    const isOfficeHoursQuery =
      query.includes('office') ||
      query.includes('hours') ||
      query.includes('meet') ||
      query.includes('available') ||
      query.includes('when') ||
      query.includes('schedule') ||
      query.includes('email') ||
      query.includes('contact') ||
      query.includes('department') ||
      query.includes('dr ') ||
      query.includes('eng ') ||
      query.split(' ').length <= 4;

    const context = extractQueryContext(effectiveMessage);
    const results = await searchOfficeHours(effectiveMessage);

    // Deterministic structured responses.
    if (results.length > 0) {
      // Single result - generate smart response
      if (results.length === 1) {
        const smartResponse = generateSmartResponse(results[0], effectiveMessage);
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
      const allProfessors = await getAllOfficeHours();
      const subject = extractQuerySubject(effectiveMessage) || effectiveMessage.trim();
      const requestLabel = getIntentLabel(context);

      const summary = suggestions.length > 0
        ? `I couldn't find an exact faculty match for "${subject}", so I can't confirm the ${requestLabel} yet.`
        : `I couldn't find a faculty match for "${subject}" in the current dataset, so I can't confirm the ${requestLabel}.`;

      const guidance = suggestions.length > 0
        ? 'I could not find an exact match, but I found similar names you can select.'
        : `I could not find a matching professor name in the current dataset of ${allProfessors.length} members.`;

      const hints = suggestions.length > 0
        ? [
            'Pick one of the suggested names below.',
            'Or type the full name as it appears in university records.'
          ]
        : [
            'Try typing part of the email (example: murad.yaghi).',
            'Try a shorter or alternate spelling of the name (example: Ahmad/Ahmed).',
            'Use "By department" to browse all available records.'
          ];

      return sendStructuredResponse({
        type: 'no_results',
        message: effectiveMessage,
        summary,
        requestLabel,
        subject,
        context,
        guidance,
        hints,
        datasetCount: allProfessors.length,
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
