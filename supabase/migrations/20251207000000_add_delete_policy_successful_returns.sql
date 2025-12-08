-- ============================================================================
-- ADD DELETE POLICY FOR SUCCESSFUL_RETURNS
-- Allows post owners to unmark their posts as found
-- ============================================================================

-- Post owner can delete successful return (to unmark as found)
DROP POLICY IF EXISTS "Post owner can delete successful return" ON successful_returns;
CREATE POLICY "Post owner can delete successful return" ON successful_returns
  FOR DELETE USING (
    auth.uid() = owner_id
    AND EXISTS (
      SELECT 1 FROM posts WHERE id = post_id AND user_id = auth.uid()
    )
  );

-- Also add delete policy for ratings tied to the post
DROP POLICY IF EXISTS "Post owner can delete ratings for their post" ON ratings;
CREATE POLICY "Post owner can delete ratings for their post" ON ratings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM posts WHERE id = ratings.post_id AND user_id = auth.uid()
    )
  );
