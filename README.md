# FoundSC
🎒 **Campus Lost & Found App**

## 🔍 The Problem

Students lose things all the time (water bottles, laptops, IDs, bikes, calculators).

Current systems are clunky → either you email campus police or check a random office.

People who find things don't have an easy way to post them.

## 💡 The Solution

A campus-wide lost & found app where students can:

- **Report Lost Items** → post what you lost, with pics & last seen location
- **Report Found Items** → upload item pics, drop-off info, or keep until claimed
- **Smart Matching** → app suggests matches between lost + found reports
- **Location Map** → pin where items were last seen or turned in

## 🚀 Core Features (MVP)

- **Lost/Found Feed**: Scrollable feed of reported items (like a marketplace)
- **Filters & Search**: Search by category (electronics, clothing, IDs, bikes)
- **Anonymous Option**: Post found items without revealing identity
- **Notification System**: "Someone just reported a found laptop near SNE Library"

## 🛠️ Technology Stack

- **Frontend**: React Native (iOS + Android)
- **Backend**: Supabase with PostgreSQL
- **Authentication**: University SSO (Google OAuth w/ .edu restriction)

## 📁 Project Structure

```
app/
├── screens/           # Major UI views
├── lib/              # Utility and API setup files
│   └── supabase.js   # Supabase client configuration
├── navigation/       # React Navigation setup
│   └── AppNavigator.js  # Stack/tab navigation definitions
├── components/       # Reusable UI components
└── constants/        # App constants and configurations

supabase/
├── migrations/       # SQL schema versioning files
└── config.toml      # Local project connection settings

Environment Files:
├── .env             # Your actual keys (not in git)
└── .env.example     # Template for teammates
```

## 🗓️ Release Plan

### Sprint 1

#### User Story 1: Post List View
*"As a user, I want to see a list of lost and found posts so I can quickly check if my item has been reported."*

**Goal**: Build the main React Native frontend with list display and navigation.

**Tasks:**
1. ✅ Create blank React Native app project and set up Git repository (1h)
2. ✅ Install and configure Supabase client, react-native-url-polyfill, and cross-fetch (45m)
3. 🔄 Implement navigation with main list screen and Add Post screen routes (1h)
4. 🔄 Design and build main list layout (title, type, created_at, optional thumbnail) (2h)
5. 🔄 Add "Add Post" floating action or header button for navigation to creation page (30m)
6. 🔄 Add loading, empty, and error UI states for list and post screens (1h)

#### User Story 2: Post Creation
*"As a user, I want to create a new post with an image so others can see what I lost or found."*

**Goal**: Build post creation flow with image upload and database insertion.

**Tasks:**
1. 🔄 Create Add Post screen with input fields (title, description, type [lost/found], category, date) (2h)
2. 🔄 Add image picker for photo selection, preview, and basic file size validation (2h)
3. 🔄 Upload selected image to Supabase Storage, get public URL (1h)
4. 🔄 Insert new post row into Supabase 'posts' table using image URL (1h)
5. 🔄 Show success message and navigate back to list with refreshed data (1h)

#### User Story 3: Database Setup
*"As a user, I want to view posts stored in a database so my data is persistent and shared across devices."*

**Goal**: Build and configure PostgreSQL/Supabase backend.

**Tasks:**
1. 🔄 Create 'posts' table with required fields (1h)
2. 🔄 Add helpful indexes on created_at DESC and type for filtering (15m)
3. 🔄 Enable Row Level Security (RLS) and create policies (30m)
4. 🔄 Create public storage bucket named 'items' for images (15m)
5. 🔄 Seed 5–10 dummy rows using SQL insert statements for testing (30m)
6. 🔄 Test with quick sanity queries (15m)

#### User Story 4: Integration
*"As a user, I want the app to update automatically when I create a post, so I immediately see my new entry."*

**Goal**: Integrate frontend and backend to complete the MVP flow.

**Tasks:**
1. ✅ Set up environment variables (Supabase URL and anon key) in app (30m)
2. 🔄 Connect frontend list to live Supabase data and verify it renders dummy rows (30m)
3. 🔄 Connect create post flow end-to-end (image upload → insert → refetch list) (1h)
4. 🔄 Conduct QA checks: text-only post, image post, large image rejection, offline/slow network handling (1h)
5. 🔄 Polish UI: spacing, icons, small copy tweaks (30m)

### Team Responsibilities
- **Frontend (FE1 & FE2)**: User stories 1 and 2 - Create blank app → list main page + Add Post → post creation with image upload
- **Backend (BE1 & BE2 & BE3)**: User story 3 - Create database + data model → seed dummy data
- **Integration (shared)**: User story 4 - Connect frontend and backend end-to-end
