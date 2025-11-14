ALTER TABLE IF EXISTS posts
  ADD COLUMN IF NOT EXISTS user_id UUID;

CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

DROP INDEX IF EXISTS uniq_notifications_post_lost;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_notifications_post_lost_user
  ON notifications(post_id, lost_post_id, user_id);

CREATE OR REPLACE FUNCTION notify_on_found_post()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type <> 'found' THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (post_id, lost_post_id, user_id, message, status)
  SELECT NEW.id, l.lost_post_id, lost.user_id,
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
  ON CONFLICT (post_id, lost_post_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.tablename='device_push_tokens' AND p.policyname='Owner manage tokens'
  ) THEN
    CREATE POLICY "Owner manage tokens" ON device_push_tokens
      FOR ALL
      USING (user_id IS NOT DISTINCT FROM auth.uid())
      WITH CHECK (user_id IS NOT DISTINCT FROM auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.tablename='user_notification_settings' AND p.policyname='Owner manage settings'
  ) THEN
    CREATE POLICY "Owner manage settings" ON user_notification_settings
      FOR ALL
      USING (user_id IS NOT DISTINCT FROM auth.uid())
      WITH CHECK (user_id IS NOT DISTINCT FROM auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.tablename='notifications' AND p.policyname='Owner read notifications'
  ) THEN
    CREATE POLICY "Owner read notifications" ON notifications
      FOR SELECT
      USING (user_id IS NOT DISTINCT FROM auth.uid());
  END IF;
END $$;
