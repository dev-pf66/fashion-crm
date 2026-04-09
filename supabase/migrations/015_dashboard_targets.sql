-- Phase 6: Dashboard targets for range completion tracking

-- Stores editable targets: total per range, and per-bracket/silhouette/embroidery
CREATE TABLE IF NOT EXISTS dashboard_targets (
  id serial PRIMARY KEY,
  range_id uuid REFERENCES ranges(id) ON DELETE CASCADE,
  target_type text NOT NULL,          -- 'total', 'price_bracket', 'silhouette', 'embroidery'
  target_key text DEFAULT '_total',    -- the bracket label, silhouette name, or embroidery type
  target_value integer NOT NULL DEFAULT 0,
  updated_by integer REFERENCES people(id),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(range_id, target_type, target_key)
);

CREATE INDEX IF NOT EXISTS idx_dashboard_targets_range ON dashboard_targets(range_id);

-- RLS
ALTER TABLE dashboard_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read dashboard_targets"
  ON dashboard_targets FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage dashboard_targets"
  ON dashboard_targets FOR ALL TO authenticated USING (true) WITH CHECK (true);
