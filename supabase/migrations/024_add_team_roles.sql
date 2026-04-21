-- 024_add_team_roles.sql
-- Add social_media, design, and marketing roles.
-- Each has the full admin permission set EXCEPT admin-only permissions:
--   admin.access, team.view, team.edit, activity.view, settings.view, settings.edit
-- division_codes = NULL (all divisions).

INSERT INTO roles (name, permissions, division_codes) VALUES
  ('social_media', '[
    "range_plan.view","range_plan.edit",
    "suppliers.view","suppliers.edit",
    "dashboard.view","dashboard.edit_targets",
    "tasks.view","tasks.create","tasks.edit","tasks.assign",
    "production.view","production.edit",
    "notifications.view",
    "styles.view","styles.edit",
    "orders.view","orders.edit",
    "materials.view","materials.edit",
    "samples.view","samples.edit",
    "calendar.view",
    "content.view","content.edit",
    "my_work.edit"
  ]'::jsonb, NULL),
  ('design', '[
    "range_plan.view","range_plan.edit",
    "suppliers.view","suppliers.edit",
    "dashboard.view","dashboard.edit_targets",
    "tasks.view","tasks.create","tasks.edit","tasks.assign",
    "production.view","production.edit",
    "notifications.view",
    "styles.view","styles.edit",
    "orders.view","orders.edit",
    "materials.view","materials.edit",
    "samples.view","samples.edit",
    "calendar.view",
    "content.view","content.edit",
    "my_work.edit"
  ]'::jsonb, NULL),
  ('marketing', '[
    "range_plan.view","range_plan.edit",
    "suppliers.view","suppliers.edit",
    "dashboard.view","dashboard.edit_targets",
    "tasks.view","tasks.create","tasks.edit","tasks.assign",
    "production.view","production.edit",
    "notifications.view",
    "styles.view","styles.edit",
    "orders.view","orders.edit",
    "materials.view","materials.edit",
    "samples.view","samples.edit",
    "calendar.view",
    "content.view","content.edit",
    "my_work.edit"
  ]'::jsonb, NULL)
ON CONFLICT (name) DO NOTHING;
