-- ============================================================
-- Fashion CRM: Costing, Compliance, Comments tables
-- Run this in Supabase SQL Editor
-- ============================================================

-- Style Costings (one per style)
CREATE TABLE IF NOT EXISTS style_costings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  style_id UUID REFERENCES styles(id) ON DELETE CASCADE UNIQUE,
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
CREATE POLICY "Enable all for authenticated" ON style_costings FOR ALL USING (true) WITH CHECK (true);

-- Compliance Tests
CREATE TABLE IF NOT EXISTS compliance_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  style_id UUID REFERENCES styles(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL,
  lab_name TEXT,
  status TEXT DEFAULT 'pending',
  submitted_date DATE,
  result_date DATE,
  report_number TEXT,
  notes TEXT,
  submitted_by UUID REFERENCES people(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE compliance_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated" ON compliance_tests FOR ALL USING (true) WITH CHECK (true);

-- Comments (polymorphic)
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'style', 'purchase_order', 'sample', 'supplier'
  entity_id UUID NOT NULL,
  person_id UUID REFERENCES people(id),
  content TEXT NOT NULL,
  mentions UUID[], -- array of person IDs mentioned
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated" ON comments FOR ALL USING (true) WITH CHECK (true);
