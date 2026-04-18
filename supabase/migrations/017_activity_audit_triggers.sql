-- 017_activity_audit_triggers.sql
-- Auto-log INSERT/UPDATE/DELETE on key tables to activity_log.
-- Captures actor via auth.uid() -> people.id mapping.

-- Enrich activity_log with audit columns if missing
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS before_data JSONB;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS after_data JSONB;

CREATE INDEX IF NOT EXISTS idx_activity_person_created ON activity_log(person_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_action ON activity_log(action);

-- Generic trigger function: logs any row change to activity_log
CREATE OR REPLACE FUNCTION log_activity() RETURNS TRIGGER AS $$
DECLARE
  actor_id INTEGER;
  entity_label TEXT;
  entity_pk INTEGER;
  action_name TEXT;
  before_json JSONB;
  after_json JSONB;
BEGIN
  -- Resolve actor from auth.uid() -> people.id. NULL if no auth context (cron/service role).
  SELECT id INTO actor_id FROM people WHERE user_id = auth.uid() LIMIT 1;

  entity_label := TG_TABLE_NAME;

  IF TG_OP = 'INSERT' THEN
    action_name := 'created';
    entity_pk := (row_to_json(NEW)->>'id')::INTEGER;
    after_json := to_jsonb(NEW);
    before_json := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    action_name := 'updated';
    entity_pk := (row_to_json(NEW)->>'id')::INTEGER;
    -- Compute only changed fields for a compact diff
    SELECT jsonb_object_agg(key, value) INTO after_json
      FROM jsonb_each(to_jsonb(NEW))
      WHERE to_jsonb(NEW)->key IS DISTINCT FROM to_jsonb(OLD)->key;
    SELECT jsonb_object_agg(key, value) INTO before_json
      FROM jsonb_each(to_jsonb(OLD))
      WHERE to_jsonb(NEW)->key IS DISTINCT FROM to_jsonb(OLD)->key;
    -- Skip logging if nothing meaningful changed (e.g. just updated_at)
    IF after_json IS NULL OR after_json = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
    IF after_json - 'updated_at' = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    action_name := 'deleted';
    entity_pk := (row_to_json(OLD)->>'id')::INTEGER;
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

-- Helper to install triggers cleanly
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'ranges',
    'range_styles',
    'styles',
    'samples',
    'tasks',
    'orders',
    'order_items',
    'suppliers',
    'people',
    'production_stages',
    'silhouettes',
    'price_brackets',
    'dashboard_targets',
    'roles'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Only install if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl AND table_schema = 'public') THEN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', 'trg_activity_' || tbl, tbl);
      EXECUTE format(
        'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION log_activity()',
        'trg_activity_' || tbl, tbl
      );
    END IF;
  END LOOP;
END $$;
