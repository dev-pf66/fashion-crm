-- 021_add_not_started_stage.sql
-- Prepend a 'Not Started' stage before 'Audit Authorise' and move every
-- piece currently on 'Audit Authorise' into 'Not Started'.

-- Shift the 8 existing stages down one slot
UPDATE production_stages SET sort_order = sort_order + 1
 WHERE name IN (
   'Audit Authorise', 'Pattern/CAD', 'Packet Removal', 'Machine Emb.',
   'Hand Emb.', 'AO.', 'Stitching', 'Finishing'
 );

-- Insert the new first stage
INSERT INTO production_stages (name, color, sort_order) VALUES
  ('Not Started', '#9ca3af', 1)
ON CONFLICT (name) DO UPDATE SET
  color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order;

-- Move all pieces currently sitting on 'Audit Authorise' into 'Not Started'
DO $$
DECLARE
  not_started_id INTEGER;
  audit_id INTEGER;
BEGIN
  SELECT id INTO not_started_id FROM production_stages WHERE name = 'Not Started';
  SELECT id INTO audit_id       FROM production_stages WHERE name = 'Audit Authorise';

  UPDATE range_styles
     SET production_stage_id = not_started_id
   WHERE production_stage_id = audit_id;
END $$;
