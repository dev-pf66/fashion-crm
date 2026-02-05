-- ============================================================
-- FASHION SOURCING CRM - DATABASE SCHEMA
-- ============================================================

CREATE TABLE people (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  role VARCHAR(50) CHECK (role IN ('sourcing_manager','production_manager','merchandiser','qc_manager','technical_designer','admin')),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE seasons (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(20) UNIQUE,
  country VARCHAR(100),
  city VARCHAR(100),
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  website TEXT,
  product_types TEXT[],
  capabilities TEXT[],
  minimum_order_qty INTEGER,
  lead_time_days INTEGER,
  payment_terms VARCHAR(100),
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','pending_approval','inactive','blacklisted')),
  certifications TEXT[],
  last_audit_date DATE,
  audit_result VARCHAR(20),
  audit_notes TEXT,
  quality_score NUMERIC(3,1),
  delivery_score NUMERIC(3,1),
  communication_score NUMERIC(3,1),
  price_score NUMERIC(3,1),
  overall_score NUMERIC(3,1),
  logo_url TEXT,
  photos TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE materials (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL CHECK (type IN ('fabric','trim','packaging')),
  code VARCHAR(50) UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  composition VARCHAR(255),
  weight VARCHAR(50),
  width VARCHAR(50),
  color VARCHAR(100),
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  unit_price NUMERIC(10,4),
  price_unit VARCHAR(20),
  currency VARCHAR(3) DEFAULT 'USD',
  moq INTEGER,
  lead_time_days INTEGER,
  swatch_image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE styles (
  id SERIAL PRIMARY KEY,
  season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  style_number VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50),
  subcategory VARCHAR(50),
  description TEXT,
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  assigned_to INTEGER REFERENCES people(id) ON DELETE SET NULL,
  status VARCHAR(30) DEFAULT 'concept' CHECK (status IN ('concept','development','sampling','costing','approved','production','shipped','cancelled')),
  colorways JSONB DEFAULT '[]',
  size_run JSONB DEFAULT '{}',
  target_fob NUMERIC(10,2),
  actual_fob NUMERIC(10,2),
  target_retail NUMERIC(10,2),
  target_margin NUMERIC(5,2),
  development_start DATE,
  target_delivery DATE,
  thumbnail_url TEXT,
  tech_pack_url TEXT,
  images TEXT[],
  tags TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(season_id, style_number)
);

CREATE TABLE bom_items (
  id SERIAL PRIMARY KEY,
  style_id INTEGER NOT NULL REFERENCES styles(id) ON DELETE CASCADE,
  material_id INTEGER REFERENCES materials(id) ON DELETE SET NULL,
  material_name VARCHAR(255),
  material_description TEXT,
  component VARCHAR(100) NOT NULL,
  placement VARCHAR(100),
  consumption NUMERIC(10,4),
  consumption_unit VARCHAR(20),
  unit_price NUMERIC(10,4),
  currency VARCHAR(3) DEFAULT 'USD',
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE costing_sheets (
  id SERIAL PRIMARY KEY,
  style_id INTEGER NOT NULL REFERENCES styles(id) ON DELETE CASCADE,
  version INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected')),
  fabric_cost NUMERIC(10,4) DEFAULT 0,
  trim_cost NUMERIC(10,4) DEFAULT 0,
  cmt_cost NUMERIC(10,4) DEFAULT 0,
  wash_cost NUMERIC(10,4) DEFAULT 0,
  embellishment_cost NUMERIC(10,4) DEFAULT 0,
  packaging_cost NUMERIC(10,4) DEFAULT 0,
  testing_cost NUMERIC(10,4) DEFAULT 0,
  other_cost NUMERIC(10,4) DEFAULT 0,
  fob_price NUMERIC(10,4),
  duty_rate NUMERIC(5,2),
  duty_cost NUMERIC(10,4),
  freight_cost NUMERIC(10,4),
  landed_cost NUMERIC(10,4),
  retail_price NUMERIC(10,2),
  wholesale_price NUMERIC(10,2),
  margin_percent NUMERIC(5,2),
  currency VARCHAR(3) DEFAULT 'USD',
  notes TEXT,
  approved_by INTEGER REFERENCES people(id),
  approved_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES people(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rfqs (
  id SERIAL PRIMARY KEY,
  season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  style_id INTEGER NOT NULL REFERENCES styles(id) ON DELETE CASCADE,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('draft','sent','received','accepted','rejected','expired')),
  sent_date DATE,
  response_deadline DATE,
  quoted_fob NUMERIC(10,4),
  quoted_moq INTEGER,
  quoted_lead_time_days INTEGER,
  quoted_currency VARCHAR(3) DEFAULT 'USD',
  quote_valid_until DATE,
  quote_notes TEXT,
  internal_notes TEXT,
  assigned_to INTEGER REFERENCES people(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE samples (
  id SERIAL PRIMARY KEY,
  style_id INTEGER NOT NULL REFERENCES styles(id) ON DELETE CASCADE,
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  round VARCHAR(20) NOT NULL CHECK (round IN ('proto','fit','pp','top','shipment')),
  round_number INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'requested' CHECK (status IN ('requested','in_progress','received','under_review','approved','rejected','revised')),
  requested_date DATE,
  expected_date DATE,
  received_date DATE,
  reviewed_date DATE,
  reviewed_by INTEGER REFERENCES people(id),
  review_notes TEXT,
  measurements JSONB,
  fit_comments TEXT,
  photos TEXT[],
  colorway VARCHAR(100),
  size VARCHAR(20),
  tracking_number VARCHAR(100),
  courier VARCHAR(50),
  assigned_to INTEGER REFERENCES people(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchase_orders (
  id SERIAL PRIMARY KEY,
  po_number VARCHAR(50) NOT NULL UNIQUE,
  season_id INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','issued','confirmed','in_production','shipped','received','cancelled')),
  issue_date DATE,
  confirm_by_date DATE,
  confirmed_date DATE,
  ex_factory_date DATE,
  delivery_date DATE,
  currency VARCHAR(3) DEFAULT 'USD',
  total_qty INTEGER DEFAULT 0,
  total_amount NUMERIC(12,2) DEFAULT 0,
  payment_terms VARCHAR(100),
  ship_mode VARCHAR(20),
  destination VARCHAR(255),
  incoterms VARCHAR(10),
  assigned_to INTEGER REFERENCES people(id),
  notes TEXT,
  created_by INTEGER REFERENCES people(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE po_line_items (
  id SERIAL PRIMARY KEY,
  po_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  style_id INTEGER NOT NULL REFERENCES styles(id) ON DELETE CASCADE,
  colorway VARCHAR(100),
  size VARCHAR(20),
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC(10,4),
  total_price NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE critical_path_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  milestones JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE critical_path_milestones (
  id SERIAL PRIMARY KEY,
  po_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
  style_id INTEGER REFERENCES styles(id) ON DELETE CASCADE,
  milestone_name VARCHAR(100) NOT NULL,
  planned_date DATE,
  actual_date DATE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','delayed','skipped')),
  delay_reason TEXT,
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  updated_by INTEGER REFERENCES people(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inspections (
  id SERIAL PRIMARY KEY,
  po_id INTEGER REFERENCES purchase_orders(id) ON DELETE SET NULL,
  style_id INTEGER REFERENCES styles(id) ON DELETE SET NULL,
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('pre_production','inline','final','lab_test')),
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','pass','fail','conditional_pass','cancelled')),
  inspection_date DATE,
  inspector_id INTEGER REFERENCES people(id),
  aql_level VARCHAR(10),
  sample_size INTEGER,
  total_inspected INTEGER,
  defects_found INTEGER DEFAULT 0,
  critical_defects INTEGER DEFAULT 0,
  major_defects INTEGER DEFAULT 0,
  minor_defects INTEGER DEFAULT 0,
  defect_details JSONB,
  measurements_check JSONB,
  result_notes TEXT,
  photos TEXT[],
  report_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE shipments (
  id SERIAL PRIMARY KEY,
  shipment_ref VARCHAR(50) UNIQUE,
  season_id INTEGER REFERENCES seasons(id),
  supplier_id INTEGER REFERENCES suppliers(id),
  ship_mode VARCHAR(20) CHECK (ship_mode IN ('sea','air','courier','truck')),
  container_number VARCHAR(50),
  booking_number VARCHAR(50),
  bill_of_lading VARCHAR(50),
  tracking_number VARCHAR(100),
  carrier VARCHAR(100),
  etd DATE,
  atd DATE,
  eta DATE,
  ata DATE,
  customs_status VARCHAR(20) DEFAULT 'pending' CHECK (customs_status IN ('pending','in_clearance','cleared','held')),
  customs_docs JSONB,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','booked','in_transit','at_port','customs','delivered','cancelled')),
  freight_cost NUMERIC(10,2),
  insurance_cost NUMERIC(10,2),
  customs_duty NUMERIC(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  origin_port VARCHAR(100),
  destination_port VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE shipment_pos (
  id SERIAL PRIMARY KEY,
  shipment_id INTEGER NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  po_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  carton_count INTEGER,
  total_qty INTEGER,
  cbm NUMERIC(8,3),
  gross_weight_kg NUMERIC(8,2),
  UNIQUE(shipment_id, po_id)
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  style_id INTEGER REFERENCES styles(id) ON DELETE CASCADE,
  sample_id INTEGER REFERENCES samples(id) ON DELETE CASCADE,
  po_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
  inspection_id INTEGER REFERENCES inspections(id) ON DELETE CASCADE,
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES people(id),
  content TEXT NOT NULL,
  attachments TEXT[],
  mentions INTEGER[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE attachments (
  id SERIAL PRIMARY KEY,
  style_id INTEGER REFERENCES styles(id) ON DELETE CASCADE,
  sample_id INTEGER REFERENCES samples(id) ON DELETE CASCADE,
  po_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
  inspection_id INTEGER REFERENCES inspections(id) ON DELETE CASCADE,
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50),
  file_size INTEGER,
  category VARCHAR(50),
  uploaded_by INTEGER REFERENCES people(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE activity_log (
  id SERIAL PRIMARY KEY,
  person_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER,
  details JSONB,
  season_id INTEGER REFERENCES seasons(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_styles_season ON styles(season_id);
CREATE INDEX idx_styles_supplier ON styles(supplier_id);
CREATE INDEX idx_styles_assigned ON styles(assigned_to);
CREATE INDEX idx_styles_status ON styles(status);
CREATE INDEX idx_styles_category ON styles(category);
CREATE INDEX idx_bom_style ON bom_items(style_id);
CREATE INDEX idx_costing_style ON costing_sheets(style_id);
CREATE INDEX idx_rfqs_season ON rfqs(season_id);
CREATE INDEX idx_rfqs_style ON rfqs(style_id);
CREATE INDEX idx_rfqs_supplier ON rfqs(supplier_id);
CREATE INDEX idx_samples_style ON samples(style_id);
CREATE INDEX idx_samples_status ON samples(status);
CREATE INDEX idx_po_season ON purchase_orders(season_id);
CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_lines_po ON po_line_items(po_id);
CREATE INDEX idx_po_lines_style ON po_line_items(style_id);
CREATE INDEX idx_cp_po ON critical_path_milestones(po_id);
CREATE INDEX idx_cp_style ON critical_path_milestones(style_id);
CREATE INDEX idx_inspections_po ON inspections(po_id);
CREATE INDEX idx_inspections_style ON inspections(style_id);
CREATE INDEX idx_shipments_season ON shipments(season_id);
CREATE INDEX idx_shipment_pos_shipment ON shipment_pos(shipment_id);
CREATE INDEX idx_shipment_pos_po ON shipment_pos(po_id);
CREATE INDEX idx_comments_style ON comments(style_id);
CREATE INDEX idx_attachments_style ON attachments(style_id);
CREATE INDEX idx_activity_season ON activity_log(season_id);
CREATE INDEX idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_created ON activity_log(created_at DESC);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_materials_supplier ON materials(supplier_id);
CREATE INDEX idx_materials_type ON materials(type);

-- ROW LEVEL SECURITY
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE costing_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE critical_path_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE critical_path_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_pos ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON people FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON seasons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON styles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON bom_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON costing_sheets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON rfqs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON samples FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON purchase_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON po_line_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON critical_path_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON critical_path_milestones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON inspections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON shipments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON shipment_pos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON attachments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON activity_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON notifications FOR ALL USING (true) WITH CHECK (true);

-- SEED DATA
INSERT INTO seasons (code, name, start_date, end_date, is_active) VALUES
  ('SS26', 'Spring/Summer 2026', '2026-02-01', '2026-07-31', TRUE),
  ('AW26', 'Autumn/Winter 2026', '2026-08-01', '2027-01-31', TRUE),
  ('Resort27', 'Resort 2027', '2026-11-01', '2027-01-31', FALSE),
  ('SS27', 'Spring/Summer 2027', '2027-02-01', '2027-07-31', FALSE);

INSERT INTO critical_path_templates (name, milestones) VALUES
  ('Standard Production', '[{"name":"Order Confirmed","offset_days":0},{"name":"Fabric Booked","offset_days":7},{"name":"Fabric In-House","offset_days":35},{"name":"Trims In-House","offset_days":35},{"name":"Cutting Start","offset_days":42},{"name":"Sewing Start","offset_days":49},{"name":"Sewing Complete","offset_days":63},{"name":"Washing/Finishing","offset_days":67},{"name":"Packing","offset_days":72},{"name":"Ex-Factory","offset_days":77}]'),
  ('Fast Track Production', '[{"name":"Order Confirmed","offset_days":0},{"name":"Fabric In-House","offset_days":14},{"name":"Cutting Start","offset_days":18},{"name":"Sewing Start","offset_days":21},{"name":"Sewing Complete","offset_days":32},{"name":"Packing","offset_days":35},{"name":"Ex-Factory","offset_days":38}]');

-- STORAGE BUCKETS (create in Supabase Dashboard):
-- 1. style-images (public)
-- 2. sample-photos (public)
-- 3. tech-packs (authenticated)
-- 4. supplier-docs (authenticated)
-- 5. qc-reports (authenticated)
