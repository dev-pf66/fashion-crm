-- Add embroidery and silhouette columns to range_styles
ALTER TABLE range_styles ADD COLUMN IF NOT EXISTS embroidery text;
ALTER TABLE range_styles ADD COLUMN IF NOT EXISTS silhouette text;
