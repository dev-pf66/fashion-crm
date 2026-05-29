-- 038_person_targets.sql
-- Per-person weekly and monthly targets with a primary metric they're responsible for.

CREATE TABLE IF NOT EXISTS person_targets (
  id serial PRIMARY KEY,
  person_id integer NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  metric text NOT NULL DEFAULT 'tasks_completed',
  weekly_target integer NOT NULL DEFAULT 0,
  monthly_target integer NOT NULL DEFAULT 0,
  updated_by integer REFERENCES people(id),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(person_id)
);

CREATE INDEX IF NOT EXISTS idx_person_targets_person ON person_targets(person_id);

ALTER TABLE person_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read person_targets"
  ON person_targets FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage person_targets"
  ON person_targets FOR ALL TO authenticated USING (true) WITH CHECK (true);
