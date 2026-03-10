-- Link tasks to range plans (not individual pieces)
-- Replace range_style_id with range_id
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS range_id UUID REFERENCES ranges(id) ON DELETE SET NULL;

-- Migrate existing range_style_id data to range_id
UPDATE tasks
SET range_id = rs.range_id
FROM range_styles rs
WHERE tasks.range_style_id = rs.id
  AND tasks.range_id IS NULL;

-- Drop old column
ALTER TABLE tasks DROP COLUMN IF EXISTS range_style_id;

-- Add target_styles to ranges (planned number of products)
ALTER TABLE ranges ADD COLUMN IF NOT EXISTS target_styles INTEGER DEFAULT 0;

-- Add categories column if not present (for range custom categories)
ALTER TABLE ranges ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}';
