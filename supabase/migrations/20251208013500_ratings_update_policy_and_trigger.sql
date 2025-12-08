-- Allow rater to update their existing rating (needed for upsert)
DROP POLICY IF EXISTS "Users can update rating" ON ratings;
CREATE POLICY "Users can update rating" ON ratings
  FOR UPDATE
  USING (
    -- Allow the post owner (rater) to update their own rating row for that post
    auth.uid() = rater_id
    AND EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = ratings.post_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Enforce that updated/new rating still targets the current successful return finder
    auth.uid() = rater_id
    AND EXISTS (
      SELECT 1 FROM successful_returns sr
      WHERE sr.post_id = ratings.post_id
        AND sr.owner_id = auth.uid()
        AND sr.finder_id = ratings.ratee_id
    )
  );

-- Ensure reputation recalculates when a rating is updated
DROP TRIGGER IF EXISTS on_rating_added ON ratings;
CREATE TRIGGER on_rating_added
  AFTER INSERT OR UPDATE ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION award_star_rating();
