-- Phase 5: Production stages + status tracking

-- Production stages lookup table
CREATE TABLE IF NOT EXISTS production_stages (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  color text DEFAULT '#9ca3af',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Seed default stages
INSERT INTO production_stages (name, color, sort_order) VALUES
  ('Not Started', '#9ca3af', 1),
  ('Sampling', '#f59e0b', 2),
  ('Stitching', '#3b82f6', 3),
  ('In Review', '#8b5cf6', 4),
  ('Completed', '#22c55e', 5)
ON CONFLICT (name) DO NOTHING;

-- Add production_stage_id to range_styles (FK to production_stages)
ALTER TABLE range_styles ADD COLUMN IF NOT EXISTS production_stage_id integer REFERENCES production_stages(id);
ALTER TABLE range_styles ADD COLUMN IF NOT EXISTS status_updated_at timestamptz;

-- Default existing rows to "Not Started" (id=1)
UPDATE range_styles SET production_stage_id = 1 WHERE production_stage_id IS NULL;

-- Production status change log
CREATE TABLE IF NOT EXISTS production_status_log (
  id serial PRIMARY KEY,
  style_id uuid REFERENCES range_styles(id) ON DELETE CASCADE,
  changed_by integer REFERENCES people(id),
  old_stage_id integer REFERENCES production_stages(id),
  new_stage_id integer REFERENCES production_stages(id),
  old_stage_name text,
  new_stage_name text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_production_status_log_style ON production_status_log(style_id);
CREATE INDEX IF NOT EXISTS idx_production_status_log_changed_by ON production_status_log(changed_by);

-- RLS
ALTER TABLE production_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_status_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read production_stages" ON production_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage production_stages" ON production_stages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read production_status_log" ON production_status_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert production_status_log" ON production_status_log FOR INSERT TO authenticated WITH CHECK (true);
