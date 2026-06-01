-- ============================================================
-- Migration: Add user_agent column to ch_feedback
-- Date: 2026-05-31
-- ============================================================
-- Enriches telemetry for bug reports. The user_agent string lets us
-- identify exact Windows version (10 vs 11), browser engine, and
-- screen info that navigator.platform alone can't provide.

ALTER TABLE ch_feedback ADD COLUMN IF NOT EXISTS user_agent TEXT;
