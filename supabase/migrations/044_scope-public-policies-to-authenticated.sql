-- ============================================
-- 044: Scope every PUBLIC policy to `authenticated`
-- ============================================
-- A policy created without a TO clause applies to PUBLIC, which includes the
-- `anon` role. The anon key ships in the browser bundle, so any table that has
-- even one such policy is readable (and, under WITH CHECK (true), writable) by
-- anyone on the internet with no account. Permissive policies are OR-ed, so a
-- single leftover PUBLIC policy re-opens a table even when a stricter policy
-- sits beside it, and dropping policies by name cannot be relied on to find them.
--
-- This finds them by what they ARE (roles = {public}) instead of by name, and
-- re-scopes them with ALTER POLICY ... TO authenticated. Nothing is dropped and
-- no USING / WITH CHECK expression changes, so every logged-in teammate keeps
-- exactly the access they have today. Only the no-login path is removed.
-- The service role (API endpoints) bypasses RLS and is unaffected.
--
--
-- Why this repo needs it: sql/supabase-setup.sql created `allow_all` policies
-- (FOR ALL USING (true) WITH CHECK (true), no TO clause) on people, seasons,
-- suppliers, materials, styles and more. 040_enable_rls.sql then added
-- `authenticated_all` policies but never dropped `allow_all`. Permissive policies
-- are OR-ed, so if `allow_all` still exists in the live database the anon key
-- (which ships in the browser bundle) can read and write those tables with no login.
-- Whether it still exists cannot be told from this repo, so this checks and fixes it.
--
-- Idempotent: once nothing is left on PUBLIC, re-running changes nothing.
-- Policies explicitly granted TO anon are left alone but trip the assertion.

DO $$
DECLARE
  p RECORD;
  n INT := 0;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND roles = '{public}'::name[]
  LOOP
    EXECUTE format('ALTER POLICY %I ON %I.%I TO authenticated',
                   p.policyname, p.schemaname, p.tablename);
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'Re-scoped % PUBLIC polic(y/ies) to authenticated', n;
END $$;

-- Assert the end state: no public-schema policy still applies to PUBLIC or anon.
DO $$
DECLARE
  bad TEXT;
  open_tables TEXT;
BEGIN
  SELECT string_agg(format('%s.%s (roles=%s)', tablename, policyname, roles::text), '; ')
  INTO bad
  FROM pg_policies
  WHERE schemaname = 'public'
    AND roles::text[] && ARRAY['public', 'anon'];
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION
      'Anonymous access is still open via: %. Scope each TO authenticated, or drop it if it is not needed.',
      bad;
  END IF;

  -- Information only: a table with RLS off ignores policies entirely.
  SELECT string_agg(c.relname, ', ' ORDER BY c.relname)
  INTO open_tables
  FROM pg_class c
  JOIN pg_namespace ns ON ns.oid = c.relnamespace
  WHERE ns.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = false;
  IF open_tables IS NOT NULL THEN
    RAISE NOTICE 'RLS is OFF on: % (anon key can read these if the anon role has table grants)', open_tables;
  END IF;
END $$;
