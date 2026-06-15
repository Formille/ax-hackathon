-- Rubric level guidance shown to judges (낮음 / 보통 / 탁월).
alter table public.criteria
  add column if not exists level_low  text,
  add column if not exists level_mid  text,
  add column if not exists level_high text;
