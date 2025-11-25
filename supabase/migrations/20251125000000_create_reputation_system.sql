-- ============================================================================
-- Reputation System Migration
-- Creates tables and logic for 5-star rating system between users
-- ============================================================================

-- ============================================================================
-- PART 1: TABLES
-- ============================================================================

-- User Profiles Table
-- Stores user display information and reputation metrics
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  profile_picture TEXT, -- URL to profile image
  rating_avg NUMERIC(3,2) DEFAULT 0.00 CHECK (rating_avg >= 0 AND rating_avg <= 5),
  rating_count INTEGER DEFAULT 0 CHECK (rating_count >= 0),
  successful_exchanges INTEGER DEFAULT 0 CHECK (successful_exchanges >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_display_name ON user_profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_user_profiles_rating ON user_profiles(rating_avg DESC);

-- Add status column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
  CHECK (status IN ('active', 'in_exchange', 'completed', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_user_status ON posts(user_id, status);

-- Exchanges Table
-- Tracks item exchanges between post owner and finder
CREATE TABLE IF NOT EXISTS exchanges (
  id BIGSERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  post_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  finder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  cancellation_reason TEXT,
  initiated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id), -- One exchange per post
  CHECK (post_owner_id != finder_id) -- Can't exchange with yourself
);

CREATE INDEX IF NOT EXISTS idx_exchanges_post_owner ON exchanges(post_owner_id);
CREATE INDEX IF NOT EXISTS idx_exchanges_finder ON exchanges(finder_id);
CREATE INDEX IF NOT EXISTS idx_exchanges_status ON exchanges(status);
CREATE INDEX IF NOT EXISTS idx_exchanges_post ON exchanges(post_id);

-- Ratings Table
-- Stores ratings given by users after exchanges
CREATE TABLE IF NOT EXISTS ratings (
  id BIGSERIAL PRIMARY KEY,
  exchange_id BIGINT NOT NULL REFERENCES exchanges(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ratee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exchange_id, rater_id), -- Each user rates once per exchange
  CHECK (rater_id != ratee_id) -- Can't rate yourself
);

CREATE INDEX IF NOT EXISTS idx_ratings_ratee ON ratings(ratee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_exchange ON ratings(exchange_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rater ON ratings(rater_id);

-- ============================================================================
-- PART 2: TRIGGERS & FUNCTIONS
-- ============================================================================

-- Function: Auto-create user profile when user signs up
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Function: Update user rating average and count
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
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

-- Trigger: Update ratings when new rating is added
DROP TRIGGER IF EXISTS on_rating_added ON ratings;
CREATE TRIGGER on_rating_added
  AFTER INSERT ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_rating();

-- Function: Check if exchange is complete (both users rated)
CREATE OR REPLACE FUNCTION check_exchange_completion()
RETURNS TRIGGER AS $$
DECLARE
  rating_count INTEGER;
  exchange_post_id INTEGER;
BEGIN
  -- Count ratings for this exchange
  SELECT COUNT(*) INTO rating_count
  FROM ratings
  WHERE exchange_id = NEW.exchange_id;

  -- If both users have rated, mark exchange and post as completed
  IF rating_count = 2 THEN
    -- Get the post_id from exchange
    SELECT post_id INTO exchange_post_id
    FROM exchanges
    WHERE id = NEW.exchange_id;

    -- Update exchange status
    UPDATE exchanges
    SET status = 'completed', completed_at = NOW()
    WHERE id = NEW.exchange_id;

    -- Update post status
    UPDATE posts
    SET status = 'completed'
    WHERE id = exchange_post_id;

    -- Increment successful_exchanges for both users
    UPDATE user_profiles
    SET successful_exchanges = successful_exchanges + 1
    WHERE id IN (
      SELECT post_owner_id FROM exchanges WHERE id = NEW.exchange_id
      UNION
      SELECT finder_id FROM exchanges WHERE id = NEW.exchange_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Check completion after rating is added
DROP TRIGGER IF EXISTS on_rating_check_completion ON ratings;
CREATE TRIGGER on_rating_check_completion
  AFTER INSERT ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION check_exchange_completion();

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update user_profiles.updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 3: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USER_PROFILES POLICIES
-- ============================================================================

-- Anyone can view profiles (public information)
DROP POLICY IF EXISTS "Public can view profiles" ON user_profiles;
CREATE POLICY "Public can view profiles" ON user_profiles
  FOR SELECT
  USING (true);

-- Users can update only their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================================
-- EXCHANGES POLICIES
-- ============================================================================

-- Participants can view their exchanges
DROP POLICY IF EXISTS "Participants can view exchanges" ON exchanges;
CREATE POLICY "Participants can view exchanges" ON exchanges
  FOR SELECT
  USING (auth.uid() IN (post_owner_id, finder_id));

-- Post owner can create exchange (mark as found)
DROP POLICY IF EXISTS "Post owner can create exchange" ON exchanges;
CREATE POLICY "Post owner can create exchange" ON exchanges
  FOR INSERT
  WITH CHECK (
    auth.uid() = post_owner_id
    AND EXISTS (
      SELECT 1 FROM posts
      WHERE id = post_id
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

-- Participants can update exchange status (e.g., confirm or cancel)
DROP POLICY IF EXISTS "Participants can update exchanges" ON exchanges;
CREATE POLICY "Participants can update exchanges" ON exchanges
  FOR UPDATE
  USING (auth.uid() IN (post_owner_id, finder_id));

-- ============================================================================
-- RATINGS POLICIES
-- ============================================================================

-- Anyone can view ratings (public reputation system)
DROP POLICY IF EXISTS "Anyone can view ratings" ON ratings;
CREATE POLICY "Anyone can view ratings" ON ratings
  FOR SELECT
  USING (true);

-- Participants can submit ratings for their exchanges
DROP POLICY IF EXISTS "Participants can rate" ON ratings;
CREATE POLICY "Participants can rate" ON ratings
  FOR INSERT
  WITH CHECK (
    auth.uid() = rater_id
    AND EXISTS (
      SELECT 1 FROM exchanges
      WHERE id = exchange_id
      AND auth.uid() IN (post_owner_id, finder_id)
      AND status IN ('pending', 'confirmed')
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

-- Comments on reputation system design:
--
-- 1. user_profiles.profile_picture stores URL (can be Supabase Storage URL)
-- 2. Exchanges enforce: one per post, can't exchange with yourself
-- 3. Ratings enforce: 1-5 stars, one rating per user per exchange, can't rate yourself
-- 4. Automatic completion: When both users rate, exchange and post marked complete
-- 5. RLS ensures: Only participants can see/interact with their exchanges
-- 6. Ratings are public to maintain transparent reputation system
-- 7. successful_exchanges counter updates automatically on completion
--
-- Flow: Post owner marks found → Exchange created → Both users rate → Auto-complete

COMMENT ON TABLE user_profiles IS 'User profile information and reputation metrics';
COMMENT ON TABLE exchanges IS 'Tracks item exchanges between users for rating';
COMMENT ON TABLE ratings IS '5-star ratings given after successful exchanges';

COMMENT ON COLUMN user_profiles.profile_picture IS 'URL to user profile image';
COMMENT ON COLUMN user_profiles.rating_avg IS 'Average rating (0.00 to 5.00)';
COMMENT ON COLUMN user_profiles.successful_exchanges IS 'Count of completed exchanges';
COMMENT ON COLUMN exchanges.status IS 'pending | confirmed | completed | cancelled';
COMMENT ON COLUMN ratings.rating IS '1 to 5 stars';
