import { readFileSync } from 'fs';
import { Resolver } from 'dns/promises';

// Use Google's public DNS 8.8.8.8 to avoid local resolver issues
const resolver = new Resolver();
resolver.setServers(['8.8.8.8', '1.1.1.1']);

const data = JSON.parse(readFileSync(new URL('../data/office_hours.json', import.meta.url)));

// Extract unique emails (case-insensitive dedup), keep original casing + faculty name
const emailMap = new Map();
for (const entry of data) {
  const lower = entry.email.toLowerCase();
  if (!emailMap.has(lower)) {
    emailMap.set(lower, { email: entry.email, faculty: entry.faculty });
  }
}

const uniqueEmails = [...emailMap.values()];

console.log(`\n🔍 Verifying ${uniqueEmails.length} unique email addresses via DNS MX lookup...\n`);

const HTU_DOMAIN = 'htu.edu.jo';
const results = { valid: [], invalid: [], warnings: [] };

async function verifyEmail({ email, faculty }) {
  const lower = email.toLowerCase();

  // 1. Basic format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(lower)) {
    return { email, faculty, status: 'INVALID', reason: 'Bad email format' };
  }

  const domain = lower.split('@')[1];
  const isHTUDomain = domain === HTU_DOMAIN;

  // 2. DNS MX lookup
  let mxRecords;
  try {
    mxRecords = await resolver.resolve(domain, 'MX');
  } catch {
    // Fallback: try A record (some domains receive mail via A record)
    try {
      await resolver.resolve(domain, 'A');
      mxRecords = null; // A record exists but no MX
    } catch {
      return { email, faculty, status: 'INVALID', reason: `Domain "${domain}" does not exist in DNS` };
    }
  }

  const mxInfo = mxRecords?.length > 0 ? `MX: ${mxRecords[0].exchange}` : 'No MX record (A record exists)';

  // 3. Classify
  if (!isHTUDomain) {
    return {
      email, faculty,
      status: 'WARNING',
      reason: `Non-institutional email — ${mxInfo}`
    };
  }

  return { email, faculty, status: 'VALID', reason: mxInfo };
}

// Run all checks concurrently
const settled = await Promise.allSettled(uniqueEmails.map(verifyEmail));

for (const result of settled) {
  if (result.status === 'fulfilled') {
    const r = result.value;
    if (r.status === 'VALID') results.valid.push(r);
    else if (r.status === 'WARNING') results.warnings.push(r);
    else results.invalid.push(r);
  } else {
    results.invalid.push({ email: '?', faculty: '?', status: 'ERROR', reason: String(result.reason) });
  }
}

// ─── Print Report ─────────────────────────────────────────────────────────────
const sep = '═'.repeat(62);

if (results.valid.length > 0) {
  console.log(sep);
  console.log(`✅  VALID  (${results.valid.length}/${uniqueEmails.length})`);
  console.log(sep);
  for (const r of results.valid) {
    console.log(`  ${r.email.toLowerCase().padEnd(42)} ${r.faculty}`);
  }
}

if (results.warnings.length > 0) {
  console.log('\n' + sep);
  console.log(`⚠️   WARNINGS — non-institutional email  (${results.warnings.length})`);
  console.log(sep);
  for (const r of results.warnings) {
    console.log(`  ${r.email}`);
    console.log(`    Faculty : ${r.faculty}`);
    console.log(`    Issue   : ${r.reason}`);
  }
}

if (results.invalid.length > 0) {
  console.log('\n' + sep);
  console.log(`❌  INVALID / BROKEN  (${results.invalid.length})`);
  console.log(sep);
  for (const r of results.invalid) {
    console.log(`  ${r.email}`);
    console.log(`    Faculty : ${r.faculty}`);
    console.log(`    Reason  : ${r.reason}`);
  }
}

console.log('\n' + sep);
console.log(`📊  Total ${uniqueEmails.length} emails — ` +
  `✅ ${results.valid.length} valid | ` +
  `⚠️  ${results.warnings.length} warnings | ` +
  `❌ ${results.invalid.length} invalid`);
console.log(sep + '\n');
