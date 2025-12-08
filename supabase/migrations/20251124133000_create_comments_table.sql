-- Create comments table for per-post discussions

-- 1) Table definition
CREATE TABLE IF NOT EXISTS comments (
  id           BIGSERIAL PRIMARY KEY,
  post_id      INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id    UUID, -- nullable for now; can be tied to auth users later
  body         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helpful index for fetching comments by post in chronological order
CREATE INDEX IF NOT EXISTS idx_comments_post_created
  ON comments (post_id, created_at DESC);

-- 2) Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 3) RLS policies
-- For now we allow public read + write
-- Can tighten to auth.uid() later when login is fully wired.

-- Allow anyone to read comments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.tablename = 'comments' AND p.policyname = 'Public read comments'
  ) THEN
    CREATE POLICY "Public read comments" ON comments
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- Allow anyone to insert comments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.tablename = 'comments' AND p.policyname = 'Public insert comments'
  ) THEN
    CREATE POLICY "Public insert comments" ON comments
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- Allow anyone to delete their own comments, or anyone if author_id is null
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.tablename = 'comments' AND p.policyname = 'Public delete comments'
  ) THEN
    CREATE POLICY "Public delete comments" ON comments
      FOR DELETE
      USING (true);
  END IF;
END $$;
