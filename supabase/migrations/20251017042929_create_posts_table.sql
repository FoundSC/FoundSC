-- Create posts table for Lost & Found app
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('lost', 'found')),
    category TEXT NOT NULL,
    image_url TEXT,
    location TEXT,
    contact_info TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_posts_created_at ON posts (created_at DESC);
CREATE INDEX idx_posts_type ON posts (type);
CREATE INDEX idx_posts_category ON posts (category);
CREATE INDEX idx_posts_type_created_at ON posts (type, created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access (MVP)
-- Allow anyone to read all posts
CREATE POLICY "Anyone can view posts" ON posts
    FOR SELECT USING (true);

-- Allow anyone to insert posts (for MVP - will restrict later)
CREATE POLICY "Anyone can create posts" ON posts
    FOR INSERT WITH CHECK (true);

-- Allow anyone to update their own posts (basic version)
CREATE POLICY "Anyone can update posts" ON posts
    FOR UPDATE USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
