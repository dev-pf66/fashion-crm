-- 031_division_cell_targets.sql
-- Per-division targets for the consolidated Range Dashboard matrix:
-- one editable target per (division, silhouette, price_bracket) cell.
-- Counts shown in the matrix already aggregate across ranges; this stores the
-- single division-wide target users compare against.

CREATE TABLE IF NOT EXISTS division_cell_targets (
  id SERIAL PRIMARY KEY,
  division_id INTEGER NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
  silhouette TEXT NOT NULL,
  price_bracket TEXT NOT NULL,
  target_value INTEGER NOT NULL DEFAULT 0,
  updated_by INTEGER REFERENCES people(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (division_id, silhouette, price_bracket)
);

CREATE INDEX IF NOT EXISTS idx_division_cell_targets_div
  ON division_cell_targets(division_id);

ALTER TABLE division_cell_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read division cell targets" ON division_cell_targets;
CREATE POLICY "Read division cell targets"
  ON division_cell_targets FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Manage division cell targets" ON division_cell_targets;
CREATE POLICY "Manage division cell targets"
  ON division_cell_targets FOR ALL TO authenticated USING (true) WITH CHECK (true);
