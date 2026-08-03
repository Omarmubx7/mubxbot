import { NextResponse } from 'next/server';
import { notifyChatIssue } from '../../../lib/notifications';

export const runtime = 'nodejs';

const NOTIFY_LIMIT_PER_WINDOW = 5;
const NOTIFY_WINDOW_MS = 15 * 60 * 1000;
const ipHits = new Map();

function clientIp(req) {
  const fwd = req.headers.get('x-forwarded-for') || '';
  return fwd.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

function rateLimit(req) {
  const ip = clientIp(req);
  const now = Date.now();
  const windowStart = now - NOTIFY_WINDOW_MS;
  const hits = (ipHits.get(ip) || []).filter(t => t > windowStart);
  ipHits.set(ip, hits);
  if (hits.length >= NOTIFY_LIMIT_PER_WINDOW) return true;
  ipHits.set(ip, [...hits, now]);
  return false;
}

function sanitizeLine(value = '') {
  return String(value || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 500);
}

export async function POST(req) {
  try {
    if (rateLimit(req)) {
      return NextResponse.json(
        { error: 'Too many notifications. Please try again later.' },
        { status: 429 }
      );
    }

    const payload = await req.json();

    if (typeof payload?._hp === 'string' && payload._hp.length > 0) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const query = sanitizeLine(payload?.query || payload?.word || '');

    await notifyChatIssue({
      type: sanitizeLine(payload?.type || 'error') || 'error',
      query,
      normalizedQuery: sanitizeLine(payload?.normalizedQuery || ''),
      reason: sanitizeLine(payload?.reason || ''),
      conversationId: sanitizeLine(payload?.conversationId || ''),
      userId: sanitizeLine(payload?.userId || ''),
      sourcePath: sanitizeLine(payload?.sourcePath || ''),
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.warn('Failed to send notification', error?.message || error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}