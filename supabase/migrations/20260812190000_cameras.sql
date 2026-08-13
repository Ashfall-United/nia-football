-- Camera management.
--
-- Cameras are organisation-level assets (part of the media kit) rather
-- than team- or session-scoped, since the same physical camera gets
-- reused across sessions. stream_live_input_id is populated once the
-- camera is connected to a Cloudflare Stream live input (see
-- services/cloudflare/stream.ts) — a camera can exist and be named before
-- that connection is made.

create table public.cameras (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  stream_live_input_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, name)
);

create index cameras_organisation_id_idx on public.cameras (organisation_id);

create trigger cameras_set_updated_at
  before update on public.cameras
  for each row execute function public.set_updated_at();

alter table public.cameras enable row level security;

create policy "Members can view their organisation's cameras"
  on public.cameras for select
  using (public.is_organisation_member(organisation_id));

create policy "Owners, admins and media can manage cameras"
  on public.cameras for all
  using (public.has_organisation_role(organisation_id, array['owner', 'admin', 'media']::public.organisation_role[]))
  with check (public.has_organisation_role(organisation_id, array['owner', 'admin', 'media']::public.organisation_role[]));
