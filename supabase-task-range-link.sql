-- Add range_style_id to tasks (optional link to a range piece)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS range_style_id UUID REFERENCES range_styles(id) ON DELETE SET NULL;

-- Add target_styles to ranges (planned number of products)
ALTER TABLE ranges ADD COLUMN IF NOT EXISTS target_styles INTEGER DEFAULT 0;

-- Add categories column if not present (for range custom categories)
ALTER TABLE ranges ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}';
