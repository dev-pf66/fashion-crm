-- Add folder column to ranges for organizing ranges into groups
ALTER TABLE ranges ADD COLUMN IF NOT EXISTS folder text;
