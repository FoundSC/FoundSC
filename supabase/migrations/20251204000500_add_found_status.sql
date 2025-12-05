-- Add is_found boolean field to posts table
-- This allows posts to be marked as found manually without requiring an exchange
-- Keeps the status field separate for exchange workflow tracking

-- Add is_found column (defaults to false)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_found BOOLEAN DEFAULT false NOT NULL;

-- Create index for filtering found/active posts
CREATE INDEX IF NOT EXISTS idx_posts_is_found ON posts(is_found);

COMMENT ON COLUMN posts.is_found IS 'Indicates if the item has been found (manually marked by owner). Separate from status field which tracks exchange workflow.';
