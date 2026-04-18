-- 019_update_production_stages.sql
-- Replace the placeholder Kanban stages with the team's actual production flow:
--   Audit Authorise -> Pattern/CAD -> Packet Removal -> Machine Emb. ->
--   Hand Emb. -> AO. -> Stitching -> Finishing

-- Insert (or update) the 8 target stages. 'Stitching' already exists from
-- migration 014, so ON CONFLICT lets us re-color / re-order it cleanly.
INSERT INTO production_stages (name, color, sort_order) VALUES
  ('Audit Authorise', '#6366f1', 1),
  ('Pattern/CAD',     '#8b5cf6', 2),
  ('Packet Removal',  '#a855f7', 3),
  ('Machine Emb.',    '#ec4899', 4),
  ('Hand Emb.',       '#f43f5e', 5),
  ('AO.',             '#f97316', 6),
  ('Stitching',       '#3b82f6', 7),
  ('Finishing',       '#22c55e', 8)
ON CONFLICT (name) DO UPDATE SET
  color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order;

-- Remap existing range_styles sitting on deprecated stages
DO $$
DECLARE
  audit_id INTEGER;
  finishing_id INTEGER;
BEGIN
  SELECT id INTO audit_id FROM production_stages WHERE name = 'Audit Authorise';
  SELECT id INTO finishing_id FROM production_stages WHERE name = 'Finishing';

  -- 'Completed' pieces become 'Finishing' (terminal stage in new flow)
  UPDATE range_styles
     SET production_stage_id = finishing_id
   WHERE production_stage_id IN (
     SELECT id FROM production_stages WHERE name = 'Completed'
   );

  -- Everything else still on a deprecated stage goes to 'Audit Authorise'
  UPDATE range_styles
     SET production_stage_id = audit_id
   WHERE production_stage_id IN (
     SELECT id FROM production_stages
      WHERE name IN ('Not Started', 'Sampling', 'In Review')
   );
END $$;

-- Null out log references to deprecated stages (names remain in the text cols)
UPDATE production_status_log
   SET old_stage_id = NULL
 WHERE old_stage_id IN (
   SELECT id FROM production_stages
    WHERE name IN ('Not Started', 'Sampling', 'In Review', 'Completed')
 );

UPDATE production_status_log
   SET new_stage_id = NULL
 WHERE new_stage_id IN (
   SELECT id FROM production_stages
    WHERE name IN ('Not Started', 'Sampling', 'In Review', 'Completed')
 );

-- Finally drop the deprecated stages
DELETE FROM production_stages
 WHERE name IN ('Not Started', 'Sampling', 'In Review', 'Completed');
