-- Run this in your Neon SQL editor
-- Stores all office-hour rows used by /api/doctors and /api/chat
CREATE TABLE
    IF NOT EXISTS office_hours_entries (
        id BIGSERIAL PRIMARY KEY,
        faculty TEXT NOT NULL,
        department TEXT,
        email TEXT,
        office TEXT,
        day TEXT,
        start TEXT,
        "end" TEXT,
        type TEXT DEFAULT 'In-Person',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW ()
    );

CREATE INDEX IF NOT EXISTS idx_office_hours_entries_faculty ON office_hours_entries (faculty);

CREATE INDEX IF NOT EXISTS idx_office_hours_entries_email ON office_hours_entries (email);

CREATE INDEX IF NOT EXISTS idx_office_hours_entries_day ON office_hours_entries (day);

CREATE TABLE
    IF NOT EXISTS bot_static_responses (
        id BIGSERIAL PRIMARY KEY,
        trigger TEXT NOT NULL,
        response TEXT NOT NULL,
        audience TEXT NOT NULL DEFAULT 'user',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW ()
    );

CREATE INDEX IF NOT EXISTS idx_bot_static_responses_trigger ON bot_static_responses (trigger);

CREATE INDEX IF NOT EXISTS idx_bot_static_responses_active ON bot_static_responses (is_active);

CREATE TABLE
    IF NOT EXISTS chat_request_logs (
        id BIGSERIAL PRIMARY KEY,
        outcome TEXT NOT NULL,
        disambiguation_issued BOOLEAN NOT NULL DEFAULT false,
        disambiguation_resolved BOOLEAN NOT NULL DEFAULT false,
        disambiguation_expired BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW ()
    );

CREATE INDEX IF NOT EXISTS idx_chat_request_logs_created_at ON chat_request_logs (created_at);

CREATE INDEX IF NOT EXISTS idx_chat_request_logs_outcome ON chat_request_logs (outcome);

-- ==============================
-- Analytics schema for admin dashboard
-- ==============================

CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    has_smart_search BOOLEAN NOT NULL DEFAULT false,
    has_error BOOLEAN NOT NULL DEFAULT false,
    success BOOLEAN,
    message_count INTEGER NOT NULL DEFAULT 0,
    environment TEXT NOT NULL DEFAULT 'prod',
    meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_conversations_started_at ON conversations (started_at);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations (user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_success ON conversations (success);
CREATE INDEX IF NOT EXISTS idx_conversations_has_error ON conversations (has_error);
CREATE INDEX IF NOT EXISTS idx_conversations_has_smart_search ON conversations (has_smart_search);
CREATE INDEX IF NOT EXISTS idx_conversations_environment ON conversations (environment);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'bot')),
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_error_trigger BOOLEAN NOT NULL DEFAULT false,
    tags JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages (sender);
CREATE INDEX IF NOT EXISTS idx_messages_is_error_trigger ON messages (is_error_trigger);

CREATE TABLE IF NOT EXISTS search_events (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id TEXT,
    search_type TEXT NOT NULL CHECK (search_type IN ('name', 'smart', 'other')),
    query TEXT NOT NULL,
    normalized_name TEXT,
    result_count INTEGER NOT NULL DEFAULT 0,
    success BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    environment TEXT NOT NULL DEFAULT 'prod'
);

CREATE INDEX IF NOT EXISTS idx_search_events_conversation_id ON search_events (conversation_id);
CREATE INDEX IF NOT EXISTS idx_search_events_created_at ON search_events (created_at);
CREATE INDEX IF NOT EXISTS idx_search_events_search_type ON search_events (search_type);
CREATE INDEX IF NOT EXISTS idx_search_events_normalized_name ON search_events (normalized_name);
CREATE INDEX IF NOT EXISTS idx_search_events_environment ON search_events (environment);

CREATE TABLE IF NOT EXISTS error_events (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    message_id TEXT REFERENCES messages(id) ON DELETE SET NULL,
    user_id TEXT,
    error_type TEXT NOT NULL CHECK (error_type IN ('model_incorrect', 'no_results', 'did_not_understand', 'technical_error', 'expired_disambiguation')),
    trigger_source TEXT NOT NULL CHECK (trigger_source IN ('user_feedback', 'auto_detection')),
    user_text_at_error TEXT,
    bot_reply_snippet TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    environment TEXT NOT NULL DEFAULT 'prod'
);

CREATE INDEX IF NOT EXISTS idx_error_events_conversation_id ON error_events (conversation_id);
CREATE INDEX IF NOT EXISTS idx_error_events_message_id ON error_events (message_id);
CREATE INDEX IF NOT EXISTS idx_error_events_error_type ON error_events (error_type);
CREATE INDEX IF NOT EXISTS idx_error_events_created_at ON error_events (created_at);
CREATE INDEX IF NOT EXISTS idx_error_events_environment ON error_events (environment);

CREATE TABLE IF NOT EXISTS feedback_events (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    message_id TEXT REFERENCES messages(id) ON DELETE SET NULL,
    feedback TEXT NOT NULL CHECK (feedback IN ('up', 'down')),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_events_conversation_id ON feedback_events (conversation_id);
CREATE INDEX IF NOT EXISTS idx_feedback_events_message_id ON feedback_events (message_id);
CREATE INDEX IF NOT EXISTS idx_feedback_events_created_at ON feedback_events (created_at);

CREATE TABLE IF NOT EXISTS performance_events (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    message_id TEXT REFERENCES messages(id) ON DELETE SET NULL,
    model_latency_ms INTEGER NOT NULL DEFAULT 0,
    total_latency_ms INTEGER NOT NULL DEFAULT 0,
    tokens_in INTEGER,
    tokens_out INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    environment TEXT NOT NULL DEFAULT 'prod'
);

CREATE INDEX IF NOT EXISTS idx_performance_events_conversation_id ON performance_events (conversation_id);
CREATE INDEX IF NOT EXISTS idx_performance_events_message_id ON performance_events (message_id);
CREATE INDEX IF NOT EXISTS idx_performance_events_created_at ON performance_events (created_at);
CREATE INDEX IF NOT EXISTS idx_performance_events_total_latency ON performance_events (total_latency_ms);
CREATE INDEX IF NOT EXISTS idx_performance_events_environment ON performance_events (environment);