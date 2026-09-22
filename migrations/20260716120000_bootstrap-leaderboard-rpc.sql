-- Older backend installations already had this signature before the
-- 2026-07-17 privilege hardening migration. A fresh installation needs it.
CREATE OR REPLACE FUNCTION public.leaderboard_usage_grouped(timestamptz, timestamptz)
RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT '[]'::jsonb $$;
REVOKE ALL ON FUNCTION public.leaderboard_usage_grouped(timestamptz, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.leaderboard_usage_grouped(timestamptz, timestamptz)
  TO project_admin;
