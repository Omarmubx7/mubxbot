import { NextResponse } from 'next/server';
import { notifyChatIssue } from '../../../lib/notifications';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const payload = await req.json();
    const query = String(payload?.query || payload?.word || '').trim();

    await notifyChatIssue({
      type: String(payload?.type || 'error').trim(),
      query,
      normalizedQuery: String(payload?.normalizedQuery || '').trim(),
      reason: String(payload?.reason || '').trim(),
      conversationId: String(payload?.conversationId || '').trim(),
      userId: String(payload?.userId || '').trim(),
      sourcePath: String(payload?.sourcePath || '').trim(),
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to send notification', details: String(error?.message || error || 'Unknown error') },
      { status: 500 }
    );
  }
}