-- Add sketch_status to range_styles for the Rough Sketches board
alter table range_styles
  add column if not exists sketch_status text
    check (sketch_status in ('in_review', 'approved'));
