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

CREATE TABLE IF NOT EXISTS bot_static_responses (
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