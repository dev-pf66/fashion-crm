-- Rename seasons table to divisions
ALTER TABLE seasons RENAME TO divisions;

-- Rename season_id → division_id on all tables
ALTER TABLE styles RENAME COLUMN season_id TO division_id;
ALTER TABLE purchase_orders RENAME COLUMN season_id TO division_id;

-- Add division_id to tasks and ranges
ALTER TABLE tasks ADD COLUMN division_id INTEGER REFERENCES divisions(id);
ALTER TABLE ranges ADD COLUMN division_id INTEGER REFERENCES divisions(id);

-- Rename season text field on ranges to division
ALTER TABLE ranges RENAME COLUMN season TO division;

-- Rename season_id on activity_log and style_requests if they exist
ALTER TABLE activity_log RENAME COLUMN season_id TO division_id;
ALTER TABLE style_requests RENAME COLUMN season_id TO division_id;
