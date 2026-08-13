-- Teams and players.
--
-- Both carry organisation_id directly (not only reachable by joining
-- through teams) so RLS and org-scoped queries never need to join through
-- teams to enforce tenant isolation, and so a player can exist in an
-- organisation's pool before being assigned to a team.

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, name)
);

create index teams_organisation_id_idx on public.teams (organisation_id);

create type public.player_position as enum (
  'gk',
  'rb',
  'cb',
  'lb',
  'rwb',
  'lwb',
  'cdm',
  'cm',
  'cam',
  'rm',
  'lm',
  'rw',
  'lw',
  'st',
  'cf'
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  team_id uuid references public.teams (id) on delete set null,
  first_name text not null check (char_length(btrim(first_name)) > 0),
  last_name text not null check (char_length(btrim(last_name)) > 0),
  date_of_birth date,
  position public.player_position,
  jersey_number smallint check (jersey_number is null or jersey_number between 1 and 99),
  -- Storage object path (not a public URL): player photos are read through
  -- signed URLs generated per-request, scoped to organisation members.
  photo_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index players_organisation_id_idx on public.players (organisation_id);
create index players_team_id_idx on public.players (team_id);

create trigger teams_set_updated_at
  before update on public.teams
  for each row execute function public.set_updated_at();

create trigger players_set_updated_at
  before update on public.players
  for each row execute function public.set_updated_at();

-- A player's organisation must match its team's organisation, so assigning
-- a team from a different tenant can never smuggle a player across the
-- tenant boundary even if application code gets this wrong.
create or replace function public.check_player_team_organisation()
returns trigger
language plpgsql
as $$
begin
  if new.team_id is not null then
    if not exists (
      select 1
      from public.teams t
      where t.id = new.team_id
        and t.organisation_id = new.organisation_id
    ) then
      raise exception 'Player organisation must match team organisation';
    end if;
  end if;
  return new;
end;
$$;

create trigger players_check_team_organisation
  before insert or update on public.players
  for each row execute function public.check_player_team_organisation();

-- Row Level Security

alter table public.teams enable row level security;
alter table public.players enable row level security;

create policy "Members can view their organisation's teams"
  on public.teams for select
  using (public.is_organisation_member(organisation_id));

create policy "Owners, admins and coaches can manage teams"
  on public.teams for all
  using (public.has_organisation_role(organisation_id, array['owner', 'admin', 'coach']::public.organisation_role[]))
  with check (public.has_organisation_role(organisation_id, array['owner', 'admin', 'coach']::public.organisation_role[]));

create policy "Members can view their organisation's players"
  on public.players for select
  using (public.is_organisation_member(organisation_id));

create policy "Owners, admins and coaches can manage players"
  on public.players for all
  using (public.has_organisation_role(organisation_id, array['owner', 'admin', 'coach']::public.organisation_role[]))
  with check (public.has_organisation_role(organisation_id, array['owner', 'admin', 'coach']::public.organisation_role[]));

-- Player photos: private bucket, objects stored under
-- `${organisation_id}/...` so the existing organisation-role helpers scope
-- access without a new lookup table. Not public like club logos, since
-- these are photos of real people (often minors) — reads go through
-- short-lived signed URLs, generated server-side for organisation members.

insert into storage.buckets (id, name, public)
values ('player-photos', 'player-photos', false)
on conflict (id) do nothing;

create policy "Roster managers can upload player photos"
  on storage.objects for insert
  with check (
    bucket_id = 'player-photos'
    and public.has_organisation_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner', 'admin', 'coach']::public.organisation_role[]
    )
  );

create policy "Roster managers can replace player photos"
  on storage.objects for update
  using (
    bucket_id = 'player-photos'
    and public.has_organisation_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner', 'admin', 'coach']::public.organisation_role[]
    )
  )
  with check (
    bucket_id = 'player-photos'
    and public.has_organisation_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner', 'admin', 'coach']::public.organisation_role[]
    )
  );

create policy "Organisation members can view player photos"
  on storage.objects for select
  using (
    bucket_id = 'player-photos'
    and public.is_organisation_member(((storage.foldername(name))[1])::uuid)
  );
