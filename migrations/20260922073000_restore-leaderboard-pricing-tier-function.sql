-- Existing leaderboard rollup RPCs call this helper, but the historical
-- migrations did not include its definition for a new InsForge project.
CREATE OR REPLACE FUNCTION public.leaderboard_pricing_tier(
  p_model text,
  p_hour_start timestamptz
) RETURNS text
LANGUAGE sql STABLE
SET search_path TO pg_catalog, public
AS $func$
  SELECT CASE
    WHEN lower(coalesce(p_model, '')) NOT LIKE '%deepseek-v4-flash%'
     AND lower(coalesce(p_model, '')) NOT LIKE '%deepseek-v4.1-flash%'
     AND lower(coalesce(p_model, '')) NOT LIKE '%deepseek-flash%'
     AND lower(coalesce(p_model, '')) NOT LIKE '%deepseek-v4-pro%'
      THEN 'peak'
    WHEN p_hour_start >= timestamptz '2026-08-22 16:00:00+00'
     AND extract(isodow FROM p_hour_start AT TIME ZONE 'Asia/Shanghai') IN (6, 7)
      THEN 'off_peak'
    WHEN extract(hour FROM p_hour_start AT TIME ZONE 'UTC') BETWEEN 1 AND 3
      OR extract(hour FROM p_hour_start AT TIME ZONE 'UTC') BETWEEN 6 AND 9
      THEN 'peak'
    ELSE 'off_peak'
  END
$func$;

REVOKE ALL ON FUNCTION public.leaderboard_pricing_tier(text, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.leaderboard_pricing_tier(text, timestamptz)
  TO project_admin;
