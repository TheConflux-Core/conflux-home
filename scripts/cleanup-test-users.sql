DO $$
DECLARE
 r RECORD;
BEGIN
 FOR r IN
 SELECT id, email
 FROM auth.users
 WHERE email NOT IN (
   'theconflux303@gmail.com',
   'donziglioni@gmail.com'
 )
 LOOP
   -- API & credits
   DELETE FROM api_keys WHERE user_id = r.id;
   DELETE FROM api_credit_accounts WHERE user_id = r.id;
   DELETE FROM api_credit_transactions WHERE user_id = r.id;
   DELETE FROM api_usage_log WHERE user_id = r.id;
   DELETE FROM credit_accounts WHERE user_id = r.id;
   DELETE FROM credit_transactions WHERE user_id = r.id;
   DELETE FROM usage_log WHERE user_id = r.id;

   -- App tables
   DELETE FROM ch_subscriptions WHERE user_id = r.id;
   DELETE FROM ch_profiles WHERE id = r.id;
   DELETE FROM ch_devices WHERE user_id = r.id;
   DELETE FROM ch_telemetry WHERE user_id = r.id;
   DELETE FROM ch_feedback WHERE user_id = r.id;

   -- Auth (last — cascades to anything we missed)
   DELETE FROM auth.users WHERE id = r.id;

   RAISE NOTICE 'Deleted user: %', r.email;
 END LOOP;
END $$;

SELECT email, created_at, email_confirmed_at
FROM auth.users
ORDER BY created_at;
