-- ============================================================
-- Survival Arena - pending_revives Table Migration
-- Cross-device friend revival tokens
-- Run this in Supabase SQL Editor: https://app.supabase.com
-- ============================================================

CREATE TABLE IF NOT EXISTS pending_revives (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  from_player TEXT NOT NULL,
  to_player   TEXT NOT NULL,
  time        BIGINT NOT NULL
);

-- Index for fast lookup by recipient
CREATE INDEX IF NOT EXISTS idx_pending_revives_to_player
  ON pending_revives (to_player);

-- Index for fast lookup by sender (dedup checks)
CREATE INDEX IF NOT EXISTS idx_pending_revives_from_player
  ON pending_revives (from_player);

-- Composite index for dedup queries
CREATE INDEX IF NOT EXISTS idx_pending_revives_pair
  ON pending_revives (from_player, to_player);

-- Enable Row Level Security
ALTER TABLE pending_revives ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (game clients use publishable key)
CREATE POLICY "Allow anonymous insert" ON pending_revives
  FOR INSERT WITH CHECK (true);

-- Allow anonymous selects
CREATE POLICY "Allow anonymous select" ON pending_revives
  FOR SELECT USING (true);

-- Allow anonymous deletes (for consuming revives after verification)
CREATE POLICY "Allow anonymous delete" ON pending_revives
  FOR DELETE USING (true);
