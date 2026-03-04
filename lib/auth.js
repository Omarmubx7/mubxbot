export function isAdminAuthenticated(req) {
  const auth = req.headers.get?.('authorization') || req.headers.get('Authorization') || '';
  const expectedUser = process.env.ADMIN_USER;
  const expectedPass = process.env.ADMIN_PASS;
  if (!expectedUser || !expectedPass) return false;
  const m = auth.match(/^Basic\s+(.*)$/i);
  if (!m) return false;
  let creds;
  try {
    const b = m[1];
    creds = typeof atob === 'function' ? atob(b) : Buffer.from(b, 'base64').toString();
  } catch (e) {
    return false;
  }
  const [user, pass] = creds.split(':');
  return user === expectedUser && pass === expectedPass;
}
