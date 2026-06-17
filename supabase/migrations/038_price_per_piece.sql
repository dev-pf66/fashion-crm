-- 038_price_per_piece.sql
-- Per-piece price for the Home-line pricing table. Lives on range_styles so
-- it sits alongside the supplier_id and production_qty the pricing table
-- reuses. Nullable — only Home pieces get priced, everything else stays NULL.

ALTER TABLE range_styles ADD COLUMN IF NOT EXISTS price_per_piece NUMERIC;

NOTIFY pgrst, 'reload schema';
