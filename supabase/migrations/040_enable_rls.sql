-- ============================================================
-- RLS: Block unauthenticated (anon key) access to all tables
-- Paste this into the Supabase SQL editor and run once.
-- Authenticated users (logged-in CRM users) retain full access.
-- Service role key (used by API endpoints) bypasses RLS as designed.
-- ============================================================

-- Core tables
ALTER TABLE tasks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE people             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranges             ENABLE ROW LEVEL SECURITY;
ALTER TABLE styles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE range_styles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_targets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials          ENABLE ROW LEVEL SECURITY;
ALTER TABLE samples            ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE divisions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_costings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE silhouettes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_brackets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_stages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_statuses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_targets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE division_cell_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_subtasks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_status_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE range_style_files  ENABLE ROW LEVEL SECURITY;

-- Single policy per table: any authenticated user can do anything.
-- Permission logic (admin vs merchandiser etc.) stays in the app layer.
CREATE POLICY "authenticated_all" ON tasks              FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON activity_log       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON people             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON ranges             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON styles             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON range_styles       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON person_targets     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON suppliers          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON materials          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON samples            FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON purchase_orders    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON divisions          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON roles              FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON notifications      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON email_log          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON bom_items          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON style_costings     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON silhouettes        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON price_brackets     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON production_stages  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON style_statuses     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON dashboard_targets  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON division_cell_targets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON task_subtasks      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON production_status_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON range_style_files  FOR ALL TO authenticated USING (true) WITH CHECK (true);
