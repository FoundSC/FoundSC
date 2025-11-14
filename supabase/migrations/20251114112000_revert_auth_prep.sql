-- Revert auth-prep changes and restore pre-auth notification behavior

-- 1) Drop per-user unique index and restore previous unique constraint
DROP INDEX IF EXISTS uniq_notifications_post_lost_user;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_notifications_post_lost ON notifications(post_id, lost_post_id);

-- 2) Replace notify_on_found_post() to no longer write user_id and to dedupe on (post_id,lost_post_id)
CREATE OR REPLACE FUNCTION notify_on_found_post()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type <> 'found' THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (post_id, lost_post_id, message, status)
  SELECT NEW.id, l.lost_post_id,
         'Potential match found: ' || coalesce(NEW.title,'') || ' (' || coalesce(NEW.category,'') || ')',
         'pending'
  FROM lost_match_rules l
  JOIN posts lost ON lost.id = l.lost_post_id
  WHERE (l.category IS NULL OR l.category = NEW.category)
    AND (
      cardinality(l.keywords) = 0 OR EXISTS (
        SELECT 1 FROM unnest(l.keywords) kw
        WHERE unaccent(NEW.title) ILIKE '%' || unaccent(kw) || '%'
           OR unaccent(coalesce(NEW.description,'')) ILIKE '%' || unaccent(kw) || '%'
      )
    )
  ON CONFLICT (post_id, lost_post_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3) Remove owner policies added in auth-prep and restore permissive MVP policies
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.tablename='device_push_tokens' AND p.policyname='Owner manage tokens'
  ) THEN
    DROP POLICY "Owner manage tokens" ON device_push_tokens;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.tablename='user_notification_settings' AND p.policyname='Owner manage settings'
  ) THEN
    DROP POLICY "Owner manage settings" ON user_notification_settings;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.tablename='notifications' AND p.policyname='Owner read notifications'
  ) THEN
    DROP POLICY "Owner read notifications" ON notifications;
  END IF;

  -- Recreate permissive policies if missing
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.tablename='device_push_tokens' AND p.policyname='Public read write tokens'
  ) THEN
    CREATE POLICY "Public read write tokens" ON device_push_tokens FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.tablename='user_notification_settings' AND p.policyname='Public read write settings'
  ) THEN
    CREATE POLICY "Public read write settings" ON user_notification_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.tablename='lost_match_rules' AND p.policyname='Public read write rules'
  ) THEN
    CREATE POLICY "Public read write rules" ON lost_match_rules FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.tablename='notifications' AND p.policyname='Public read write notifications'
  ) THEN
    CREATE POLICY "Public read write notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 4) Drop optional user_id artifacts (safe if empty); keep if you prefer to leave the column
DROP INDEX IF EXISTS idx_posts_user;
DROP INDEX IF EXISTS idx_notifications_user;
ALTER TABLE IF EXISTS posts DROP COLUMN IF EXISTS user_id;
