-- Recalculate averages for both old and new ratee when a rating changes
CREATE OR REPLACE FUNCTION award_star_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Always recalc for the NEW ratee
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

  -- If this is an UPDATE and the ratee changed, recalc for the OLD ratee too
  IF TG_OP = 'UPDATE' AND (NEW.ratee_id IS DISTINCT FROM OLD.ratee_id) THEN
    UPDATE user_profiles
    SET
      rating_avg = (
        SELECT COALESCE(ROUND(AVG(rating)::NUMERIC, 2), 0.00)
        FROM ratings
        WHERE ratee_id = OLD.ratee_id
      ),
      rating_count = (
        SELECT COUNT(*)
        FROM ratings
        WHERE ratee_id = OLD.ratee_id
      ),
      updated_at = NOW()
    WHERE id = OLD.ratee_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
