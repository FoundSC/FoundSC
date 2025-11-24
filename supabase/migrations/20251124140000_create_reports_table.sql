-- Reports table for flagging misbehaving users / problematic content

-- 1) Table definition
CREATE TABLE IF NOT EXISTS reports (
  id                BIGSERIAL PRIMARY KEY,
  reported_user_id  UUID NOT NULL,
  reporter_user_id  UUID, -- nullable to allow anonymous reports
  post_id           INTEGER REFERENCES posts(id) ON DELETE SET NULL,
  reason            TEXT NOT NULL,
  message           TEXT,
  status            TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','dismissed')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helpful index for admin views (filter by status / date)
CREATE INDEX IF NOT EXISTS idx_reports_status_created
  ON reports (status, created_at DESC);

-- 2) Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- 3) RLS policies
-- MVP: allow any client to create a report; only admins/service-role can see all.
-- Later you can tighten to auth.uid() and/or per-role checks.

-- Allow public to insert reports (anyone can report)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.tablename = 'reports' AND p.policyname = 'Public insert reports'
  ) THEN
    CREATE POLICY "Public insert reports" ON reports
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- Allow everyone to read only their own reports (by reporter_user_id) OR none if anonymous.
-- Admins using service role bypass RLS.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.tablename = 'reports' AND p.policyname = 'Reporter read own reports'
  ) THEN
    CREATE POLICY "Reporter read own reports" ON reports
      FOR SELECT
      USING (
        -- If reporter_user_id is set, only that user can see the row under anon/auth token
        reporter_user_id IS NULL
        OR reporter_user_id = auth.uid()
      );
  END IF;
END $$;

-- (Optional) Allow reporters to update status/message of their own reports.
-- For MVP, we leave updates to admins only (via service role), so no UPDATE policy.

-- Admin-only updates: done via service role key which bypasses RLS.
