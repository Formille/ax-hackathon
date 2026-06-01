-- =====================================================================
--  Hackathon Arena — initial schema
--  Audience voting (anonymous) + judge scoring (rubric) + raffle
--
--  Security model:
--   - Anon/public role may ONLY read `settings` and published `participants`.
--   - Everything else is written/read through Next.js server actions using
--     the SERVICE ROLE key (which bypasses RLS). RLS therefore acts as a
--     hard backstop: even with the public anon key, nobody can read vote
--     tallies, raffle identities, judge codes or evaluations.
--   - Anonymity is STRUCTURAL: `votes.voter_token` and
--     `raffle_entries.raffle_token` are independent random tokens with no
--     foreign key between them, so a ballot can never be linked to a name.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Settings (single row, id = 1)
-- ---------------------------------------------------------------------
create table if not exists public.settings (
  id                     int primary key default 1,
  event_name             text not null default '해커톤',
  -- draft → voting → closed → revealed
  phase                  text not null default 'draft'
                           check (phase in ('draft', 'voting', 'closed', 'revealed')),
  current_participant_id uuid,                       -- "now presenting" pointer
  max_votes_per_voter    int  not null default 3
                           check (max_votes_per_voter between 1 and 50),
  judging_open           boolean not null default true,
  popularity_award_label text not null default '인기상',
  updated_at             timestamptz not null default now(),
  constraint settings_singleton check (id = 1)
);

-- ---------------------------------------------------------------------
-- Participants (apps / teams)
-- ---------------------------------------------------------------------
create table if not exists public.participants (
  id            uuid primary key default gen_random_uuid(),
  display_order int  not null default 0,
  team_name     text not null,
  project_name  text not null,
  tagline       text,
  description   text,
  thumbnail_url text,
  demo_url      text,
  members       text,
  published     boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists participants_order_idx on public.participants (display_order);

-- now-presenting pointer references a participant
alter table public.settings
  drop constraint if exists settings_current_participant_fkey;
alter table public.settings
  add constraint settings_current_participant_fkey
  foreign key (current_participant_id)
  references public.participants(id) on delete set null;

-- ---------------------------------------------------------------------
-- Audience votes (ANONYMOUS — voter_token is not linked to any identity)
-- ---------------------------------------------------------------------
create table if not exists public.votes (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  voter_token    text not null,
  created_at     timestamptz not null default now(),
  unique (participant_id, voter_token)
);
create index if not exists votes_participant_idx on public.votes (participant_id);

-- ---------------------------------------------------------------------
-- Raffle entries (IDENTITY — structurally separate from votes)
-- ---------------------------------------------------------------------
create table if not exists public.raffle_entries (
  id           uuid primary key default gen_random_uuid(),
  raffle_token text not null unique,
  name         text not null,
  affiliation  text,
  participated boolean not null default false,
  is_winner    boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Judges (individual access codes)
-- ---------------------------------------------------------------------
create table if not exists public.judges (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  code       text not null unique,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Rubric criteria (max score + weight)
-- ---------------------------------------------------------------------
create table if not exists public.criteria (
  id            uuid primary key default gen_random_uuid(),
  display_order int  not null default 0,
  label         text not null,
  description   text,
  max_score     int  not null default 10 check (max_score between 1 and 100),
  weight        numeric not null default 1 check (weight >= 0),
  created_at    timestamptz not null default now()
);
create index if not exists criteria_order_idx on public.criteria (display_order);

-- ---------------------------------------------------------------------
-- Evaluations: one per (judge, participant)
-- ---------------------------------------------------------------------
create table if not exists public.evaluations (
  id             uuid primary key default gen_random_uuid(),
  judge_id       uuid not null references public.judges(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  comment        text,
  submitted      boolean not null default false,
  updated_at     timestamptz not null default now(),
  unique (judge_id, participant_id)
);
create index if not exists evaluations_participant_idx on public.evaluations (participant_id);

-- per-criterion scores
create table if not exists public.evaluation_scores (
  id            uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.evaluations(id) on delete cascade,
  criterion_id  uuid not null references public.criteria(id) on delete cascade,
  score         numeric not null default 0,
  comment       text,
  unique (evaluation_id, criterion_id)
);

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.settings          enable row level security;
alter table public.participants      enable row level security;
alter table public.votes             enable row level security;
alter table public.raffle_entries    enable row level security;
alter table public.judges            enable row level security;
alter table public.criteria          enable row level security;
alter table public.evaluations       enable row level security;
alter table public.evaluation_scores enable row level security;

-- Public read: settings + published participants only.
drop policy if exists "settings_public_read" on public.settings;
create policy "settings_public_read"
  on public.settings for select
  using (true);

drop policy if exists "participants_public_read" on public.participants;
create policy "participants_public_read"
  on public.participants for select
  using (published = true);

-- No other policies => default deny for anon/authenticated on every other
-- table. All privileged access goes through the service role (server side).

-- ---------------------------------------------------------------------
-- Helper: vote tally (read via service role only)
-- ---------------------------------------------------------------------
create or replace view public.vote_counts as
  select p.id as participant_id, count(v.id)::int as votes
  from public.participants p
  left join public.votes v on v.participant_id = p.id
  group by p.id;

revoke all on public.vote_counts from anon, authenticated;
grant select on public.vote_counts to service_role;
