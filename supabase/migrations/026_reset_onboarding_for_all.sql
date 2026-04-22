-- Reset onboarding for all existing users so they go through the new wizard
-- on their next login. New users still hit it because the column is NULL by default.
UPDATE people SET onboarded_at = NULL;
