DROP POLICY IF EXISTS "Post owner can update successful return" ON successful_returns;
CREATE POLICY "Post owner can update successful return" ON successful_returns
  FOR UPDATE
  USING (
    auth.uid() = owner_id AND EXISTS (SELECT 1 FROM posts WHERE id = post_id AND user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = owner_id AND EXISTS (SELECT 1 FROM posts WHERE id = post_id AND user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION adjust_successful_returns_on_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.finder_id IS DISTINCT FROM OLD.finder_id THEN
    UPDATE user_profiles
    SET successful_exchanges = GREATEST(0, successful_exchanges - 1),
        updated_at = NOW()
    WHERE id = OLD.finder_id;

    UPDATE user_profiles
    SET successful_exchanges = successful_exchanges + 1,
        updated_at = NOW()
    WHERE id = NEW.finder_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_successful_return_update ON successful_returns;
CREATE TRIGGER on_successful_return_update
  AFTER UPDATE ON successful_returns
  FOR EACH ROW
  EXECUTE FUNCTION adjust_successful_returns_on_update();
