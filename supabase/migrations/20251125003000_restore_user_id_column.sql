-- Restore user_id column to posts table
-- This column was incorrectly dropped by 20251114112000_revert_auth_prep.sql

-- Re-add the user_id column
ALTER TABLE IF EXISTS posts
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Recreate the index for efficient user-based queries
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);

-- Add RLS policy to allow users to manage their own posts
-- Using permissive policy: allows both anonymous posts (user_id IS NULL) and owned posts
DO $$
BEGIN
  -- Drop old permissive policies if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.tablename='posts' AND p.policyname='Anyone can update posts'
  ) THEN
    DROP POLICY "Anyone can update posts" ON posts;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.tablename='posts' AND p.policyname='Anyone can delete posts'
  ) THEN
    DROP POLICY "Anyone can delete posts" ON posts;
  END IF;

  -- Create policy: users can update their own posts
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.tablename='posts' AND p.policyname='Users can update own posts'
  ) THEN
    CREATE POLICY "Users can update own posts" ON posts
      FOR UPDATE
      USING (user_id IS NULL OR user_id = auth.uid());
  END IF;

  -- Create policy: users can delete their own posts
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p WHERE p.tablename='posts' AND p.policyname='Users can delete own posts'
  ) THEN
    CREATE POLICY "Users can delete own posts" ON posts
      FOR DELETE
      USING (user_id IS NULL OR user_id = auth.uid());
  END IF;
END $$;