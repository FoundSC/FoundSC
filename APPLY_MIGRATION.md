# Apply Map Feature Migration to Cloud Supabase

Since this project uses **cloud Supabase** (not local), you need to apply the migration through the Supabase Dashboard.

## Steps to Apply Migration

### Option 1: Via Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Open: https://supabase.com/dashboard
   - Navigate to your project: `jvxyoybuwxtpzsvzevbp`

2. **Open SQL Editor**
   - In the left sidebar, click on "SQL Editor"
   - Click "New query"

3. **Copy and Run the Migration SQL**
   - Copy the contents from `supabase/migrations/20251110000000_add_geographic_columns.sql`
   - Paste into the SQL Editor
   - Click "Run" or press `Ctrl+Enter`

4. **Verify Migration**
   - Go to "Table Editor" in the left sidebar
   - Select the `posts` table
   - Confirm that `latitude` and `longitude` columns now exist

### Option 2: Via Supabase CLI (If Installed)

```bash
# Link to your cloud project
supabase link --project-ref jvxyoybuwxtpzsvzevbp

# Push migrations to cloud
supabase db push
```

## Migration SQL

Here's what will be applied:

```sql
-- Add latitude and longitude columns to posts table for map functionality
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Add PostGIS extension for geographic queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add spatial index for efficient bounding box queries
CREATE INDEX IF NOT EXISTS idx_posts_coordinates
  ON posts USING gist (
    ST_MakePoint(longitude, latitude)
  )
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add constraints to validate coordinate ranges
ALTER TABLE posts
  ADD CONSTRAINT valid_latitude CHECK (latitude >= -90 AND latitude <= 90),
  ADD CONSTRAINT valid_longitude CHECK (longitude >= -180 AND longitude <= 180);

-- Add comments for documentation
COMMENT ON COLUMN posts.latitude IS 'Geographic latitude in decimal degrees (-90 to 90)';
COMMENT ON COLUMN posts.longitude IS 'Geographic longitude in decimal degrees (-180 to 180)';
```

## After Migration

Once the migration is applied, your posts table will have:
- ✅ `latitude` column (DOUBLE PRECISION, nullable)
- ✅ `longitude` column (DOUBLE PRECISION, nullable)
- ✅ PostGIS extension enabled
- ✅ Spatial index for efficient map queries
- ✅ Validation constraints for coordinate ranges

## Testing

To verify the migration worked, run this query in SQL Editor:

```sql
-- Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'posts'
  AND column_name IN ('latitude', 'longitude');

-- Test inserting a post with location
INSERT INTO posts (title, description, type, category, latitude, longitude)
VALUES ('Test Item', 'Testing map feature', 'lost', 'Electronics', 36.9741, -122.0308)
RETURNING *;
```
