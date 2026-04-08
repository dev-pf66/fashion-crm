-- ============================================
-- 011: Roles & Permissions Infrastructure
-- ============================================

-- 1. Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Seed the three initial roles
INSERT INTO roles (name, permissions) VALUES
  ('admin', '["range_plan.view","range_plan.edit","suppliers.view","suppliers.edit","dashboard.view","dashboard.edit_targets","tasks.view","tasks.create","tasks.edit","tasks.assign","team.view","team.edit","activity.view","settings.view","settings.edit","admin.access","production.view","production.edit","notifications.view","styles.view","styles.edit","orders.view","orders.edit","materials.view","materials.edit","samples.view","samples.edit","calendar.view","content.view","content.edit"]'),
  ('viewer', '["range_plan.view","dashboard.view","tasks.view","notifications.view","styles.view","calendar.view","production.view","content.view"]'),
  ('merchandiser', '["range_plan.view","dashboard.view","tasks.view","tasks.create","tasks.edit","notifications.view","styles.view","styles.edit","orders.view","orders.edit","materials.view","materials.edit","samples.view","samples.edit","calendar.view","production.view","production.edit","content.view"]')
ON CONFLICT (name) DO NOTHING;

-- 3. Add role_id FK to people table
ALTER TABLE people ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id);

-- 4. Migrate existing users
UPDATE people SET role_id = (SELECT id FROM roles WHERE name = 'admin')
  WHERE role = 'admin' AND role_id IS NULL;

UPDATE people SET role_id = (SELECT id FROM roles WHERE name = 'merchandiser')
  WHERE (role IS NULL OR role != 'admin') AND role_id IS NULL;
