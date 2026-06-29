create table if not exists rough_sketches (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  file_url    text not null,
  file_name   text,
  file_type   text,
  status      text not null default 'in_review'
                check (status in ('in_review', 'approved')),
  notes       text,
  uploaded_by integer references people(id) on delete set null,
  division_id integer references divisions(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists rough_sketches_division_idx on rough_sketches(division_id);
create index if not exists rough_sketches_status_idx   on rough_sketches(status);
