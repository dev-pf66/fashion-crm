-- ============================================================
-- Fashion CRM: Range Planning tables
-- Run this in Supabase SQL Editor
-- ============================================================

-- Ranges table
CREATE TABLE IF NOT EXISTS ranges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  season TEXT,
  status TEXT DEFAULT 'planning',
  created_by INTEGER REFERENCES people(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Range Styles table
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

-- Range Style Files table
CREATE TABLE IF NOT EXISTS range_style_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  style_id UUID REFERENCES range_styles(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE range_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE range_style_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated" ON ranges FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated" ON range_styles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated" ON range_style_files FOR ALL USING (true) WITH CHECK (true);

-- Create storage bucket (run separately in Supabase Dashboard > Storage if needed):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('style-files', 'style-files', true);
