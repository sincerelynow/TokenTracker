-- Base objects required by the incremental migrations in this repository.
-- This file is intentionally earlier than the first historical migration.
CREATE TABLE public.tokentracker_devices (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name text NOT NULL,
  platform text NOT NULL,
  machine_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE UNIQUE INDEX tokentracker_devices_active_unique
  ON public.tokentracker_devices(user_id, platform, device_name)
  WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX tokentracker_devices_machine_unique
  ON public.tokentracker_devices(user_id, machine_id)
  WHERE machine_id IS NOT NULL AND revoked_at IS NULL;

CREATE TABLE public.tokentracker_device_tokens (
  id uuid PRIMARY KEY,
  device_id uuid NOT NULL REFERENCES public.tokentracker_devices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE TABLE public.tokentracker_device_codes (
  device_code text PRIMARY KEY,
  user_code text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  client_info text,
  machine_id text,
  expires_at timestamptz NOT NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.tokentracker_device_machine (
  device_id uuid PRIMARY KEY REFERENCES public.tokentracker_devices(id) ON DELETE CASCADE,
  machine_cluster_id text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tokentracker_hourly (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id uuid NOT NULL REFERENCES public.tokentracker_devices(id) ON DELETE CASCADE,
  hour_start timestamptz NOT NULL,
  source text NOT NULL,
  model text NOT NULL,
  input_tokens bigint NOT NULL DEFAULT 0,
  cached_input_tokens bigint NOT NULL DEFAULT 0,
  cache_creation_input_tokens bigint NOT NULL DEFAULT 0,
  output_tokens bigint NOT NULL DEFAULT 0,
  reasoning_output_tokens bigint NOT NULL DEFAULT 0,
  total_tokens bigint NOT NULL DEFAULT 0,
  billable_total_tokens bigint NOT NULL DEFAULT 0,
  total_cost_usd numeric NOT NULL DEFAULT 0,
  conversations bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, device_id, hour_start, source, model)
);
CREATE INDEX tokentracker_hourly_user_hour_idx ON public.tokentracker_hourly(user_id, hour_start);
CREATE INDEX tokentracker_hourly_hour_idx ON public.tokentracker_hourly(hour_start);
CREATE TABLE public.tokentracker_hourly_quarantine (
  LIKE public.tokentracker_hourly INCLUDING DEFAULTS,
  quarantined_at timestamptz NOT NULL DEFAULT now(),
  quarantine_reason text NOT NULL
);

CREATE TABLE public.tokentracker_user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  leaderboard_public boolean NOT NULL DEFAULT false,
  leaderboard_anonymous boolean NOT NULL DEFAULT false,
  display_name text,
  github_url text,
  show_github_url boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE VIEW public.tokentracker_user_profiles AS
  SELECT u.id AS user_id,
    COALESCE(s.display_name, u.profile->>'name', split_part(u.email, '@', 1)) AS display_name,
    COALESCE(u.profile->>'avatar_url', u.profile->>'picture') AS avatar_url
  FROM auth.users u
  LEFT JOIN public.tokentracker_user_settings s ON s.user_id = u.id;
CREATE TABLE public.tokentracker_public_views (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE TABLE public.tokentracker_profile_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  liker_id text NOT NULL,
  is_authenticated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (target_user_id, liker_id)
);
CREATE TABLE public.tokentracker_telemetry_daily (
  machine_hash text NOT NULL,
  day date NOT NULL,
  app_version text,
  platform text,
  shell text,
  first_seen_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  PRIMARY KEY (machine_hash, day)
);

CREATE TABLE public.tokentracker_leaderboard_rollup_daily (
  user_id uuid NOT NULL,
  source text NOT NULL,
  model text NOT NULL,
  day date NOT NULL,
  total_tokens bigint NOT NULL DEFAULT 0,
  input_tokens bigint NOT NULL DEFAULT 0,
  output_tokens bigint NOT NULL DEFAULT 0,
  cached_input_tokens bigint NOT NULL DEFAULT 0,
  cache_creation_input_tokens bigint NOT NULL DEFAULT 0,
  reasoning_output_tokens bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, source, model, day)
);
CREATE TABLE public.tokentracker_leaderboard_rollup_meta (
  id int PRIMARY KEY CHECK (id = 1),
  through timestamptz NOT NULL,
  repair_from date NOT NULL,
  rebuilt_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.tokentracker_leaderboard_snapshots (
  user_id uuid NOT NULL,
  period text NOT NULL,
  from_day date NOT NULL,
  to_day date NOT NULL,
  rank int NOT NULL,
  display_name text,
  avatar_url text,
  is_public boolean NOT NULL DEFAULT true,
  total_tokens bigint NOT NULL DEFAULT 0,
  estimated_cost_usd numeric NOT NULL DEFAULT 0,
  gpt_tokens bigint NOT NULL DEFAULT 0,
  claude_tokens bigint NOT NULL DEFAULT 0,
  gemini_tokens bigint NOT NULL DEFAULT 0,
  cursor_tokens bigint NOT NULL DEFAULT 0,
  opencode_tokens bigint NOT NULL DEFAULT 0,
  openclaw_tokens bigint NOT NULL DEFAULT 0,
  hermes_tokens bigint NOT NULL DEFAULT 0,
  kiro_tokens bigint NOT NULL DEFAULT 0,
  copilot_tokens bigint NOT NULL DEFAULT 0,
  kimi_tokens bigint NOT NULL DEFAULT 0,
  other_tokens bigint NOT NULL DEFAULT 0,
  github_url text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, period, from_day, to_day)
);

CREATE TABLE public.tokentracker_badge_catalog (
  badge_id text PRIMARY KEY,
  sort_order int NOT NULL,
  lower_is_better boolean NOT NULL DEFAULT false,
  bronze numeric NOT NULL,
  silver numeric NOT NULL,
  gold numeric NOT NULL,
  diamond numeric NOT NULL
);
CREATE TABLE public.tokentracker_user_badges (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id text NOT NULL REFERENCES public.tokentracker_badge_catalog(badge_id),
  tier smallint NOT NULL DEFAULT 0,
  metric_value numeric NOT NULL DEFAULT 0,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  bronze_at timestamptz,
  silver_at timestamptz,
  gold_at timestamptz,
  diamond_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

CREATE TABLE public.tokentracker_leaderboard_anomaly_flags (
  user_id uuid NOT NULL,
  day date NOT NULL,
  status text NOT NULL DEFAULT 'review',
  detected_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  note text,
  peak_source text,
  peak_model text,
  cohort_ratio numeric,
  PRIMARY KEY (user_id, day)
);
CREATE TABLE public.tokentracker_anticheat_config (
  key text PRIMARY KEY,
  value numeric NOT NULL
);
INSERT INTO public.tokentracker_anticheat_config (key, value)
VALUES ('lookback_days', 14);

-- All application tables are service-only. Public reads are served by edge
-- functions after authorization and explicit projection.
DO $ddl$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    AND tablename LIKE 'tokentracker_%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t.tablename);
    EXECUTE format('GRANT ALL ON public.%I TO project_admin', t.tablename);
  END LOOP;
END
$ddl$;
REVOKE ALL ON public.tokentracker_user_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.tokentracker_user_profiles TO project_admin;

-- A later migration replaces account_usage_grouped. This initial signature
-- allows early hot-path migrations to be applied in order.
CREATE FUNCTION public.account_usage_grouped(uuid, uuid[], timestamptz, timestamptz, text, text, integer)
RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT '[]'::jsonb $$;
REVOKE ALL ON FUNCTION public.account_usage_grouped(uuid, uuid[], timestamptz, timestamptz, text, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.account_usage_grouped(uuid, uuid[], timestamptz, timestamptz, text, text, integer)
  TO project_admin;

CREATE FUNCTION public.leaderboard_hourly_dedup(timestamptz, timestamptz)
RETURNS TABLE(user_id uuid, source text, model text, hour_start timestamptz,
  total_tokens bigint, input_tokens bigint, output_tokens bigint,
  cached_input_tokens bigint, cache_creation_input_tokens bigint,
  reasoning_output_tokens bigint)
LANGUAGE sql STABLE AS $$
  SELECT h.user_id, h.source, h.model, h.hour_start, h.total_tokens,
    h.input_tokens, h.output_tokens, h.cached_input_tokens,
    h.cache_creation_input_tokens, h.reasoning_output_tokens
  FROM public.tokentracker_hourly h
  WHERE h.hour_start >= $1 AND h.hour_start < $2
$$;
REVOKE ALL ON FUNCTION public.leaderboard_hourly_dedup(timestamptz, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.leaderboard_hourly_dedup(timestamptz, timestamptz)
  TO project_admin;

CREATE FUNCTION public.leaderboard_usage_grouped(timestamptz, timestamptz)
RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT '[]'::jsonb $$;
REVOKE ALL ON FUNCTION public.leaderboard_usage_grouped(timestamptz, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.leaderboard_usage_grouped(timestamptz, timestamptz)
  TO project_admin;
