-- Clean up orphaned ratings that don't have corresponding successful_returns
-- This removes old rating records from failed tests

-- Option 1: Delete all ratings (nuclear option - use this if you're in testing phase)
DELETE FROM ratings;

-- Option 2: Delete only ratings where there's no corresponding successful_return
-- (uncomment if you want to keep valid ratings)
-- DELETE FROM ratings r
-- WHERE NOT EXISTS (
--   SELECT 1 FROM successful_returns sr
--   WHERE sr.post_id = r.post_id
-- );

-- Reset user rating averages after cleanup
UPDATE user_profiles
SET
  rating_avg = (
    SELECT COALESCE(ROUND(AVG(rating)::NUMERIC, 2), 0.00)
    FROM ratings
    WHERE ratee_id = user_profiles.id
  ),
  rating_count = (
    SELECT COUNT(*)
    FROM ratings
    WHERE ratee_id = user_profiles.id
  );
