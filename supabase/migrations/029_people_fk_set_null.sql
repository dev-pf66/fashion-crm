-- 029_people_fk_set_null.sql
-- Make person deletion possible. Some foreign keys to people(id) were created
-- with no ON DELETE clause, which defaults to RESTRICT and blocks user deletion
-- whenever a user has any assigned style, comment, dashboard target edit, etc.
--
-- For each such FK, switch it to ON DELETE SET NULL so the referenced rows
-- (range_styles, comments, etc.) survive the deletion with the person field
-- nulled out. Existing CASCADE and SET NULL constraints are left as-is.
-- For NOT NULL columns we also drop NOT NULL so SET NULL is legal.

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT
      c.conname        AS constraint_name,
      c.conrelid::regclass::text AS table_name,
      a.attname        AS column_name,
      a.attnotnull     AS is_not_null
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid
     AND a.attnum   = ANY(c.conkey)
    WHERE c.contype    = 'f'
      AND c.confrelid  = 'people'::regclass
      AND c.confdeltype IN ('a', 'r')  -- NO ACTION or RESTRICT
  LOOP
    IF rec.is_not_null THEN
      EXECUTE format(
        'ALTER TABLE %s ALTER COLUMN %I DROP NOT NULL',
        rec.table_name, rec.column_name
      );
    END IF;

    EXECUTE format(
      'ALTER TABLE %s DROP CONSTRAINT %I',
      rec.table_name, rec.constraint_name
    );

    EXECUTE format(
      'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES people(id) ON DELETE SET NULL',
      rec.table_name, rec.constraint_name, rec.column_name
    );
  END LOOP;
END $$;
