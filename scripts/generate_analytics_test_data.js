// Generate realistic test data for analytics dashboard
import pg from 'pg';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load .env file
dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env') });
dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env.local') });

const { Client } = pg;
const DATABASE_URL = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || '';

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is required');
  console.error('Make sure .env or .env.local contains DATABASE_URL');
  process.exit(1);
}

async function generateTestData() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  try {
    const now = new Date();
    const conversationIds = [];

    // Generate 50 conversations over the last 7 days
    for (let i = 0; i < 50; i++) {
      const daysAgo = Math.floor(Math.random() * 7);
      const hoursAgo = Math.floor(Math.random() * 24);
      const startedAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - hoursAgo * 60 * 60 * 1000);
      
      const conversationId = crypto.randomUUID();
      conversationIds.push(conversationId);
      const userId = `user_${Math.floor(Math.random() * 100)}`;
      const hasSmartSearch = Math.random() > 0.3;
      const hasError = Math.random() > 0.7;
      const success = !hasError && Math.random() > 0.2;
      const messageCount = Math.floor(Math.random() * 10) + 1;

      // Insert conversation
      await client.query(
        `INSERT INTO conversations (id, user_id, started_at, ended_at, has_smart_search, has_error, success, message_count, environment)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [conversationId, userId, startedAt, new Date(startedAt.getTime() + 5 * 60 * 1000), hasSmartSearch, hasError, success, messageCount, 'prod']
      );

      // Insert messages
      for (let j = 0; j < messageCount; j++) {
        const userMessages = [
          'Who is Dr. Smith?',
          'When is office hours?',
          'What classes does Professor Johnson teach?',
          'Tell me about computer science',
          'I need help finding my professor'
        ];
        const botMessages = [
          'Dr. Smith is in the Biology department.',
          'Office hours are on Tuesday and Thursday from 2-4 PM.',
          'Professor Johnson teaches CS101, CS201, and CS301.',
          'Computer Science is a major STEM field.',
          'I can help you find your professor. What is their name?'
        ];

        const messageId = crypto.randomUUID();
        
        // User message
        await client.query(
          `INSERT INTO messages (id, conversation_id, sender, text, is_error_trigger, tags)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
          [messageId, conversationId, 'user', userMessages[j % 5], false, JSON.stringify({})]
        );

        // Bot message
        const botMessageId = crypto.randomUUID();
        const isError = hasError && Math.random() > 0.5;
        await client.query(
          `INSERT INTO messages (id, conversation_id, sender, text, is_error_trigger, tags)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
          [botMessageId, conversationId, 'bot', botMessages[j % 5], isError, JSON.stringify({})]
        );
      }

      // Insert search events
      if (hasSmartSearch) {
        const searchTypes = ['name', 'smart', 'other'];
        const names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Davis'];
        
        for (let k = 0; k < Math.floor(Math.random() * 3) + 1; k++) {
          await client.query(
            `INSERT INTO search_events (id, conversation_id, user_id, search_type, query, normalized_name, result_count, success, environment)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              crypto.randomUUID(),
              conversationId,
              userId,
              searchTypes[Math.floor(Math.random() * 3)],
              `Query for ${names[k % 5]}`,
              names[k % 5],
              Math.floor(Math.random() * 5) + 1,
              Math.random() > 0.2,
              'prod'
            ]
          );
        }
      }

      // Insert error events
      if (hasError) {
        const errorTypes = ['model_incorrect', 'no_results', 'did_not_understand', 'technical_error', 'expired_disambiguation'];
        const triggerSources = ['user_feedback', 'auto_detection'];
        
        for (let k = 0; k < Math.floor(Math.random() * 2) + 1; k++) {
          await client.query(
            `INSERT INTO error_events (id, conversation_id, user_id, error_type, trigger_source, user_text_at_error, bot_reply_snippet, environment)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              crypto.randomUUID(),
              conversationId,
              userId,
              errorTypes[Math.floor(Math.random() * errorTypes.length)],
              triggerSources[Math.floor(Math.random() * 2)],
              'User query that caused error',
              'Error response snippet',
              'prod'
            ]
          );
        }
      }

      // Insert performance events
      await client.query(
        `INSERT INTO performance_events (id, conversation_id, total_latency_ms, model_latency_ms, environment)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          crypto.randomUUID(),
          conversationId,
          Math.floor(Math.random() * 3000) + 500,
          Math.floor(Math.random() * 2000) + 200,
          'prod'
        ]
      );
    }

    console.log(`✅ Generated test data for ${conversationIds.length} conversations`);
    console.log('✅ Analytics dashboard should now show real data');

  } catch (err) {
    console.error('Error generating test data:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

generateTestData();
