-- Align bootstrap objects with the deployed leaderboard and profile edges.
ALTER TABLE public.tokentracker_leaderboard_snapshots
  ADD COLUMN IF NOT EXISTS opencode_tokens bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS openclaw_tokens bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kiro_tokens bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kimi_tokens bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_tokens bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS github_url text;

CREATE OR REPLACE VIEW public.tokentracker_user_profiles AS
  SELECT u.id AS user_id,
    COALESCE(s.display_name, u.profile->>'name', split_part(u.email, '@', 1)) AS display_name,
    COALESCE(u.profile->>'avatar_url', u.profile->>'picture') AS avatar_url
  FROM auth.users u
  LEFT JOIN public.tokentracker_user_settings s ON s.user_id = u.id;
REVOKE ALL ON public.tokentracker_user_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.tokentracker_user_profiles TO project_admin;

DO $fix$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tokentracker_profile_likes'
      AND column_name = 'liked_user_id'
  ) THEN
    IF EXISTS (SELECT 1 FROM public.tokentracker_profile_likes) THEN
      RAISE EXCEPTION 'legacy profile likes table has data; review before replacing its schema';
    END IF;
    DROP TABLE public.tokentracker_profile_likes;
  END IF;
END
$fix$;

CREATE TABLE IF NOT EXISTS public.tokentracker_profile_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  liker_id text NOT NULL,
  is_authenticated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (target_user_id, liker_id)
);
ALTER TABLE public.tokentracker_profile_likes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tokentracker_profile_likes FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.tokentracker_profile_likes TO project_admin;
