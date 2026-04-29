-- 035_separate_production_floor_stage.sql
-- Separate Production Board's stage tracking from My Work's. They used to
-- share range_styles.production_stage_id, which meant dragging a card on
-- one board moved it on the other. Add a dedicated production_floor_stage_id
-- for the Production Board so the two state machines are independent.
--
-- Backfill existing pushed-to-production pieces to Not Started so they
-- start fresh on the floor pipeline. A trigger defaults the column to
-- Not Started whenever a piece transitions to status='production' so the
-- JS layer doesn't need to know the stage IDs.

ALTER TABLE range_styles
  ADD COLUMN IF NOT EXISTS production_floor_stage_id INTEGER
  REFERENCES production_stages(id) ON DELETE SET NULL;

UPDATE range_styles
   SET production_floor_stage_id = (SELECT id FROM production_stages WHERE name = 'Not Started')
 WHERE status = 'production'
   AND production_floor_stage_id IS NULL;

CREATE OR REPLACE FUNCTION default_production_floor_stage_on_push()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  ns_id INTEGER;
BEGIN
  IF NEW.status = 'production' AND NEW.production_floor_stage_id IS NULL THEN
    SELECT id INTO ns_id FROM production_stages WHERE name = 'Not Started';
    NEW.production_floor_stage_id := ns_id;
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_default_production_floor_stage ON range_styles;
CREATE TRIGGER trg_default_production_floor_stage
BEFORE INSERT OR UPDATE OF status, production_floor_stage_id ON range_styles
FOR EACH ROW
EXECUTE FUNCTION default_production_floor_stage_on_push();
