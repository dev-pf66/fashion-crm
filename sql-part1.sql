-- PART 1: V3 + V4 tables

DROP TABLE IF EXISTS compliance_tests;
DROP TABLE IF EXISTS style_costings;
DROP TABLE IF EXISTS style_requests;

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
