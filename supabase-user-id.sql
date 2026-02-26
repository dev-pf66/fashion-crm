-- Add auth user_id to people table for reliable identity linking
ALTER TABLE people ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE;

-- Backfill existing people records from auth.users by matching email
UPDATE people
SET user_id = au.id
FROM auth.users au
WHERE people.email = au.email
  AND people.user_id IS NULL;

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_people_user_id ON people(user_id);
