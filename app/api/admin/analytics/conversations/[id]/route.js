import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '../../../../../../lib/adminAuth.js';
import { hasAnalyticsDb, safeQuery, withAnalyticsDb } from '../../../../../../lib/adminAnalyticsDb.js';

function unauthorized(req) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value || '';
  return !verifyAdminSessionToken(token);
}

export async function GET(req, ctx) {
  if (unauthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasAnalyticsDb()) {
    return NextResponse.json({ conversation: null, messages: [], searchEvents: [], errorEvents: [], warning: 'Database is not configured' });
  }

  const params = await ctx.params;
  const id = String(params?.id || '');
  if (!id) {
    return NextResponse.json({ error: 'Conversation id is required' }, { status: 400 });
  }

  try {
    const data = await withAnalyticsDb(async (client) => {
      const [convRes, messagesRes, searchRes, errorRes] = await Promise.all([
        safeQuery(
          client,
          `
            SELECT id, user_id, started_at, ended_at, has_smart_search, has_error, success, message_count, meta
            FROM conversations
            WHERE id = $1
            LIMIT 1
          `,
          [id],
          []
        ),
        safeQuery(
          client,
          `
            SELECT id, sender, text, created_at, is_error_trigger, tags
            FROM messages
            WHERE conversation_id = $1
            ORDER BY created_at ASC
          `,
          [id],
          []
        ),
        safeQuery(
          client,
          `
            SELECT id, search_type, query, normalized_name, result_count, success, created_at
            FROM search_events
            WHERE conversation_id = $1
            ORDER BY created_at ASC
          `,
          [id],
          []
        ),
        safeQuery(
          client,
          `
            SELECT id, message_id, error_type, trigger_source, user_text_at_error, bot_reply_snippet, created_at
            FROM error_events
            WHERE conversation_id = $1
            ORDER BY created_at ASC
          `,
          [id],
          []
        )
      ]);

      return {
        conversation: convRes.rows[0] || null,
        messages: messagesRes.rows,
        searchEvents: searchRes.rows,
        errorEvents: errorRes.rows
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load conversation detail', details: error.message },
      { status: 500 }
    );
  }
}
