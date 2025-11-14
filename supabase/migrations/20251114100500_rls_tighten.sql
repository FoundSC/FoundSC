-- Remove permissive public policies added for MVP so owner-based RLS can take effect
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.tablename='device_push_tokens' AND p.policyname='Public read write tokens'
  ) THEN
    DROP POLICY "Public read write tokens" ON device_push_tokens;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.tablename='user_notification_settings' AND p.policyname='Public read write settings'
  ) THEN
    DROP POLICY "Public read write settings" ON user_notification_settings;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.tablename='lost_match_rules' AND p.policyname='Public read write rules'
  ) THEN
    DROP POLICY "Public read write rules" ON lost_match_rules;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.tablename='notifications' AND p.policyname='Public read write notifications'
  ) THEN
    DROP POLICY "Public read write notifications" ON notifications;
  END IF;
END $$;
