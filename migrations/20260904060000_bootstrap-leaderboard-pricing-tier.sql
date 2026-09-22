-- The total rollup migration expects a pricing tier on daily rows.
ALTER TABLE public.tokentracker_leaderboard_rollup_daily_v2
  ADD COLUMN IF NOT EXISTS pricing_tier text NOT NULL DEFAULT 'peak';
