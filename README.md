# FoundSC - Lost & Found App

A Lost & Found application built with Supabase for managing lost and found items on campus.

## Features

- Post lost items
- Post found items
- Browse and search items by category, type, and location
- Contact information for item recovery

## Prerequisites

- Docker Desktop installed and running
- Supabase CLI installed (see installation options below)

### Install Supabase CLI

**Via NPM:**
```bash
npm i supabase --save-dev
```

**Via Homebrew (macOS/Linux):**
```bash
brew install supabase/tap/supabase
```

**Via Scoop (Windows):**
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

## Running Local Supabase Server

### 1. Start Supabase

Make sure Docker is running, then start the local Supabase stack:

```bash
supabase start
```

This will start all Supabase services including:
- PostgreSQL database
- PostgREST API server
- Supabase Studio (web UI)
- Auth server
- Storage server
- Analytics

**Note for Windows/WSL users:** If you encounter port permission errors, the ports in `supabase/config.toml` have been configured to avoid Windows reserved port ranges.

After starting, you'll see output with your local URLs and keys:
```
API URL: http://127.0.0.1:8000
Database URL: postgresql://postgres:postgres@127.0.0.1:5432/postgres
Studio URL: http://127.0.0.1:3001
```

### 2. Access Supabase Studio

Open your browser and navigate to:
```
http://127.0.0.1:3001
```

Here you can:
- View and edit tables
- Run SQL queries
- Test API endpoints
- Monitor logs

### 3. Understanding Seed Data

**What is seed data?**

Seed data is sample/test data that gets inserted into your database tables to help you develop and test your application. Instead of starting with an empty database, seed data gives you realistic examples to work with right away.

**How it works in Supabase:**

- Seed data is defined in [supabase/seed.sql](supabase/seed.sql)
- This file contains SQL INSERT statements that populate your tables with sample records
- Seed data is automatically loaded when you run `supabase db reset`
- It runs AFTER migrations, so your tables must exist first

**Our seed data includes:**

The `seed.sql` file contains 8 sample posts including lost items (iPhone, student ID, bike keys, backpack) and found items (water bottle, laptop charger, textbook, sunglasses) spread across different campus locations. This gives you realistic data to test queries, filters, and the UI.

**Why use seed data?**

- Test your application without manually creating data
- Ensure consistent test data across the team
- Quickly reset to a known good state during development
- Practice SQL queries with realistic examples

### 4. Reset Database (Apply Migrations and Seeds)

To reset your database to a clean state with all migrations and seed data:

```bash
supabase db reset
```

This will:
1. Drop all existing tables
2. Run all migration files in `supabase/migrations/`
3. Load seed data from `supabase/seed.sql`

### 5. Query the Database via CLI

**Connect to PostgreSQL via Docker:**

```bash
# Find the database container
docker ps | grep postgres

# Connect to the database
docker exec -it supabase_db_FoundSC psql -U postgres
```

**Inside psql, run queries:**

```sql
-- Disable pager for easier viewing
\pset pager off

-- View all posts
SELECT * FROM posts;

-- Filter by type
SELECT * FROM posts WHERE type = 'lost';

-- Count posts by category
SELECT category, COUNT(*) FROM posts GROUP BY category;

-- Exit psql
\q
```

**Quick one-liner queries:**

```bash
# View all posts
docker exec -it supabase_db_FoundSC psql -U postgres -c "\pset pager off" -c "SELECT * FROM posts;"

# Count posts
docker exec -it supabase_db_FoundSC psql -U postgres -c "SELECT COUNT(*) FROM posts;"
```

### 6. Test the REST API

Use the API URL with curl or your application:

```bash
# Get all posts (replace with your actual anon key from supabase start output)
curl 'http://127.0.0.1:8000/rest/v1/posts' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Filter by type
curl 'http://127.0.0.1:8000/rest/v1/posts?type=eq.lost' \
  -H "apikey: YOUR_ANON_KEY"
```

### 7. Stop Supabase

When you're done:

```bash
supabase stop
```

## Database Schema

The `posts` table includes:
- `id` - Auto-incrementing primary key
- `title` - Post title (required)
- `description` - Detailed description
- `type` - 'lost' or 'found' (required)
- `category` - Item category (electronics, personal, ids, keys, books, bags, accessories)
- `image_url` - Optional image URL
- `location` - Where the item was lost/found
- `contact_info` - Contact information
- `created_at` - Timestamp (auto-generated)
- `updated_at` - Timestamp (auto-updated via trigger)

## Development

For more Supabase CLI commands, see the [official documentation](https://supabase.com/docs/reference/cli/about).
