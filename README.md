# FoundSC - Lost & Found App

Lost & Found mobile app built with Expo + React Native and Supabase. Includes posting lost/found items, map view, and push notifications for potential matches.

## Quick Start

- Install tools
  - Node.js (LTS), npm
  - Supabase CLI: `brew install supabase/tap/supabase` or `npm i -D supabase`
  - Expo CLI (bundled via npx)

- Environment variables (create `.env`)
  - Required for the app:
    - `EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co`
    - `EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>`

- Install dependencies
  - Base install: `npm install`
  - Expo-native modules (SDK-compatible):
    - `npx expo install expo-notifications expo-location react-native-maps @react-native-picker/picker expo-secure-store expo-constants`

- Run the app
  - Fast: `npx expo start -c` and open on a physical iPhone with Expo Go
  - If using newer native modules or Android push: build a Dev Client
    - `npx expo install expo-dev-client`
    - `eas build -p ios --profile development` (or `npx expo run:ios`/`run:android`)

## Supabase (Remote) Setup

- Apply DB migrations
  - `supabase db push`

- Deploy Edge Function (dispatcher)
  - `supabase functions deploy dispatch-notifications`
  - Set function secrets in Dashboard → Functions → dispatch-notifications → Secrets
    - `SUPABASE_URL = https://<your-project>.supabase.co`
    - `SUPABASE_SERVICE_ROLE_KEY = <your service role key>`

- Optional schedule (every minute)
  - Dashboard → Functions → Schedules → New → Function: `dispatch-notifications`, Cron: `* * * * *`

## Test Push Notifications

1) Register a device token
- Open the app on a physical iPhone and accept notifications.
- Verify in SQL:
  ```sql
  select platform, token, last_seen from device_push_tokens order by last_seen desc limit 5;
  ```

2) Quick manual test (no trigger)
- Pick a post id and insert a pending row:
  ```sql
  select id from posts order by created_at desc limit 1;
  insert into notifications (post_id, device_token, message, status)
  values (<POST_ID>, 'ExponentPushToken[XXXXXXXX...]', 'Hello from dispatcher test', 'pending');
  ```
- Invoke the dispatcher with your anon key:
  ```bash
  export SUPA_ANON="<paste-anon-key>"
  curl -sS -X POST \
    "https://<your-project>.functions.supabase.co/dispatch-notifications" \
    -H "Authorization: Bearer $SUPA_ANON"
  ```
- Confirm status:
  ```sql
  select id, status, error, sent_at from notifications order by created_at desc limit 10;
  ```

3) Full matching flow (trigger)
- Create a LOST post in the app; rules are auto-upserted from title/description.
- Create a FOUND post with matching category/keywords.
- Invoke dispatcher (same curl) and expect a push.

## Troubleshooting

- Invalid JWT from curl: the header token is empty/wrong. Paste the anon key or export it first.
- No token row: ensure permission granted and `extra.eas.projectId` is present in config.
- Android push in Expo Go is not supported; use a Dev Client.
- Expo native versions: align with SDK using `npx expo install ...` or `npx expo doctor --fix-dependencies`.

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
### Team Responsibilities
- **Frontend (FE1 & FE2)**: User stories 1 and 2 - Create blank app → list main page + Add Post → post creation with image upload
- **Backend (BE1 & BE2 & BE3)**: User story 3 - Create database + data model → seed dummy data
- **Integration (shared)**: User story 4 - Connect frontend and backend end-to-end


### App Set Up
1. Make sure you have npm and npx installed: If *npm -v* and *npx -v* do not show a version, install them.
2. Install expo by doing *npm install expo*
3. Install the required packages using *npm install*
4. There may still be some packages that you need to install. If so, do *npm install [package] --legacy-peer-deps*
5. To run the app, type *npx expo start* and press "w" on your keyboard.
