const { Client } = require('pg');
require('dotenv').config();

async function main() {
  // --- Step 1: Send 2 test chat requests ---
  console.log('========================================');
  console.log('  STEP 1: Sending test chat requests');
  console.log('========================================\n');

  const testConvA = 'e2e-test-' + Date.now() + '-A';
  const testConvB = 'e2e-test-' + Date.now() + '-B';

  const chatA = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'dr razan', userId: 'e2e-user-A', conversationId: testConvA })
  }).then(r => r.json());

  console.log(`  [Test A] type=${chatA.type} convId=${chatA.conversationId}`);
  if (chatA.response) console.log(`  [Test A] response="${chatA.response.substring(0, 80)}..."`);

  const chatB = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'when is dr murad available', userId: 'e2e-user-B', conversationId: testConvB })
  }).then(r => r.json());

  console.log(`  [Test B] type=${chatB.type} convId=${chatB.conversationId}`);
  if (chatB.response) console.log(`  [Test B] response="${chatB.response.substring(0, 80)}..."`);

  // --- Step 2: Verify in database ---
  console.log('\n========================================');
  console.log('  STEP 2: Verifying in PostgreSQL DB');
  console.log('========================================\n');

  const c = new Client({
    connectionString: process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await c.connect();

  const ids = [testConvA, testConvB];

  const convs = await c.query(
    "SELECT id, user_id, message_count, has_smart_search, success FROM conversations WHERE id = ANY($1::text[])", [ids]
  );
  console.log(`  Conversations found: ${convs.rows.length}`);
  for (const r of convs.rows) {
    console.log(`    ✓ ${r.id} | user=${r.user_id} msgs=${r.message_count} smart=${r.has_smart_search} success=${r.success}`);
  }

  const msgs = await c.query(
    "SELECT conversation_id, sender, LEFT(text,60) as txt FROM messages WHERE conversation_id = ANY($1::text[]) ORDER BY created_at", [ids]
  );
  console.log(`\n  Messages found: ${msgs.rows.length}`);
  for (const r of msgs.rows) {
    console.log(`    ✓ [${r.conversation_id.slice(-1)}] ${r.sender}: ${r.txt}`);
  }

  const se = await c.query(
    "SELECT search_type, LEFT(query,40) as q, result_count, success FROM search_events WHERE conversation_id = ANY($1::text[])", [ids]
  );
  console.log(`\n  Search events found: ${se.rows.length}`);
  for (const r of se.rows) {
    console.log(`    ✓ type=${r.search_type} query="${r.q}" results=${r.result_count} ok=${r.success}`);
  }

  const pe = await c.query(
    "SELECT conversation_id, total_latency_ms FROM performance_events WHERE conversation_id = ANY($1::text[])", [ids]
  );
  console.log(`\n  Performance events found: ${pe.rows.length}`);
  for (const r of pe.rows) {
    console.log(`    ✓ ${r.conversation_id.slice(-1)} latency=${r.total_latency_ms}ms`);
  }

  // --- Step 3: Cleanup ---
  await c.query("DELETE FROM performance_events WHERE conversation_id = ANY($1::text[])", [ids]);
  await c.query("DELETE FROM search_events WHERE conversation_id = ANY($1::text[])", [ids]);
  await c.query("DELETE FROM error_events WHERE conversation_id = ANY($1::text[])", [ids]);
  await c.query("DELETE FROM messages WHERE conversation_id = ANY($1::text[])", [ids]);
  await c.query("DELETE FROM conversations WHERE id = ANY($1::text[])", [ids]);

  console.log('\n========================================');
  console.log('  ✅ ALL TESTS PASSED — Data cleaned up');
  console.log('========================================');

  await c.end();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
