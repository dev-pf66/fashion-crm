-- Phase 4: Piece assignments for merchandisers

-- Add assigned_to column (FK to people)
ALTER TABLE range_styles ADD COLUMN IF NOT EXISTS assigned_to integer REFERENCES people(id);

-- Create index for fast lookups by assignee
CREATE INDEX IF NOT EXISTS idx_range_styles_assigned_to ON range_styles(assigned_to);
