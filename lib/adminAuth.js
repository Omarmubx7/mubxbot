import crypto from 'node:crypto';

export const ADMIN_SESSION_COOKIE = 'mubx_admin_session';
const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
const SUBMISSION_ACTION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function getAdminPassword() {
  return process.env.ADMIN_PAGE_PASSWORD || process.env.ADMIN_PASSWORD || '';
}

export function getSigningSecret() {
  return process.env.ADMIN_SESSION_SECRET || getAdminPassword();
}

function safeEqual(a, b) {
  const first = Buffer.from(String(a || ''), 'utf8');
  const second = Buffer.from(String(b || ''), 'utf8');

  if (first.length !== second.length) return false;
  return crypto.timingSafeEqual(first, second);
}

function signPayload(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function verifyAdminPassword(inputPassword) {
  const expected = getAdminPassword();
  if (!expected) return false;
  return safeEqual(String(inputPassword || ''), expected);
}

export function createAdminSessionToken() {
  const secret = getSigningSecret();
  if (!secret) return null;

  const timestamp = String(Date.now());
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = `${timestamp}.${nonce}`;
  const signature = signPayload(payload, secret);

  return `${payload}.${signature}`;
}

export function verifyAdminSessionToken(token) {
  if (!token) return false;

  const secret = getSigningSecret();
  if (!secret) return false;

  const parts = String(token).split('.');
  if (parts.length !== 3) return false;

  const [timestamp, nonce, signature] = parts;
  if (!timestamp || !nonce || !signature) return false;

  const payload = `${timestamp}.${nonce}`;
  const expectedSignature = signPayload(payload, secret);
  if (!safeEqual(signature, expectedSignature)) return false;

  const issuedAt = Number(timestamp);
  if (!Number.isFinite(issuedAt)) return false;

  const maxAgeMs = ADMIN_SESSION_MAX_AGE_SECONDS * 1000;
  if ((Date.now() - issuedAt) > maxAgeMs) return false;

  return true;
}

export function getAdminSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS
  };
}

export function signSubmissionActionToken({ id, action }) {
  const secret = getSigningSecret();
  if (!secret) return null;

  const exp = String(Date.now() + SUBMISSION_ACTION_MAX_AGE_MS);
  const payload = `${exp}.${id}.${action}`;
  const signature = signPayload(payload, secret);
  return `${payload}.${signature}`;
}

export function verifySubmissionActionToken(token) {
  if (!token) return null;

  const secret = getSigningSecret();
  if (!secret) return null;

  const parts = String(token).split('.');
  if (parts.length !== 4) return null;

  const [exp, id, action, signature] = parts;
  if (!exp || !id || !action || !signature) return null;

  const payload = `${exp}.${id}.${action}`;
  const expectedSignature = signPayload(payload, secret);
  if (!safeEqual(signature, expectedSignature)) return null;

  const expMs = Number(exp);
  if (!Number.isFinite(expMs)) return null;
  if (Date.now() > expMs) return null;
  if (!['approve', 'reject'].includes(action)) return null;

  return { id, action };
}
