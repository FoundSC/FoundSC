-- Change foreign keys in ratings table to reference user_profiles instead of auth.users
-- This allows PostgREST to detect the relationship and enable joins

ALTER TABLE ratings
  DROP CONSTRAINT IF EXISTS ratings_rater_id_fkey,
  DROP CONSTRAINT IF EXISTS ratings_ratee_id_fkey;

ALTER TABLE ratings
  ADD CONSTRAINT ratings_rater_id_fkey
  FOREIGN KEY (rater_id)
  REFERENCES user_profiles(id)
  ON DELETE CASCADE;

ALTER TABLE ratings
  ADD CONSTRAINT ratings_ratee_id_fkey
  FOREIGN KEY (ratee_id)
  REFERENCES user_profiles(id)
  ON DELETE CASCADE;
