-- Add custom categories to ranges
ALTER TABLE ranges ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}';

-- Backfill existing ranges with default categories
UPDATE ranges
SET categories = ARRAY['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Knitwear', 'Swimwear', 'Activewear', 'Loungewear', 'Accessories', 'Footwear']
WHERE categories = '{}' OR categories IS NULL;
