
create type public.video_status as enum ('uploading', 'ready', 'error');

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  camera_id uuid not null references public.cameras (id) on delete cascade,
  cloudflare_stream_uid text not null,
  status public.video_status not null default 'uploading',
  duration_seconds integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index videos_organisation_id_idx on public.videos (organisation_id);
create index videos_session_id_idx on public.videos (session_id);

create trigger videos_set_updated_at
  before update on public.videos
  for each row execute function public.set_updated_at();

-- Same defence as sessions/players: a video's organisation must match
-- both its session's and its camera's organisation.
create or replace function public.check_video_organisation()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.sessions s
    where s.id = new.session_id
      and s.organisation_id = new.organisation_id
  ) then
    raise exception 'Video organisation must match session organisation';
  end if;

  if not exists (
    select 1
    from public.cameras c
    where c.id = new.camera_id
      and c.organisation_id = new.organisation_id
  ) then
    raise exception 'Video organisation must match camera organisation';
  end if;

  return new;
end;
$$;

create trigger videos_check_organisation
  before insert or update on public.videos
  for each row execute function public.check_video_organisation();

-- Row Level Security

alter table public.videos enable row level security;

create policy "Members can view their organisation's videos"
  on public.videos for select
  using (public.is_organisation_member(organisation_id));

create policy "Owners, admins and media can manage videos"
  on public.videos for all
  using (public.has_organisation_role(organisation_id, array['owner', 'admin', 'media']::public.organisation_role[]))
  with check (public.has_organisation_role(organisation_id, array['owner', 'admin', 'media']::public.organisation_role[]));
