-- Add latitude and longitude columns to posts table for map functionality
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Add PostGIS extension for geographic queries (optional but recommended for advanced spatial features)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add spatial index for efficient bounding box queries
-- This will significantly improve performance when querying posts within map viewport
CREATE INDEX IF NOT EXISTS idx_posts_coordinates
  ON posts USING gist (
    ST_MakePoint(longitude, latitude)
  )
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add constraints to validate coordinate ranges
-- Latitude must be between -90 (South Pole) and 90 (North Pole)
-- Longitude must be between -180 and 180
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'valid_latitude'
      AND conrelid = 'public.posts'::regclass
  ) THEN
    ALTER TABLE posts
      ADD CONSTRAINT valid_latitude CHECK (latitude >= -90 AND latitude <= 90);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'valid_longitude'
      AND conrelid = 'public.posts'::regclass
  ) THEN
    ALTER TABLE posts
      ADD CONSTRAINT valid_longitude CHECK (longitude >= -180 AND longitude <= 180);
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN posts.latitude IS 'Geographic latitude in decimal degrees (-90 to 90)';
COMMENT ON COLUMN posts.longitude IS 'Geographic longitude in decimal degrees (-180 to 180)';
