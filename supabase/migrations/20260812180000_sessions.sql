-- Sessions and matches.
--
-- A single table for both: training sessions and matches share almost all
-- of their structure (team, schedule, pitch, notes), and every later
-- attachment point (cameras, video, events, clips) is simpler with one
-- parent type instead of two. Match-only columns are nullable and
-- enforced by a check constraint instead of a second table.

create type public.session_type as enum ('training', 'match');

create type public.pitch_surface as enum (
  'grass',
  'turf',
  'gravel',
  'sand',
  'mud',
  'mixed',
  'other'
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  type public.session_type not null,
  scheduled_at timestamptz not null,
  location text,
  pitch_surface public.pitch_surface,
  notes text,
  -- Match-only fields.
  opponent_name text,
  is_home boolean,
  competition text,
  team_score smallint,
  opponent_score smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (type = 'match' and opponent_name is not null)
    or (type = 'training' and opponent_name is null and is_home is null
      and competition is null and team_score is null and opponent_score is null)
  )
);

create index sessions_organisation_id_idx on public.sessions (organisation_id);
create index sessions_team_id_idx on public.sessions (team_id);
create index sessions_scheduled_at_idx on public.sessions (scheduled_at);

create trigger sessions_set_updated_at
  before update on public.sessions
  for each row execute function public.set_updated_at();

-- Same defence as players/teams: a session's organisation must match its
-- team's organisation, so a team from a different tenant can never be
-- attached even if application code gets the check wrong.
create or replace function public.check_session_team_organisation()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.teams t
    where t.id = new.team_id
      and t.organisation_id = new.organisation_id
  ) then
    raise exception 'Session organisation must match team organisation';
  end if;
  return new;
end;
$$;

create trigger sessions_check_team_organisation
  before insert or update on public.sessions
  for each row execute function public.check_session_team_organisation();

-- Row Level Security

alter table public.sessions enable row level security;

create policy "Members can view their organisation's sessions"
  on public.sessions for select
  using (public.is_organisation_member(organisation_id));

create policy "Owners, admins and coaches can manage sessions"
  on public.sessions for all
  using (public.has_organisation_role(organisation_id, array['owner', 'admin', 'coach']::public.organisation_role[]))
  with check (public.has_organisation_role(organisation_id, array['owner', 'admin', 'coach']::public.organisation_role[]));
