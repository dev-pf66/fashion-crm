-- 022_notifications_table_and_assignment_trigger.sql
-- 1. Create the notifications table (idempotent — matches supabase-run-all.sql).
-- 2. Add a trigger on range_styles that creates an in-app notification row
--    whenever a piece is assigned to someone (or reassigned to a new person).

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  from_person_id INTEGER REFERENCES people(id),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_person ON notifications(person_id, read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  CREATE POLICY "Enable all for authenticated" ON notifications FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END
$do$;

CREATE OR REPLACE FUNCTION notify_on_range_style_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_actor_id INTEGER;
  v_piece_label TEXT;
BEGIN
  IF NEW.assigned_to IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.assigned_to IS NOT DISTINCT FROM OLD.assigned_to THEN
    RETURN NEW;
  END IF;

  SELECT p.id INTO v_actor_id FROM people p WHERE p.user_id = auth.uid() LIMIT 1;

  IF v_actor_id IS NOT NULL AND v_actor_id = NEW.assigned_to THEN
    RETURN NEW;
  END IF;

  v_piece_label := COALESCE(NULLIF(NEW.name, ''), NULLIF(NEW.category, ''), 'A piece');

  INSERT INTO notifications (person_id, type, title, message, link, from_person_id)
  VALUES (
    NEW.assigned_to,
    'assignment',
    'New piece assigned',
    v_piece_label || ' has been assigned to you.',
    '/my-work',
    v_actor_id
  );

  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_range_styles_notify_assignment ON range_styles;
CREATE TRIGGER trg_range_styles_notify_assignment
  AFTER INSERT OR UPDATE OF assigned_to ON range_styles
  FOR EACH ROW EXECUTE FUNCTION notify_on_range_style_assignment();
