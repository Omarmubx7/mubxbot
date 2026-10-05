function removeDiacriticsSafe(str) {
  if (!str || typeof str !== 'string') return '';
  try {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch (e) {
    return str;
  }
}

export function normalizeNameForLookup(name) {
  if (!name || typeof name !== 'string') return '';
  let n = name;
  try {
    n = removeDiacriticsSafe(n);
  } catch (e) {}
  n = n
    .toLowerCase()
    .replace(/[\u2019\u2018\u201C\u201D\u2032\u2033]/g, "'")
    .replace(/&/g, ' and ')
    .replace(/[.,;:(){}\[\]<>\/\\|`~!@#$%^*_+=?]/g, ' ')
    .replace(/[-\u2013\u2014]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const stopWords = new Set([
    'dr','dr.','prof','prof.','professor','mr','mr.','mrs','mrs.','ms','ms.','miss','phd','ph.d','ph.d.','eng','engr','associate','assistant','lecturer','instructor','adjunct','emeritus','emerita',
  ]);
  const parts = n.split(' ').filter((p) => p && !stopWords.has(p));
  if (parts.length === 0) return n;
  return parts.join(' ');
}

export function normalizeNameKey(name) {
  const base = normalizeNameForLookup(name);
  return base.replace(/\s+/g, ' ').trim();
}

export const JUNK_NAME_PATTERNS = [
  /\btest\b/i,/\btst\b/i,/\basd\b/i,/\babc\b/i,/\bxxx\b/i,/\byyy\b/i,/\bzzz\b/i,/\bn\/?a\b/i,/\bnone\b/i,/\bnil\b/i,/\bunknown\b/i,/\bsomeone\b/i,/\banyone\b/i,/\bsomebody\b/i,/\bdummy\b/i,/\bplaceholder\b/i,/\bsample\b/i,/\bexample\b/i,/\bhello\b/i,/\bname\b/i,/\bnames\b/i,/\bdoctor\b/i,/\bdr\b/i,/(.)\1{3,}/,
];

export function isLikelyJunkName(name) {
  if (!name || typeof name !== 'string') return true;
  const s = name.trim();
  if (s.length < 2) return true;
  for (const re of JUNK_NAME_PATTERNS) {
    if (re.test(s)) return true;
  }
  const letters = s.replace(/[^A-Za-z\u00C0-\u024F]/g, '');
  if (letters.length < 2) return true;
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length > 6) return true;
  return false;
}
