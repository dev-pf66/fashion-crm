-- 023_style_statuses.sql
-- Move the hardcoded range_styles status dropdown into the DB so admins can
-- edit labels/colors/order from the Command Center → Config tab.
-- Existing range_styles.status values stay as plain text — no FK — so
-- renames/deletes here don't orphan piece data.

CREATE TABLE IF NOT EXISTS style_statuses (
  id serial PRIMARY KEY,
  value text NOT NULL UNIQUE,
  label text NOT NULL,
  color text DEFAULT '#9ca3af',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

INSERT INTO style_statuses (value, label, color, sort_order) VALUES
  ('concept',     'Concept',     '#818cf8', 1),
  ('in_progress', 'In Progress', '#60a5fa', 2),
  ('sampling',    'Sampling',    '#fbbf24', 3),
  ('swatching',   'Swatching',   '#f472b6', 4),
  ('review',      'Review',      '#fbbf24', 5),
  ('approved',    'Approved',    '#34d399', 6),
  ('production',  'Production',  '#06b6d4', 7)
ON CONFLICT (value) DO NOTHING;

ALTER TABLE style_statuses ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  CREATE POLICY "Enable read for all" ON style_statuses FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END
$do$;

DO $do$
BEGIN
  CREATE POLICY "Enable write for authenticated" ON style_statuses FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END
$do$;
