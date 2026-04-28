-- 033_drop_people_role_check.sql
-- The legacy people.role text column has a CHECK constraint inherited from
-- sql/supabase-setup.sql that locks it to a hardcoded job-title enum
-- ('sourcing_manager','production_manager','merchandiser', etc.). The actual
-- permission system has moved to people.role_id -> roles, so the role column
-- is effectively a free-form Job Title now and shouldn't be enforced against
-- a stale enum that doesn't include current values like 'design' or
-- 'marketing'. Dropping the CHECK so Edit Member saves don't keep tripping
-- people_role_check when the column happens to hold something the enum
-- doesn't know about.

ALTER TABLE people DROP CONSTRAINT IF EXISTS people_role_check;
