-- Add production fields to range_styles
ALTER TABLE range_styles ADD COLUMN IF NOT EXISTS production_status text DEFAULT NULL;
ALTER TABLE range_styles ADD COLUMN IF NOT EXISTS production_client text;
ALTER TABLE range_styles ADD COLUMN IF NOT EXISTS production_lead integer REFERENCES people(id);
ALTER TABLE range_styles ADD COLUMN IF NOT EXISTS production_collaborators integer[] DEFAULT '{}';
ALTER TABLE range_styles ADD COLUMN IF NOT EXISTS production_notes text;
ALTER TABLE range_styles ADD COLUMN IF NOT EXISTS pushed_to_production_at timestamptz;
