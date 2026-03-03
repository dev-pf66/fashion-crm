-- Add supplier_id to range_styles
ALTER TABLE range_styles ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES suppliers(id);
