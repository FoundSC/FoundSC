-- deliver notifications via creator's device token without requiring auth

-- 1) Add creator_device_token to posts to capture the Expo push token at creation time
ALTER TABLE IF EXISTS posts
  ADD COLUMN IF NOT EXISTS creator_device_token TEXT;

-- 2) Update notify_on_found_post to copy the LOST post creator's device token
-- into notifications.device_token so the dispatcher can send directly
CREATE OR REPLACE FUNCTION notify_on_found_post()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if found
  IF NEW.type <> 'found' THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (post_id, lost_post_id, device_token, message, status)
  SELECT NEW.id, l.lost_post_id, lost.creator_device_token,
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
