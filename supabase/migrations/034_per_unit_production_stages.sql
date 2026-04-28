-- 034_per_unit_production_stages.sql
-- Per-unit production stage tracking. unit_stages is parallel to
-- production_qty: cardinality(unit_stages) should equal production_qty when
-- set, with each element holding the stage_id of that unit. production_stage_id
-- stays around as a "primary" stage for anything else that reads it (it gets
-- kept in sync as the modal/drag operations write).
--
-- Backfill any piece already pushed to production by populating unit_stages
-- with production_qty copies of its current production_stage_id. Pieces with
-- no qty or no stage are left null and fall back to single-stage behaviour.

ALTER TABLE range_styles ADD COLUMN IF NOT EXISTS unit_stages INTEGER[];

UPDATE range_styles
   SET unit_stages = array_fill(production_stage_id, ARRAY[production_qty])
 WHERE status = 'production'
   AND production_qty > 0
   AND production_stage_id IS NOT NULL
   AND (unit_stages IS NULL OR cardinality(unit_stages) = 0);
