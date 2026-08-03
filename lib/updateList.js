import Fuse from 'fuse.js';

export const NEW_DATA_NAMES = [
  'Aman Aloudat',
  'Ashraf Alsmadi',
  'Eng. Asmaa Lafi',
  'Banan Mohammad Khanfar',
  'Bassam Kasasbeh',
  'Elham Mahmoud Derbas',
  'Eng. Weaam Alrbeiqi',
  'Hana AlRasheed',
  'Islam Alomari',
  'Malak fraihat',
  'Murad A. Yaghi',
  'Qutaiba Albluwi',
  'Tasnim Mohammad Al-Harasis',
  'Orwah Mohammad Aladaileh',
  'Razan AlQuraan',
  'Ro’aa Almomani',
  'Sama Hamza',
  'Sami Aqeel Murshed Almashaqbeh',
  'Sara Falah Mohammad Abdo',
  'Shatha Ali Al hawawsheh',
  'Sultan Alrushdan',
  'Yazan AL-Shannik',
  'Eyad Taqieddin',
  'Shatha Zuhair Thiab'
];

const NORMALIZED_NEW_DATA_NAMES = NEW_DATA_NAMES.map(normalizeName);

const fuse = new Fuse(NEW_DATA_NAMES, {
  includeScore: true,
  threshold: 0.22,
  ignoreLocation: true,
  minMatchCharLength: 3,
  keys: ['name']
});

export function normalizeName(value = '') {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(dr|doctor|eng|prof|professor|eng\.|dr\.)\.?\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(value = '') {
  return new Set(String(value).split(' ').filter(Boolean));
}

function isSubset(shortTokens, longTokens) {
  return Array.from(shortTokens).every(token => longTokens.has(token));
}

export function isNewDataName(name = '', extraNames = []) {
  const normalized = normalizeName(name);
  if (!normalized) return false;

  const combined = extraNames.length > 0 ? [...NEW_DATA_NAMES, ...extraNames] : NEW_DATA_NAMES;
  const normalizedList = extraNames.length > 0 ? combined.map(normalizeName) : NORMALIZED_NEW_DATA_NAMES;

  if (normalizedList.includes(normalized)) return true;

  const searchIndex = extraNames.length > 0
    ? new Fuse(combined, {
        includeScore: true,
        threshold: 0.22,
        ignoreLocation: true,
        minMatchCharLength: 3,
        keys: ['name']
      })
    : fuse;
  const results = searchIndex.search(name);
  if (results.length > 0 && results[0].score < 0.22) return true;

  const nameTokens = tokenSet(normalized);
  if (nameTokens.size === 0) return false;

  return combined.some((candidate) => {
    const candidateTokens = tokenSet(normalizeName(candidate));
    if (candidateTokens.size === 0) return false;
    return isSubset(nameTokens, candidateTokens) || isSubset(candidateTokens, nameTokens);
  });
}
