-- Drop legacy status column from posts table
-- The status field was used for exchange workflow tracking ('active', 'in_exchange', 'completed', 'cancelled')
-- Now replaced by simpler active (BOOLEAN) and is_found (BOOLEAN) fields

-- IMPORTANT: Must drop the policy FIRST before dropping the column it depends on
DROP POLICY IF EXISTS "Post owner can create exchange" ON exchanges;

-- Now we can safely remove the status column from posts table
ALTER TABLE posts DROP COLUMN IF EXISTS status;

-- Recreate the RLS policy to use active instead of status
-- This policy controls whether users can create exchanges for posts
CREATE POLICY "Post owner can create exchange" ON exchanges
  FOR INSERT
  WITH CHECK (
    auth.uid() = post_owner_id
    AND EXISTS (
      SELECT 1 FROM posts
      WHERE id = post_id
      AND user_id = auth.uid()
      AND active = true  -- Changed from status = 'active'
    )
  );

-- Add database constraint to enforce is_found/active relationship
-- Rule: if is_found = true, then active must = false (invalid state prevention)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'posts_found_not_active_check'
  ) THEN
    ALTER TABLE posts
      ADD CONSTRAINT posts_found_not_active_check
      CHECK (NOT (is_found = true AND active = true));
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN posts.active IS 'Controls visibility in All Posts feed. true = visible, false = hidden. Must be false when is_found = true.';
COMMENT ON COLUMN posts.is_found IS 'Indicates if item has been manually marked as found by owner. When true, active must be false.';
-- Only add comment if constraint exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'posts_found_not_active_check'
  ) THEN
    COMMENT ON CONSTRAINT posts_found_not_active_check ON posts IS 'Enforces rule: posts cannot be both found AND active simultaneously';
  END IF;
END $$;
