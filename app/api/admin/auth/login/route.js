import { NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminSessionCookieOptions,
  verifyAdminPassword
} from '../../../../../lib/adminAuth.js';

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 5;
const loginAttempts = new Map();

function getClientIp(req) {
  const xForwardedFor = req.headers.get('x-forwarded-for') || '';
  const firstForwarded = xForwardedFor.split(',')[0]?.trim();
  if (firstForwarded) return firstForwarded;

  const realIp = req.headers.get('x-real-ip') || '';
  if (realIp) return realIp;

  return 'unknown';
}

function cleanupAttempts(now) {
  for (const [key, value] of loginAttempts.entries()) {
    const expiredWindow = (now - value.firstAttemptAt) > RATE_LIMIT_WINDOW_MS;
    const blockCleared = !value.blockedUntil || now > value.blockedUntil;
    if (expiredWindow && blockCleared) {
      loginAttempts.delete(key);
    }
  }
}

function getRateLimitState(clientIp, now) {
  cleanupAttempts(now);

  const current = loginAttempts.get(clientIp);
  if (!current) {
    return {
      blocked: false,
      attempts: 0
    };
  }

  if (current.blockedUntil && now < current.blockedUntil) {
    return {
      blocked: true,
      retryAfterSeconds: Math.max(1, Math.ceil((current.blockedUntil - now) / 1000))
    };
  }

  if ((now - current.firstAttemptAt) > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.delete(clientIp);
    return {
      blocked: false,
      attempts: 0
    };
  }

  return {
    blocked: false,
    attempts: current.attempts
  };
}

function recordFailedAttempt(clientIp, now) {
  const current = loginAttempts.get(clientIp);
  if (!current || (now - current.firstAttemptAt) > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.set(clientIp, {
      attempts: 1,
      firstAttemptAt: now,
      blockedUntil: null
    });
    return;
  }

  current.attempts += 1;
  if (current.attempts >= MAX_ATTEMPTS_PER_WINDOW) {
    current.blockedUntil = now + RATE_LIMIT_WINDOW_MS;
  }
  loginAttempts.set(clientIp, current);
}

function clearAttempts(clientIp) {
  loginAttempts.delete(clientIp);
}

export async function POST(req) {
  try {
    const now = Date.now();
    const clientIp = getClientIp(req);
    const rateState = getRateLimitState(clientIp, now);

    if (rateState.blocked) {
      return NextResponse.json(
        { error: 'Too many failed attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateState.retryAfterSeconds)
          }
        }
      );
    }

    const { password } = await req.json();

    if (!verifyAdminPassword(password)) {
      recordFailedAttempt(clientIp, now);
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    clearAttempts(clientIp);

    const token = createAdminSessionToken();
    if (!token) {
      return NextResponse.json({ error: 'Admin auth is not configured' }, { status: 500 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, token, getAdminSessionCookieOptions());
    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Failed to authenticate', details: error.message }, { status: 500 });
  }
}
