-- 036_production_units.sql
-- Per-unit tracking for the Production Board. When a piece is dragged out of
-- Not Started for the first time, the user picks an assignee for each of the
-- production_qty units; the app inserts N rows here. From then on each unit
-- has its own stage and assignee, draggable independently on the board.
--
-- Once units exist for a range_style, the parent's production_floor_stage_id
-- is no longer authoritative — the board renders units instead. We leave the
-- parent's column alone for now (it stays where it was last set) so this
-- table is purely additive.

CREATE TABLE IF NOT EXISTS production_units (
  id SERIAL PRIMARY KEY,
  range_style_id UUID NOT NULL REFERENCES range_styles(id) ON DELETE CASCADE,
  unit_number INTEGER NOT NULL,
  assigned_to INTEGER REFERENCES people(id) ON DELETE SET NULL,
  production_floor_stage_id INTEGER REFERENCES production_stages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (range_style_id, unit_number)
);

CREATE INDEX IF NOT EXISTS idx_production_units_range_style ON production_units(range_style_id);
CREATE INDEX IF NOT EXISTS idx_production_units_assigned_to ON production_units(assigned_to);
CREATE INDEX IF NOT EXISTS idx_production_units_stage ON production_units(production_floor_stage_id);

ALTER TABLE production_units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Manage production units" ON production_units;
CREATE POLICY "Manage production units" ON production_units FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
