-- 028_person_division_access.sql
-- Per-user division access override. NULL or empty array means the user's
-- access falls back to their role's division_codes (existing behaviour).
-- A non-empty array restricts the user to just those divisions, regardless
-- of what their role would otherwise allow.

ALTER TABLE people ADD COLUMN IF NOT EXISTS division_ids INTEGER[];

CREATE INDEX IF NOT EXISTS idx_people_division_ids ON people USING GIN (division_ids);
