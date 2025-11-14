-- Notifications schema for matching and dispatching alerts
-- Extensions (safe to attempt)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- User-level notification settings (MVP: user_id nullable until auth added)
CREATE TABLE IF NOT EXISTS user_notification_settings (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  radius_km NUMERIC,
  category_prefs TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Device push tokens (Expo/FCM/APNS)
CREATE TABLE IF NOT EXISTS device_push_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  platform TEXT CHECK (platform IN ('ios','android','web')),
  token TEXT NOT NULL,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (token)
);

-- Per-lost-post matching rules
CREATE TABLE IF NOT EXISTS lost_match_rules (
  id BIGSERIAL PRIMARY KEY,
  lost_post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  radius_km NUMERIC,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lost_post_id)
);

-- Notifications outbox
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  lost_post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID,
  device_token TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','skipped')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- Prevent duplicates per matched pair (post + lost)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_notifications_post_lost ON notifications(post_id, lost_post_id);

-- Indexes to accelerate matching and dispatch
CREATE INDEX IF NOT EXISTS idx_notifications_status_created ON notifications(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_user ON user_notification_settings(user_id);

-- Provide an immutable wrapper for unaccent so it can be used in index expressions
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$ SELECT public.unaccent($1) $$;

-- Full-text search index over posts(title, description)
CREATE INDEX IF NOT EXISTS idx_posts_title_desc_tsv
  ON posts USING GIN (
    to_tsvector('simple', immutable_unaccent(coalesce(title,'') || ' ' || coalesce(description,'')))
  );

-- Updated_at trigger for settings
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_user_settings_updated_at' AND c.relname = 'user_notification_settings'
  ) THEN
    CREATE TRIGGER trg_user_settings_updated_at
      BEFORE UPDATE ON user_notification_settings
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- Matching trigger: when a FOUND post is inserted, enqueue notifications for matching LOST rules
CREATE OR REPLACE FUNCTION notify_on_found_post()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if found
  IF NEW.type <> 'found' THEN
    RETURN NEW;
  END IF;

  -- Insert pending notifications for each lost_match_rules row that matches category and keywords
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'trg_notify_on_found' AND c.relname = 'posts'
  ) THEN
    CREATE TRIGGER trg_notify_on_found
      AFTER INSERT ON posts
      FOR EACH ROW
      WHEN (NEW.type = 'found')
      EXECUTE FUNCTION notify_on_found_post();
  END IF;
END $$;

-- RLS (MVP: relaxed policies; tighten when auth is added)
ALTER TABLE IF EXISTS user_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS device_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lost_match_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.tablename='user_notification_settings' AND p.policyname='Public read write settings'
  ) THEN
    CREATE POLICY "Public read write settings" ON user_notification_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.tablename='device_push_tokens' AND p.policyname='Public read write tokens'
  ) THEN
    CREATE POLICY "Public read write tokens" ON device_push_tokens FOR ALL USING (true) WITH CHECK (true);
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
