-- ============================================================
-- Migration: Fix signup — harden ALL auth triggers
-- Date: 2026-06-01
--
-- Root cause: Multiple trigger functions on auth.users lack
-- EXCEPTION WHEN OTHERS guards. Any error in ANY of them
-- kills the entire transaction → "Database error saving new user"
--
-- Affected functions found:
--   create_default_budget_buckets (migration 019) — NO GUARD
--   handle_new_user_api_key (migration 018) — NO GUARD
--   All others (010/012/013) already have guards.
-- ============================================================

-- 1. Fix create_default_budget_buckets (migration 019 — MISSING GUARD)
CREATE OR REPLACE FUNCTION create_default_budget_buckets()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO budget_buckets (user_id, name, icon, monthly_goal, color)
  VALUES
    (NEW.id, 'Housing', '🏠', 0, '#ef4444'),
    (NEW.id, 'Groceries', '🛒', 0, '#f59e0b'),
    (NEW.id, 'Transportation', '🚗', 0, '#3b82f6'),
    (NEW.id, 'Utilities', '💡', 0, '#8b5cf6'),
    (NEW.id, 'Emergency Fund', '🛡️', 0, '#22c55e'),
    (NEW.id, 'Fun Money', '🎉', 0, '#ec4899');
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'create_default_budget_buckets failed for user %: % %', NEW.id, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix handle_new_user_api_key (migration 018 — MISSING GUARD)
CREATE OR REPLACE FUNCTION public.handle_new_user_api_key()
RETURNS TRIGGER AS $$
DECLARE
  v_raw_key TEXT;
  v_key_hash TEXT;
  v_key_prefix TEXT;
BEGIN
  v_raw_key := 'cf_live_' || encode(gen_random_bytes(32), 'hex');
  v_key_hash := encode(digest(v_raw_key, 'sha256'), 'hex');
  v_key_prefix := substr(v_raw_key, 1, 16);

  INSERT INTO api_keys (user_id, key_hash, key_prefix, name, is_active)
  VALUES (NEW.id, v_key_hash, v_key_prefix, 'Default Key', true);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user_api_key failed for user %: % %', NEW.id, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-harden all other triggers (idempotent, safe to re-run)

CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO ch_profiles (id, display_name, plan, created_at, updated_at)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'User'), 'free', now(), now())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'create_user_profile failed for user %: % %', NEW.id, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.ch_profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for user %: % %', NEW.id, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO credit_accounts (user_id, balance, created_at, updated_at)
  VALUES (NEW.id, 500, now(), now())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'create_user_credits failed for user %: % %', NEW.id, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO ch_subscriptions (user_id, plan, status, credits_included)
  VALUES (NEW.id, 'free', 'active', 500)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'create_user_subscription failed for user %: % %', NEW.id, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Add missing RLS INSERT policy on api_keys
DROP POLICY IF EXISTS "Allow trigger insert on api_keys" ON api_keys;
CREATE POLICY "Allow trigger insert on api_keys"
  ON api_keys FOR INSERT
  WITH CHECK (true);

-- 5. Verify ALL trigger functions on auth.users have guards
DO $$
DECLARE
  r RECORD;
  func_body TEXT;
  has_guard BOOLEAN;
  missing_count INT := 0;
BEGIN
  FOR r IN
    SELECT t.tgname, p.proname
    FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE t.tgrelid = 'auth.users'::regclass AND NOT t.tgisinternal
  LOOP
    SELECT pg_get_functiondef(p.oid) INTO func_body
    FROM pg_proc p
    WHERE p.proname = r.proname;

    has_guard := func_body ILIKE '%EXCEPTION WHEN OTHERS%';

    IF has_guard THEN
      RAISE NOTICE '✅ % → % has EXCEPTION guard', r.tgname, r.proname;
    ELSE
      RAISE WARNING '❌ % → % MISSING EXCEPTION guard', r.tgname, r.proname;
      missing_count := missing_count + 1;
    END IF;
  END LOOP;

  IF missing_count = 0 THEN
    RAISE NOTICE 'All trigger functions on auth.users have EXCEPTION guards.';
  ELSE
    RAISE WARNING '% trigger function(s) still missing EXCEPTION guards!', missing_count;
  END IF;
END $$;
