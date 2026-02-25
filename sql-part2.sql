-- PART 2: V5 (Range Planning) + V6 (Comments & Notifications) + V7 (Range categories)

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

ALTER TABLE ranges ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}';

UPDATE ranges
SET categories = ARRAY['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Knitwear', 'Swimwear', 'Activewear', 'Loungewear', 'Accessories', 'Footwear']
WHERE categories = '{}' OR categories IS NULL;
