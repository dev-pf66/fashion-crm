-- Add content_status field to range_styles for social media team tracking
ALTER TABLE range_styles ADD COLUMN IF NOT EXISTS content_status text;

-- Create Social Media division
INSERT INTO divisions (name, code, is_active)
VALUES ('Social Media', 'SOCIAL', true)
ON CONFLICT DO NOTHING;
