-- ============================================================
-- 游戏分析统计 — Supabase 建表 SQL
-- ============================================================
-- 在 Supabase Dashboard → SQL Editor 中执行以下语句
-- ============================================================

-- 1. 创建游戏事件表
CREATE TABLE IF NOT EXISTS game_events (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  event_type    TEXT NOT NULL,
  player_id     TEXT NOT NULL,
  session_id    TEXT NOT NULL,
  event_data    JSONB DEFAULT '{}',
  timestamp     TIMESTAMPTZ NOT NULL,
  user_agent    TEXT,
  screen_size   TEXT,
  language      TEXT,
  page_url      TEXT
);

-- 2. 索引（按需加速查询）
CREATE INDEX IF NOT EXISTS idx_events_type      ON game_events (event_type);
CREATE INDEX IF NOT EXISTS idx_events_player     ON game_events (player_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp  ON game_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_session    ON game_events (session_id);

-- 3. 启用 RLS（行级安全）— 允许匿名插入
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;

-- 允许所有人写入（因为 publishable key 是非敏感的）
CREATE POLICY "Allow anonymous insert" ON game_events
  FOR INSERT WITH CHECK (true);

-- 只允许管理员 SELECT（可选：创建 admin 角色后启用）
-- CREATE POLICY "Allow admin select" ON game_events
--   FOR SELECT USING (auth.role() = 'authenticated');

-- 4. 定期清理旧数据（可选：Supabase 自带 pg_cron）
-- SELECT cron.schedule(
--   'cleanup-old-events',
--   '0 3 * * 0',  -- 每周日凌晨 3 点
--   $$ DELETE FROM game_events WHERE timestamp < NOW() - INTERVAL '90 days' $$
-- );
