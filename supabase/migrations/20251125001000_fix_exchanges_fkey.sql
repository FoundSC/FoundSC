-- Change foreign keys in exchanges table to reference user_profiles instead of auth.users
-- This allows PostgREST to detect the relationship and enable joins

ALTER TABLE exchanges
  DROP CONSTRAINT IF EXISTS exchanges_post_owner_id_fkey,
  DROP CONSTRAINT IF EXISTS exchanges_finder_id_fkey;

ALTER TABLE exchanges
  ADD CONSTRAINT exchanges_post_owner_id_fkey
  FOREIGN KEY (post_owner_id)
  REFERENCES user_profiles(id)
  ON DELETE CASCADE;

ALTER TABLE exchanges
  ADD CONSTRAINT exchanges_finder_id_fkey
  FOREIGN KEY (finder_id)
  REFERENCES user_profiles(id)
  ON DELETE CASCADE;
