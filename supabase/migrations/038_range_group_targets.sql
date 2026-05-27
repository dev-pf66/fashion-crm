-- Range group targets: admins set a target count per group within a range
-- e.g. "Saree" category in range X should have 50 pieces → shows 19/50

create table if not exists range_group_targets (
  id            bigint generated always as identity primary key,
  range_id      uuid        not null references ranges(id) on delete cascade,
  group_by      text        not null default 'category',
  group_key     text        not null,
  target_value  integer     not null default 0 check (target_value >= 0),
  updated_by    integer     references people(id) on delete set null,
  updated_at    timestamptz not null default now(),
  unique (range_id, group_by, group_key)
);

alter table range_group_targets enable row level security;

create policy "authenticated full access"
  on range_group_targets for all
  to authenticated
  using (true) with check (true);
