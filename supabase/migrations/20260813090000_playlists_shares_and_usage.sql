-- Playlists, public share links, and org plan tracking.

create type public.share_resource_type as enum ('clip', 'playlist');

create type public.organisation_plan as enum ('early_access', 'standard', 'pro');

alter table public.organisations
  add column if not exists plan public.organisation_plan not null default 'early_access';

create table public.playlists (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  description text,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index playlists_organisation_id_idx on public.playlists (organisation_id);

create trigger playlists_set_updated_at
  before update on public.playlists
  for each row execute function public.set_updated_at();

create table public.playlist_clips (
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  clip_id uuid not null references public.clips (id) on delete cascade,
  position integer not null check (position >= 0),
  primary key (playlist_id, clip_id)
);

create index playlist_clips_playlist_id_idx on public.playlist_clips (playlist_id);

create table public.shared_links (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  resource_type public.share_resource_type not null,
  resource_id uuid not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index shared_links_token_idx on public.shared_links (token);
create index shared_links_organisation_id_idx on public.shared_links (organisation_id);

create index events_organisation_review_status_idx
  on public.events (organisation_id, review_status);

-- Row Level Security

alter table public.playlists enable row level security;
alter table public.playlist_clips enable row level security;
alter table public.shared_links enable row level security;

create policy "Members can view their organisation's playlists"
  on public.playlists for select
  using (public.is_organisation_member(organisation_id));

create policy "Owners, admins and coaches can manage playlists"
  on public.playlists for all
  using (public.has_organisation_role(organisation_id, array['owner', 'admin', 'coach']::public.organisation_role[]))
  with check (public.has_organisation_role(organisation_id, array['owner', 'admin', 'coach']::public.organisation_role[]));

create policy "Members can view playlist clips"
  on public.playlist_clips for select
  using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id
        and public.is_organisation_member(p.organisation_id)
    )
  );

create policy "Owners, admins and coaches can manage playlist clips"
  on public.playlist_clips for all
  using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id
        and public.has_organisation_role(p.organisation_id, array['owner', 'admin', 'coach']::public.organisation_role[])
    )
  )
  with check (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_id
        and public.has_organisation_role(p.organisation_id, array['owner', 'admin', 'coach']::public.organisation_role[])
    )
  );

create policy "Members can view their organisation's share links"
  on public.shared_links for select
  using (public.is_organisation_member(organisation_id));

create policy "Owners, admins and coaches can manage share links"
  on public.shared_links for all
  using (public.has_organisation_role(organisation_id, array['owner', 'admin', 'coach']::public.organisation_role[]))
  with check (public.has_organisation_role(organisation_id, array['owner', 'admin', 'coach']::public.organisation_role[]));

-- Public share preview (no auth required)

create or replace function public.get_shared_link_preview(link_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  link_row public.shared_links%rowtype;
  result jsonb;
begin
  select * into link_row
  from public.shared_links
  where token = link_token
  limit 1;

  if not found then
    return null;
  end if;

  if link_row.expires_at is not null and link_row.expires_at < now() then
    return jsonb_build_object('expired', true);
  end if;

  if link_row.resource_type = 'clip' then
    select jsonb_build_object(
      'resourceType', 'clip',
      'organisationName', o.name,
      'title', c.title,
      'startSeconds', c.start_seconds,
      'endSeconds', c.end_seconds,
      'notes', c.notes,
      'videoId', c.video_id,
      'streamUid', v.cloudflare_stream_uid
    ) into result
    from public.clips c
    join public.organisations o on o.id = c.organisation_id
    join public.videos v on v.id = c.video_id
    where c.id = link_row.resource_id
      and c.organisation_id = link_row.organisation_id;
  else
    select jsonb_build_object(
      'resourceType', 'playlist',
      'organisationName', o.name,
      'title', p.title,
      'description', p.description,
      'clips', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'title', c.title,
              'startSeconds', c.start_seconds,
              'endSeconds', c.end_seconds,
              'streamUid', v.cloudflare_stream_uid,
              'position', pc.position
            )
            order by pc.position
          )
          from public.playlist_clips pc
          join public.clips c on c.id = pc.clip_id
          join public.videos v on v.id = c.video_id
          where pc.playlist_id = p.id
        ),
        '[]'::jsonb
      )
    ) into result
    from public.playlists p
    join public.organisations o on o.id = p.organisation_id
    where p.id = link_row.resource_id
      and p.organisation_id = link_row.organisation_id;
  end if;

  if result is null then
    return null;
  end if;

  return result;
end;
$$;

grant execute on function public.get_shared_link_preview(text) to anon, authenticated;
