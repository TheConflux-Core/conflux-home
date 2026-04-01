-- ============================================================
-- Migration: Fix Signup Triggers — credit_accounts + sub status
-- Date: 2026-03-31
--
-- Fixes:
-- 1. New users don't get a credit_accounts row → "Limit reached"
-- 2. ch_subscriptions created as 'inactive' → should be 'active' for free tier
-- 3. Adds RLS INSERT policies for trigger-created rows
-- ============================================================

-- 1. Auto-create credit_accounts for new users (500 free credits)
CREATE OR REPLACE FUNCTION create_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO credit_accounts (user_id, balance, created_at, updated_at)
  VALUES (NEW.id, 500, now(), now())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't block signup if credit creation fails
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_credits ON auth.users;
CREATE TRIGGER on_auth_user_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_credits();

-- 2. Fix subscription status: free tier should be 'active' not 'inactive'
CREATE OR REPLACE FUNCTION create_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO ch_subscriptions (user_id, plan, status, credits_included)
  VALUES (NEW.id, 'free', 'active', 500)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create trigger with fixed function
DROP TRIGGER IF EXISTS on_auth_user_subscription ON auth.users;
CREATE TRIGGER on_auth_user_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_subscription();

-- 3. Ensure credit_accounts has INSERT policy for triggers
DROP POLICY IF EXISTS "Allow trigger insert on credit_accounts" ON credit_accounts;
CREATE POLICY "Allow trigger insert on credit_accounts"
  ON credit_accounts FOR INSERT
  WITH CHECK (true);

-- 4. Backfill: create credit_accounts rows for any existing users missing them
INSERT INTO credit_accounts (user_id, balance, created_at, updated_at)
SELECT id, 500, now(), now()
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM credit_accounts)
ON CONFLICT (user_id) DO NOTHING;

-- 5. Backfill: fix any existing subscriptions stuck on 'inactive' for free tier
UPDATE ch_subscriptions
SET status = 'active',
    credits_included = COALESCE(credits_included, 500)
WHERE plan = 'free' AND status = 'inactive';
