-- ============================================================
-- Fashion CRM: Style Requests table
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS style_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id UUID REFERENCES seasons(id),
  submitted_by UUID REFERENCES people(id),
  status TEXT DEFAULT 'new',

  -- Piece details
  piece_name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  size_range TEXT,
  fit_notes TEXT,
  urgency TEXT DEFAULT 'normal',

  -- Fabric / Materials
  fabric_type TEXT,
  fabric_composition TEXT,
  fabric_weight TEXT,
  color_print TEXT,
  finish TEXT,

  -- Trims
  trims_needed TEXT,
  hardware TEXT,
  labels TEXT,
  packaging_notes TEXT,

  -- Pricing
  target_price DECIMAL(10,2),
  target_fob DECIMAL(10,2),
  target_quantity INTEGER,

  -- Notes
  reference_notes TEXT,
  special_requirements TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE style_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated" ON style_requests FOR ALL USING (true) WITH CHECK (true);
