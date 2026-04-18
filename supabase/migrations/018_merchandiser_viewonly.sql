-- 018_merchandiser_viewonly.sql
-- Strip merchandiser role to view-only + add `my_work.edit` as the single
-- write permission (for Kanban drag). Restrict merchandisers to Bridal division.

UPDATE roles
SET permissions = '[
  "range_plan.view",
  "dashboard.view",
  "tasks.view",
  "notifications.view",
  "styles.view",
  "orders.view",
  "materials.view",
  "samples.view",
  "production.view",
  "calendar.view",
  "content.view",
  "my_work.edit"
]'::jsonb
WHERE name = 'merchandiser';

-- Grant my_work.edit to admin so admins keep Kanban access
UPDATE roles
SET permissions = permissions || '["my_work.edit"]'::jsonb
WHERE name = 'admin' AND NOT (permissions ? 'my_work.edit');

-- Per-role division restriction (JSONB array of division codes; NULL = all)
ALTER TABLE roles ADD COLUMN IF NOT EXISTS division_codes JSONB;

UPDATE roles SET division_codes = '["BRIDAL"]'::jsonb WHERE name = 'merchandiser';
UPDATE roles SET division_codes = NULL WHERE name IN ('admin', 'viewer');
