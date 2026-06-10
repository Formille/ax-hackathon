-- Per-judge weight: each judge's score contributes proportionally to this
-- weight when computing the weighted-average judge result.
alter table public.judges
  add column if not exists weight numeric not null default 1 check (weight >= 0);
