-- 020_fix_activity_log_entity_id.sql
-- Fix audit trigger from migration 017: it hard-cast row.id to INTEGER,
-- which fails on tables with UUID primary keys (e.g. range_styles).
-- Widen activity_log.entity_id to TEXT and rebuild log_activity() to
-- stop casting.

ALTER TABLE activity_log
  ALTER COLUMN entity_id TYPE TEXT USING entity_id::TEXT;

CREATE OR REPLACE FUNCTION log_activity() RETURNS TRIGGER AS $$
DECLARE
  actor_id INTEGER;
  entity_label TEXT;
  entity_pk TEXT;
  action_name TEXT;
  before_json JSONB;
  after_json JSONB;
BEGIN
  SELECT id INTO actor_id FROM people WHERE user_id = auth.uid() LIMIT 1;

  entity_label := TG_TABLE_NAME;

  IF TG_OP = 'INSERT' THEN
    action_name := 'created';
    entity_pk := row_to_json(NEW)->>'id';
    after_json := to_jsonb(NEW);
    before_json := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    action_name := 'updated';
    entity_pk := row_to_json(NEW)->>'id';
    SELECT jsonb_object_agg(key, value) INTO after_json
      FROM jsonb_each(to_jsonb(NEW))
      WHERE to_jsonb(NEW)->key IS DISTINCT FROM to_jsonb(OLD)->key;
    SELECT jsonb_object_agg(key, value) INTO before_json
      FROM jsonb_each(to_jsonb(OLD))
      WHERE to_jsonb(NEW)->key IS DISTINCT FROM to_jsonb(OLD)->key;
    IF after_json IS NULL OR after_json = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
    IF after_json - 'updated_at' = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    action_name := 'deleted';
    entity_pk := row_to_json(OLD)->>'id';
    before_json := to_jsonb(OLD);
    after_json := NULL;
  END IF;

  INSERT INTO activity_log (person_id, action, entity_type, entity_id, details, before_data, after_data)
  VALUES (
    actor_id,
    action_name,
    entity_label,
    entity_pk,
    jsonb_build_object(
      'name', COALESCE(
        (after_json->>'name'),
        (before_json->>'name'),
        (row_to_json(COALESCE(NEW, OLD))::jsonb->>'name'),
        (row_to_json(COALESCE(NEW, OLD))::jsonb->>'style_number'),
        (row_to_json(COALESCE(NEW, OLD))::jsonb->>'title')
      )
    ),
    before_json,
    after_json
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
