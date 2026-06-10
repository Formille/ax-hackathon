-- =====================================================================
--  Participant self-service codes + app screenshots (with Storage bucket)
--  Run AFTER 0001_init.sql.
-- =====================================================================

-- Participant access codes (each team edits its own entry with this code)
alter table public.participants add column if not exists code text;

update public.participants
  set code = 'TEAM-' || upper(substr(md5(random()::text || id::text), 1, 5))
  where code is null;

create unique index if not exists participants_code_key on public.participants (code);

-- App screenshots: image stored in Storage, plus a caption.
create table if not exists public.screenshots (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  storage_path   text not null,
  caption        text,
  display_order  int not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists screenshots_participant_idx
  on public.screenshots (participant_id, display_order);

alter table public.screenshots enable row level security;
-- No anon policies: screenshot rows are read server-side via the service role.
-- (The image files themselves live in a public Storage bucket.)

-- Public storage bucket. Uploads go through the service role (server actions);
-- reads are public via the /object/public/screenshots/... URL.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('screenshots', 'screenshots', true, 10485760,
        array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
