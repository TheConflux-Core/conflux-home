-- ============================================================
-- Migration: Feedback & Bug Reports
-- Date: 2026-05-29
-- ============================================================

-- Stores user-submitted bug reports and feature requests.
-- Users can submit via in-app form (primary) or GitHub (optional).

CREATE TABLE IF NOT EXISTS ch_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  page_context TEXT,
  app_version TEXT,
  os_info TEXT,
  user_email TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'planned', 'in_progress', 'done', 'wontfix')),
  admin_notes TEXT,
  github_issue_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ch_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
DO $$ BEGIN
  CREATE POLICY "Users can insert own feedback"
    ON ch_feedback FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own feedback"
    ON ch_feedback FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role full access"
    ON ch_feedback FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Index for polling new feedback
CREATE INDEX IF NOT EXISTS idx_feedback_status ON ch_feedback(status, created_at DESC)
  WHERE status = 'new';

-- Index for per-user history
CREATE INDEX IF NOT EXISTS idx_feedback_user ON ch_feedback(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER feedback_updated_at
    BEFORE UPDATE ON ch_feedback
    FOR EACH ROW EXECUTE FUNCTION update_feedback_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
