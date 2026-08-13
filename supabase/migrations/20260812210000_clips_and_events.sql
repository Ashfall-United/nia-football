-- Clips and events.
--
-- A clip is an in/out time range on an existing Cloudflare Stream video,
-- not a separately exported file — export to a durable R2 asset is a
-- later concern. An event is a timestamped football moment on a video,
-- optionally tagged with the players involved.

create table public.clips (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  start_seconds integer not null check (start_seconds >= 0),
  end_seconds integer not null check (end_seconds > start_seconds),
  notes text,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clips_organisation_id_idx on public.clips (organisation_id);
create index clips_video_id_idx on public.clips (video_id);

create trigger clips_set_updated_at
  before update on public.clips
  for each row execute function public.set_updated_at();

create type public.event_type as enum (
  -- Attacking
  'build_up',
  'progression',
  'chance_creation',
  'shot',
  'goal',
  'cross',
  'third_man_action',
  'half_space_reception',
  'rotation',
  'space_creation',
  'space_exploitation',
  -- Defending
  'press',
  'pressing_pair',
  'counterpress',
  'recovery',
  'interception',
  'defensive_transition',
  'block',
  -- General
  'foul',
  'corner',
  'free_kick',
  'throw_in',
  'substitution',
  'injury',
  'pause'
);

create type public.event_review_status as enum (
  'suggested',
  'confirmed',
  'edited',
  'rejected'
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  type public.event_type not null,
  timestamp_seconds integer not null check (timestamp_seconds >= 0),
  -- Every event created through the app today is a human tagging it
  -- directly, so it defaults to 'confirmed'. The future ML service will
  -- insert rows with 'suggested' explicitly.
  review_status public.event_review_status not null default 'confirmed',
  notes text,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index events_organisation_id_idx on public.events (organisation_id);
create index events_video_id_idx on public.events (video_id);

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

create table public.event_players (
  event_id uuid not null references public.events (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  primary key (event_id, player_id)
);

-- Integrity: clip/event organisation must match their video's
-- organisation, and a tagged player must belong to the same organisation
-- as the event.

create or replace function public.check_clip_video_organisation()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.videos v
    where v.id = new.video_id and v.organisation_id = new.organisation_id
  ) then
    raise exception 'Clip organisation must match video organisation';
  end if;
  return new;
end;
$$;

create trigger clips_check_video_organisation
  before insert or update on public.clips
  for each row execute function public.check_clip_video_organisation();

create or replace function public.check_event_video_organisation()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.videos v
    where v.id = new.video_id and v.organisation_id = new.organisation_id
  ) then
    raise exception 'Event organisation must match video organisation';
  end if;
  return new;
end;
$$;

create trigger events_check_video_organisation
  before insert or update on public.events
  for each row execute function public.check_event_video_organisation();

create or replace function public.check_event_player_organisation()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.events e
    join public.players p on p.id = new.player_id
    where e.id = new.event_id
      and p.organisation_id = e.organisation_id
  ) then
    raise exception 'Tagged player must belong to the event organisation';
  end if;
  return new;
end;
$$;

create trigger event_players_check_organisation
  before insert or update on public.event_players
  for each row execute function public.check_event_player_organisation();

-- Row Level Security
--
-- Clips and events are visible to every organisation member (coaches,
-- analysts, media, viewers all consume them) but only created/edited by
-- the roles that actually do analysis work.

alter table public.clips enable row level security;
alter table public.events enable row level security;
alter table public.event_players enable row level security;

create policy "Members can view their organisation's clips"
  on public.clips for select
  using (public.is_organisation_member(organisation_id));

create policy "Owners, admins, coaches and analysts can manage clips"
  on public.clips for all
  using (public.has_organisation_role(organisation_id, array['owner', 'admin', 'coach', 'analyst']::public.organisation_role[]))
  with check (public.has_organisation_role(organisation_id, array['owner', 'admin', 'coach', 'analyst']::public.organisation_role[]));

create policy "Members can view their organisation's events"
  on public.events for select
  using (public.is_organisation_member(organisation_id));

create policy "Owners, admins, coaches and analysts can manage events"
  on public.events for all
  using (public.has_organisation_role(organisation_id, array['owner', 'admin', 'coach', 'analyst']::public.organisation_role[]))
  with check (public.has_organisation_role(organisation_id, array['owner', 'admin', 'coach', 'analyst']::public.organisation_role[]));

create policy "Members can view event player tags"
  on public.event_players for select
  using (
    exists (
      select 1 from public.events e
      where e.id = event_players.event_id
        and public.is_organisation_member(e.organisation_id)
    )
  );

create policy "Owners, admins, coaches and analysts can manage event player tags"
  on public.event_players for all
  using (
    exists (
      select 1 from public.events e
      where e.id = event_players.event_id
        and public.has_organisation_role(e.organisation_id, array['owner', 'admin', 'coach', 'analyst']::public.organisation_role[])
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_players.event_id
        and public.has_organisation_role(e.organisation_id, array['owner', 'admin', 'coach', 'analyst']::public.organisation_role[])
    )
  );
