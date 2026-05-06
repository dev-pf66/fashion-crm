-- 037_admin_viewer_role.sql
-- Read-only oversight role for heads of production / heads of teams who
-- need to see every piece across every section without being able to edit
-- anything. Sits between merchandiser (own assigned pieces, can drag My
-- Work) and admin (full edit + Command Centre).
--
-- Visibility-wise this role is treated as "all access" by the front-end —
-- usePermissions includes it alongside admin in the isAllAccess set —
-- so My Work loads the team's full assigned list, dashboards show every
-- division, etc. Edit gates check specific *.edit permissions which this
-- role does not have, so no path leaks a write.
--
-- division_codes = NULL means access to every division.

INSERT INTO roles (name, permissions, division_codes) VALUES (
  'admin_viewer',
  '[
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
    "suppliers.view",
    "team.view",
    "activity.view"
  ]'::jsonb,
  NULL
)
ON CONFLICT (name) DO UPDATE SET
  permissions = EXCLUDED.permissions,
  division_codes = EXCLUDED.division_codes;

NOTIFY pgrst, 'reload schema';
