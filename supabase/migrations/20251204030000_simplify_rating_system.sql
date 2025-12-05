-- ============================================================================
-- SIMPLIFIED RATING SYSTEM
-- Replaces complex exchanges flow with direct successful_returns
-- ============================================================================

-- 0. Add active column to posts table (for filtering found posts from All Posts)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
UPDATE posts SET active = true WHERE active IS NULL;
UPDATE posts SET active = false WHERE is_found = true;
CREATE INDEX IF NOT EXISTS idx_posts_active ON posts(active);

-- 1. Create successful_returns table (replaces exchanges for our use case)
CREATE TABLE IF NOT EXISTS successful_returns (
  id BIGSERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  finder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id), -- One successful return per post
  CHECK (owner_id != finder_id) -- Can't return to yourself
);

CREATE INDEX IF NOT EXISTS idx_successful_returns_owner ON successful_returns(owner_id);
CREATE INDEX IF NOT EXISTS idx_successful_returns_finder ON successful_returns(finder_id);
CREATE INDEX IF NOT EXISTS idx_successful_returns_post ON successful_returns(post_id);

-- 2. Modify ratings table - make exchange_id optional, add post_id reference
ALTER TABLE ratings ALTER COLUMN exchange_id DROP NOT NULL;
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE;

-- 3. Drop the unique constraint on exchange_id, rater_id if it exists
ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_exchange_id_rater_id_key;

-- 4. Add new unique constraint - one rating per user per post
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ratings_post_id_rater_id_key'
  ) THEN
    ALTER TABLE ratings ADD CONSTRAINT ratings_post_id_rater_id_key UNIQUE(post_id, rater_id);
  END IF;
EXCEPTION WHEN others THEN
  -- Constraint might already exist or conflict, ignore
  NULL;
END $$;

-- 5. RLS for successful_returns
ALTER TABLE successful_returns ENABLE ROW LEVEL SECURITY;

-- Anyone can view successful returns (for displaying "returned" badge)
DROP POLICY IF EXISTS "Anyone can view successful returns" ON successful_returns;
CREATE POLICY "Anyone can view successful returns" ON successful_returns
  FOR SELECT USING (true);

-- Only post owner can create successful return
DROP POLICY IF EXISTS "Post owner can create successful return" ON successful_returns;
CREATE POLICY "Post owner can create successful return" ON successful_returns
  FOR INSERT WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (
      SELECT 1 FROM posts WHERE id = post_id AND user_id = auth.uid()
    )
  );

-- 6. Update ratings RLS - allow rating via successful_returns
DROP POLICY IF EXISTS "Participants can rate" ON ratings;
DROP POLICY IF EXISTS "Users can rate finders" ON ratings;
CREATE POLICY "Users can rate finders" ON ratings
  FOR INSERT WITH CHECK (
    auth.uid() = rater_id
    AND rater_id != ratee_id
    AND (
      -- Allow rating if there's a successful return for this post where user is owner
      EXISTS (
        SELECT 1 FROM successful_returns sr
        WHERE sr.post_id = ratings.post_id
        AND sr.owner_id = auth.uid()
        AND sr.finder_id = ratings.ratee_id
      )
      -- Or allow if using legacy exchange system
      OR (
        ratings.exchange_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM exchanges e
          WHERE e.id = ratings.exchange_id
          AND auth.uid() IN (e.post_owner_id, e.finder_id)
        )
      )
    )
  );

-- 7. Function to award star rating and update user reputation
CREATE OR REPLACE FUNCTION award_star_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Update ratee's average rating and count
  UPDATE user_profiles
  SET
    rating_avg = (
      SELECT COALESCE(ROUND(AVG(rating)::NUMERIC, 2), 0.00)
      FROM ratings
      WHERE ratee_id = NEW.ratee_id
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM ratings
      WHERE ratee_id = NEW.ratee_id
    ),
    updated_at = NOW()
  WHERE id = NEW.ratee_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update ratings on insert
DROP TRIGGER IF EXISTS on_rating_added ON ratings;
CREATE TRIGGER on_rating_added
  AFTER INSERT ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION award_star_rating();

-- 8. Function to increment successful returns count for finder
CREATE OR REPLACE FUNCTION increment_successful_returns()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment finder's successful_exchanges count
  UPDATE user_profiles
  SET 
    successful_exchanges = successful_exchanges + 1,
    updated_at = NOW()
  WHERE id = NEW.finder_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for successful returns
DROP TRIGGER IF EXISTS on_successful_return ON successful_returns;
CREATE TRIGGER on_successful_return
  AFTER INSERT ON successful_returns
  FOR EACH ROW
  EXECUTE FUNCTION increment_successful_returns();

-- 9. Add comments
COMMENT ON TABLE successful_returns IS 'Tracks when a lost item is successfully returned to owner';
COMMENT ON COLUMN successful_returns.finder_id IS 'The user who helped find/return the item';
COMMENT ON COLUMN successful_returns.owner_id IS 'The post owner who lost the item';
