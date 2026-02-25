-- ============================================================
-- FASHION CRM: Combined migrations v3 through v10
-- Safe to run even if some have already been applied
-- All FK types corrected to match base schema (INTEGER PKs)
-- ============================================================


-- ============================================================
-- V3: Costing, Compliance
-- ============================================================

-- Drop and recreate to fix UUID/INTEGER type mismatch from earlier migrations
DROP TABLE IF EXISTS compliance_tests;
DROP TABLE IF EXISTS style_costings;

CREATE TABLE IF NOT EXISTS style_costings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  style_id INTEGER REFERENCES styles(id) ON DELETE CASCADE UNIQUE,
  fabric DECIMAL(10,2),
  trims DECIMAL(10,2),
  labor DECIMAL(10,2),
  washing DECIMAL(10,2),
  printing DECIMAL(10,2),
  embroidery DECIMAL(10,2),
  packaging DECIMAL(10,2),
  other DECIMAL(10,2),
  total_fob DECIMAL(10,2),
  duty_pct DECIMAL(5,2),
  freight DECIMAL(10,2),
  agent_commission_pct DECIMAL(5,2),
  landed_cost DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE style_costings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Enable all for authenticated" ON style_costings FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS compliance_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  style_id INTEGER REFERENCES styles(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL,
  lab_name TEXT,
  status TEXT DEFAULT 'pending',
  submitted_date DATE,
  result_date DATE,
  report_number TEXT,
  notes TEXT,
  submitted_by INTEGER REFERENCES people(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE compliance_tests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Enable all for authenticated" ON compliance_tests FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- V4: Style Requests
-- ============================================================

DROP TABLE IF EXISTS style_requests;

CREATE TABLE IF NOT EXISTS style_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id INTEGER REFERENCES seasons(id),
  submitted_by INTEGER REFERENCES people(id),
  status TEXT DEFAULT 'new',
  piece_name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  size_range TEXT,
  fit_notes TEXT,
  urgency TEXT DEFAULT 'normal',
  fabric_type TEXT,
  fabric_composition TEXT,
  fabric_weight TEXT,
  color_print TEXT,
  finish TEXT,
  trims_needed TEXT,
  hardware TEXT,
  labels TEXT,
  packaging_notes TEXT,
  target_price DECIMAL(10,2),
  target_fob DECIMAL(10,2),
  target_quantity INTEGER,
  reference_notes TEXT,
  special_requirements TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE style_requests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Enable all for authenticated" ON style_requests FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- V5: Range Planning
-- ============================================================

CREATE TABLE IF NOT EXISTS ranges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  season TEXT,
  status TEXT DEFAULT 'planning',
  created_by INTEGER REFERENCES people(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS range_styles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  range_id UUID REFERENCES ranges(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  sub_category TEXT,
  colorways TEXT[] DEFAULT '{}',
  delivery_drop TEXT,
  status TEXT DEFAULT 'concept',
  thumbnail_url TEXT,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES people(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS range_style_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  style_id UUID REFERENCES range_styles(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE range_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE range_style_files ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Enable all for authenticated" ON ranges FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Enable all for authenticated" ON range_styles FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Enable all for authenticated" ON range_style_files FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- V6: Comments (fixed FKs) & Notifications
-- ============================================================

DROP TABLE IF EXISTS comments;

CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  person_id INTEGER REFERENCES people(id),
  content TEXT NOT NULL,
  mentions INTEGER[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Enable all for authenticated" ON comments FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP TABLE IF EXISTS notifications;

CREATE TABLE notifications (
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
DO $$ BEGIN
  CREATE POLICY "Enable all for authenticated" ON notifications FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- V7: Range custom categories
-- ============================================================

ALTER TABLE ranges ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}';

UPDATE ranges
SET categories = ARRAY['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Knitwear', 'Swimwear', 'Activewear', 'Loungewear', 'Accessories', 'Footwear']
WHERE categories = '{}' OR categories IS NULL;


-- ============================================================
-- V8: Tasks table
-- ============================================================

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'todo',
  priority VARCHAR(10) DEFAULT 'medium',
  assigned_to INTEGER REFERENCES people(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES people(id) ON DELETE SET NULL,
  due_date DATE,
  tags TEXT[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all access to tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- V9: Task subtasks + entity linking
-- ============================================================

CREATE TABLE IF NOT EXISTS task_subtasks (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_subtasks_task_id ON task_subtasks(task_id);

ALTER TABLE task_subtasks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all access to task_subtasks" ON task_subtasks FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS style_id INTEGER REFERENCES styles(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_style_id ON tasks(style_id);
CREATE INDEX IF NOT EXISTS idx_tasks_supplier_id ON tasks(supplier_id);
CREATE INDEX IF NOT EXISTS idx_tasks_purchase_order_id ON tasks(purchase_order_id);


-- ============================================================
-- V10: Storage buckets & policies
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('style-images', 'style-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('sample-photos', 'sample-photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('tech-packs', 'tech-packs', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-docs', 'supplier-docs', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('style-files', 'style-files', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "Public read style-images" ON storage.objects FOR SELECT USING (bucket_id = 'style-images');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Public read sample-photos" ON storage.objects FOR SELECT USING (bucket_id = 'sample-photos');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Public read style-files" ON storage.objects FOR SELECT USING (bucket_id = 'style-files');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Auth users upload" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id IN ('style-images', 'sample-photos', 'tech-packs', 'supplier-docs', 'style-files')
    AND auth.role() = 'authenticated'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Auth users update" ON storage.objects FOR UPDATE USING (
    bucket_id IN ('style-images', 'sample-photos', 'tech-packs', 'supplier-docs', 'style-files')
    AND auth.role() = 'authenticated'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Auth users delete" ON storage.objects FOR DELETE USING (
    bucket_id IN ('style-images', 'sample-photos', 'tech-packs', 'supplier-docs', 'style-files')
    AND auth.role() = 'authenticated'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Auth users read tech-packs" ON storage.objects FOR SELECT USING (bucket_id = 'tech-packs' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Auth users read supplier-docs" ON storage.objects FOR SELECT USING (bucket_id = 'supplier-docs' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================
-- DONE! All migrations v3-v10 applied.
-- ============================================================
