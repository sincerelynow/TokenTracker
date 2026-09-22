-- Bring a fresh instance through the historical detector configuration edit.
ALTER TABLE public.tokentracker_anticheat_config DROP COLUMN IF EXISTS id;
ALTER TABLE public.tokentracker_anticheat_config DROP COLUMN IF EXISTS config;
ALTER TABLE public.tokentracker_anticheat_config ADD COLUMN IF NOT EXISTS key text;
ALTER TABLE public.tokentracker_anticheat_config ADD COLUMN IF NOT EXISTS value numeric;
ALTER TABLE public.tokentracker_anticheat_config ADD CONSTRAINT tokentracker_anticheat_config_key_key UNIQUE (key);
INSERT INTO public.tokentracker_anticheat_config (key, value)
VALUES ('lookback_days', 14)
ON CONFLICT (key) DO NOTHING;
