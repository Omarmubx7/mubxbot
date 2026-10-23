'use strict';

/**
 * Optional OpenAI-compatible LLM for free-form messages.
 *
 * The deterministic intent/tool layer always owns directory and calendar data.
 * The model is only used when an intent is unknown, and it is told not to
 * invent availability or academic dates.
 */

function readConfig() {
  const enabled = /^(1|true|yes|on)$/i.test(String(process.env.ASSISTANT_LLM_ENABLED || '').trim());
  const baseUrl = String(process.env.ASSISTANT_LLM_BASE_URL || 'http://localhost:11434/v1').trim().replace(/\/+$/, '');
  const model = String(process.env.ASSISTANT_LLM_MODEL || 'llama3.1').trim();
  const apiKey = String(process.env.ASSISTANT_LLM_API_KEY || '').trim();
  const timeoutMs = Number(process.env.ASSISTANT_LLM_TIMEOUT_MS || 8000);

  return {
    enabled: enabled && Boolean(baseUrl) && Boolean(model),
    baseUrl,
    model,
    apiKey,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 8000
  };
}

function isLlmEnabled() {
  return readConfig().enabled;
}

function buildSystemPrompt(context = {}) {
  const lines = [
    'You are the MUBX assistant, a concise helper for students at MUBX (Middle East University affiliate program).',
    'You can talk naturally, but you must never invent office hours, availability, instructor names, or academic dates.',
    'The app has deterministic tools for those; if the student asks for them, tell them to ask plainly (for example "who is free tomorrow?").',
    'Keep answers under 110 words. Use plain language. Do not mention that you are a language model.'
  ];

  if (context.nowLabel) lines.push(`Current time: ${context.nowLabel}.`);
  if (context.snapshot) {
    lines.push(`Academic snapshot: ${JSON.stringify({
      today: context.snapshot.dateLabel,
      semester: context.snapshot.semester?.label || null,
      teachingWeek: context.snapshot.teachingWeek
        ? `${context.snapshot.teachingWeek.week} of ${context.snapshot.teachingWeek.totalWeeks}`
        : null,
      daysLeft: context.snapshot.semesterProgress?.daysLeft ?? null,
      nextSemester: context.snapshot.nextSemester
        ? `${context.snapshot.nextSemester.label} on ${context.snapshot.nextSemester.startDate}`
        : null,
      nextEvent: context.snapshot.nextEvent
        ? `${context.snapshot.nextEvent.title} on ${context.snapshot.nextEvent.startDate}`
        : null
    })}`);
  }
  if (context.lastProfessor) {
    lines.push(`The last instructor discussed was ${context.lastProfessor}. Resolve "he/she/they/their" to that person.`);
  }

  return lines.join('\n');
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((item) => item && typeof item.text === 'string' && item.text.trim())
    .slice(-6)
    .map((item) => ({
      role: item.role === 'user' ? 'user' : 'assistant',
      content: String(item.text).slice(0, 800)
    }));
}

async function askAssistant({ message, history = [], context = {} } = {}) {
  const config = readConfig();
  if (!config.enabled) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        temperature: 0.4,
        max_tokens: 220,
        messages: [
          { role: 'system', content: buildSystemPrompt(context) },
          ...normalizeHistory(history),
          { role: 'user', content: String(message).slice(0, 1200) }
        ]
      })
    });

    if (!response.ok) {
      console.error('assistant LLM request failed', response.status);
      return null;
    }

    const payload = await response.json();
    const text = payload?.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim()) return null;
    return text.trim();
  } catch (error) {
    if (error?.name !== 'AbortError') {
      console.error('assistant LLM request error', error?.message || error);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  isLlmEnabled,
  askAssistant,
  buildSystemPrompt
};
