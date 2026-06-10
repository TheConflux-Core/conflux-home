-- 023_studio_config_sync.sql
-- Stores Studio API keys (MiniMax, ElevenLabs, Replicate, etc.) centrally.
-- Authenticated users can READ; only service role can WRITE.
-- Mobile/桌面 clients sync these to local SQLite on startup.

CREATE TABLE IF NOT EXISTS studio_config (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: authenticated users can read (keys are Conflux-owned, not user-secret)
ALTER TABLE studio_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read studio_config"
    ON studio_config FOR SELECT
    TO authenticated
    USING (true);

-- Service role has full access (for inserts/updates via dashboard or scripts)
CREATE POLICY "Service role full access on studio_config"
    ON studio_config FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Seed with current keys (replace values with actual keys via Supabase dashboard)
-- These are placeholders — the real keys must be inserted via:
--   INSERT INTO studio_config (key, value) VALUES ('minimax_api_key', '...') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
--
-- Or via the Supabase SQL Editor after this migration runs.
