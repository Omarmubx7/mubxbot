export const DEPARTMENTS = [
  'Computer Science',
  'Cybersecurity',
  'AI & Data Science',
  'Information Technology'
];

export const DEPARTMENT_OTHER = 'Other';

export const BUILDINGS = ['S', 'W', 'N', 'WB', 'IJC'];

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeDepartmentName(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const key = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!key) return '';
  if (
    key.includes('email') ||
    key.includes('unknown') ||
    key.includes('time/day') ||
    key.includes('time day')
  ) return '';

  if (/\bcs\b/.test(key) || key === 'computer science') return 'Computer Science';

  if (key === 'cybersecurity' || /\bcyber\s*security\b/.test(key)) return 'Cybersecurity';

  if (
    /\bdata science\b/.test(key) ||
    /\bai\b/.test(key) ||
    /\bartificial intelligence\b/.test(key) ||
    /\bartificial intelligent\b/.test(key)
  ) return 'AI & Data Science';

  if (/\bit\b/.test(key) || key === 'information technology') return 'Information Technology';

  return '';
}

export function isValidEmail(value = '') {
  return EMAIL_PATTERN.test(String(value || '').trim());
}

export function formatRoom(building = '', number = '') {
  const b = String(building || '').trim().toUpperCase().replace(/\s+/g, '');
  const n = String(number || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9-]/g, '');

  if (!b && !n) return '';
  if (!b) return n;
  if (!n) return b;
  return `${b}-${n}`;
}

export function parseRoom(office = '') {
  const raw = String(office || '').trim();
  if (!raw) return null;

  const compact = raw.replace(/\s+/g, '');
  const match = compact.match(/^([A-Za-z]{1,4})[-_.]?([A-Za-z]?\d{2,4}[A-Za-z]?)$/);
  if (!match) return null;

  return {
    building: match[1].toUpperCase(),
    number: match[2].toUpperCase()
  };
}
