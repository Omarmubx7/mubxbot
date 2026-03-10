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

const DISAMBIGUATION_TTL_MS = 5 * 60 * 1000;
const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';
const { Client } = pg;
const pendingDisambiguations = new Map();
const chatMetrics = {
  totalRequests: 0,
  smartResponses: 0,
  disambiguationsIssued: 0,
  disambiguationsResolved: 0,
  disambiguationsExpired: 0,
  noResults: 0,
  helpResponses: 0,
  errors: 0
};

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

export async function POST(req) {
  try {
    chatMetrics.totalRequests += 1;
    cleanupExpiredDisambiguations();
    let disambiguationResolvedInRequest = false;

    const {
      message,
      disambiguationToken,
      selectedProfessor
    } = await req.json();

    const hasMessage = message && message.trim().length > 0;
    const hasResolutionSelection = disambiguationToken && selectedProfessor;

    if (!hasMessage && !hasResolutionSelection) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    let effectiveMessage = hasMessage ? message : '';
    if (hasResolutionSelection) {
      const storedContext = consumeDisambiguationContext(disambiguationToken);
      if (!storedContext) {
        chatMetrics.disambiguationsExpired += 1;
        await logChatRequest({ outcome: 'expired_disambiguation', disambiguationExpired: true });
        return NextResponse.json({
          type: 'expired_disambiguation',
          message: 'That selection has expired. Please ask your question again.',
          timestamp: new Date().toISOString()
        });
      }

      chatMetrics.disambiguationsResolved += 1;
      disambiguationResolvedInRequest = true;

      effectiveMessage = buildContextualQuery(selectedProfessor, storedContext);
    }

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
        
        return NextResponse.json({
          type: 'smart_response',
          response: smartResponse,
          results: results,
          count: 1,
          context: context,
          timestamp: new Date().toISOString(),
          model: 'smart_structured'
        });
      }
      
      // Multiple results - check if it's a simple name search
      if (isSimpleNameSearch(effectiveMessage) && results.length > 1 && results.length <= 10) {
        // User typed a simple name (like "razan") - ask which one they want
        const disambiguation = generateDisambiguationMessage(effectiveMessage, results);
        const disambiguationToken = storeDisambiguationContext(context);
        chatMetrics.disambiguationsIssued += 1;
        await logChatRequest({ outcome: 'disambiguation', disambiguationIssued: true, disambiguationResolved: disambiguationResolvedInRequest });
        
        return NextResponse.json({
          type: 'disambiguation',
          message: disambiguation.message,
          options: disambiguation.options,
          context: context,
          disambiguationToken,
          count: results.length,
          timestamp: new Date().toISOString(),
          model: 'smart_structured'
        });
      }

      // If user asked for a specific field (email/office/hours) but multiple similar names match,
      // force disambiguation so we return the exact requested person's answer next.
      if ((context.wantsEmail || context.wantsOffice || context.wantsHours || context.wantsDepartment) && results.length > 1 && results.length <= 10) {
        const disambiguation = generateDisambiguationMessage(effectiveMessage, results);
        const disambiguationToken = storeDisambiguationContext(context);
        chatMetrics.disambiguationsIssued += 1;
        await logChatRequest({ outcome: 'disambiguation', disambiguationIssued: true, disambiguationResolved: disambiguationResolvedInRequest });

        return NextResponse.json({
          type: 'disambiguation',
          message: disambiguation.message,
          options: disambiguation.options,
          context: context,
          disambiguationToken,
          count: results.length,
          timestamp: new Date().toISOString(),
          model: 'smart_structured'
        });
      }
      
      // Multiple results with full query - return for frontend to display as list
      await logChatRequest({ outcome: 'office_hours', disambiguationResolved: disambiguationResolvedInRequest });
      return NextResponse.json({
        type: 'office_hours',
        results: results,
        count: results.length,
        context: context,
        timestamp: new Date().toISOString(),
        model: 'structured'
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

      return NextResponse.json({
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
      });
    } else {
      chatMetrics.helpResponses += 1;
      await logChatRequest({ outcome: 'help', disambiguationResolved: disambiguationResolvedInRequest });
      return NextResponse.json({
        type: 'help',
        timestamp: new Date().toISOString()
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
    return NextResponse.json(
      { error: 'Failed to fetch office hours' },
      { status: 500 }
    );
  }
}
