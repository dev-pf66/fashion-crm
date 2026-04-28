-- 032_rename_silhouette_to_category.sql
-- The dashboard matrix now keys cells off the piece's category (which has a
-- proper dropdown) instead of silhouette (free-text, prone to typos). Rename
-- the column so existing targets keep their data; rename the unique
-- constraint to match.
--
-- Note: existing targets keyed by silhouette names will appear under
-- "category" after this. If a row's silhouette name doesn't match an actual
-- category, the target is effectively orphaned (still in the table, just
-- never displayed). Admins can re-enter targets if needed.

ALTER TABLE division_cell_targets RENAME COLUMN silhouette TO category;

ALTER TABLE division_cell_targets
  RENAME CONSTRAINT division_cell_targets_division_id_silhouette_price_bracket_key
  TO division_cell_targets_division_id_category_price_bracket_key;
