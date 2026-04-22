-- Onboarding wizard + per-user preferences
ALTER TABLE people
  ADD COLUMN IF NOT EXISTS onboarded_at timestamptz,
  ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Mark existing users as already onboarded so we don't hit them with the wizard.
-- New users (user_id NULL or created after this migration) will see it on first login.
UPDATE people
SET onboarded_at = now()
WHERE onboarded_at IS NULL;
