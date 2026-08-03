export function isLikelyJunkName(value = '') {
  const name = String(value || '').trim().toLowerCase();
  if (!name || name.length < 2) return true;

  if (/\btest\b/.test(name)) return true;
  if (/^(tst|asd|abc|xxx|yyy|zzz|aa+|n\/a|na|none|nil|unknown|someone|anyone|somebody|dummy|placeholder|sample|example|hello|name|names|doctor|dr)$/.test(name)) return true;
  if (/^(.)\1{2,}$/.test(name)) return true;

  return false;
}
