-- Allow anyone to delete posts (MVP). Tighten later with auth/ownership constraints.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'posts' AND p.policyname = 'Anyone can delete posts'
  ) THEN
    CREATE POLICY "Anyone can delete posts" ON posts
      FOR DELETE USING (true);
  END IF;
END $$;
