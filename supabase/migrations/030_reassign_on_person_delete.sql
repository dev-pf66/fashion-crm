-- 030_reassign_on_person_delete.sql
-- Before a person is deleted, reassign anything they were the assignee on to
-- the row's creator instead of nulling it out (which the FK SET NULL fallback
-- from migration 029 would otherwise do). Covers the common assignment-style
-- columns: range_styles.assigned_to, range_styles.production_lead, tasks.assigned_to.
--
-- Reassignment only happens when the creator exists and isn't the same person
-- being deleted. In that edge case (creator == deleted person, or no creator)
-- the column falls through to ON DELETE SET NULL.

CREATE OR REPLACE FUNCTION reassign_to_creator_before_person_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE range_styles
     SET assigned_to = created_by
   WHERE assigned_to = OLD.id
     AND created_by IS NOT NULL
     AND created_by <> OLD.id;

  UPDATE range_styles
     SET production_lead = created_by
   WHERE production_lead = OLD.id
     AND created_by IS NOT NULL
     AND created_by <> OLD.id;

  UPDATE tasks
     SET assigned_to = created_by
   WHERE assigned_to = OLD.id
     AND created_by IS NOT NULL
     AND created_by <> OLD.id;

  RETURN OLD;
END
$$;

DROP TRIGGER IF EXISTS reassign_before_person_delete ON people;
CREATE TRIGGER reassign_before_person_delete
  BEFORE DELETE ON people
  FOR EACH ROW
  EXECUTE FUNCTION reassign_to_creator_before_person_delete();
