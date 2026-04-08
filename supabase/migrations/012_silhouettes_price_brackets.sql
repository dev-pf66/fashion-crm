-- Phase 3: Silhouettes & Price Brackets lookup tables

-- Silhouettes lookup table (category-specific)
CREATE TABLE IF NOT EXISTS silhouettes (
  id serial PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Unique constraint: same name can't repeat within a category
ALTER TABLE silhouettes ADD CONSTRAINT silhouettes_name_category_unique UNIQUE (name, category);

-- Price brackets lookup table
CREATE TABLE IF NOT EXISTS price_brackets (
  id serial PRIMARY KEY,
  label text NOT NULL UNIQUE,
  min_price numeric,
  max_price numeric,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Seed silhouettes for common fashion categories
INSERT INTO silhouettes (name, category, sort_order) VALUES
  -- Bridal
  ('Lehenga', 'Bridal', 1),
  ('Saree', 'Bridal', 2),
  ('Gown', 'Bridal', 3),
  ('Sharara', 'Bridal', 4),
  ('Anarkali', 'Bridal', 5),
  -- Festive
  ('Lehenga', 'Festive', 1),
  ('Saree', 'Festive', 2),
  ('Sharara', 'Festive', 3),
  ('Kurta Set', 'Festive', 4),
  ('Anarkali', 'Festive', 5),
  ('Palazzo Set', 'Festive', 6),
  -- Casual
  ('Kurta', 'Casual', 1),
  ('Dress', 'Casual', 2),
  ('Co-ord Set', 'Casual', 3),
  ('Top', 'Casual', 4),
  ('Jacket', 'Casual', 5),
  -- Pret
  ('Kurta', 'Pret', 1),
  ('Dress', 'Pret', 2),
  ('Co-ord Set', 'Pret', 3),
  ('Blazer Set', 'Pret', 4),
  ('Jumpsuit', 'Pret', 5)
ON CONFLICT (name, category) DO NOTHING;

-- Seed price brackets (matching existing price_category values)
INSERT INTO price_brackets (label, min_price, max_price, sort_order) VALUES
  ('50K - 1L', 50000, 100000, 1),
  ('1L - 2L', 100000, 200000, 2),
  ('2L - 3.5L', 200000, 350000, 3),
  ('3.5L - 6L', 350000, 600000, 4),
  ('6L - 8L', 600000, 800000, 5),
  ('8L - 12L', 800000, 1200000, 6),
  ('12L - 15L', 1200000, 1500000, 7),
  ('18L+', 1800000, NULL, 8)
ON CONFLICT (label) DO NOTHING;

-- Enable RLS
ALTER TABLE silhouettes ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_brackets ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can read silhouettes" ON silhouettes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read price_brackets" ON price_brackets FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert/update/delete (admin checks happen in app)
CREATE POLICY "Authenticated users can manage silhouettes" ON silhouettes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage price_brackets" ON price_brackets FOR ALL TO authenticated USING (true) WITH CHECK (true);
