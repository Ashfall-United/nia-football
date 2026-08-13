-- Pitch calibration and heatmaps.
--
-- A calibration maps pixel coordinates on a specific video to real-world
-- pitch coordinates (a homography), computed from at least 4 points an
-- analyst clicks against a video frame (e.g. corner flags, penalty box
-- corners). Recalibration is per video, not per camera — camera position
-- and zoom can change between sessions even on the same physical rig.
--
-- A heatmap is a saved density grid produced by the ML service from a
-- calibration plus that video's detected ground positions. We do not
-- persist raw per-frame detections here — they're large and only useful
-- as an intermediate step toward the aggregated grid.

create table public.video_calibrations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  pitch_length_meters numeric not null check (pitch_length_meters > 0),
  pitch_width_meters numeric not null check (pitch_width_meters > 0),
  points jsonb not null check (jsonb_array_length(points) >= 4),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (video_id)
);

create index video_calibrations_organisation_id_idx on public.video_calibrations (organisation_id);

create trigger video_calibrations_set_updated_at
  before update on public.video_calibrations
  for each row execute function public.set_updated_at();

create or replace function public.check_calibration_video_organisation()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.videos v
    where v.id = new.video_id and v.organisation_id = new.organisation_id
  ) then
    raise exception 'Calibration organisation must match video organisation';
  end if;
  return new;
end;
$$;

create trigger video_calibrations_check_organisation
  before insert or update on public.video_calibrations
  for each row execute function public.check_calibration_video_organisation();

-- 'ball' maps to the ML service's COCO "sports ball" class — kept as a
-- plain product-facing name here rather than leaking that detail into
-- the schema.
create type public.heatmap_target as enum ('person', 'ball');

create table public.heatmaps (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  calibration_id uuid not null references public.video_calibrations (id) on delete cascade,
  target public.heatmap_target not null,
  sample_fps numeric not null check (sample_fps > 0),
  frame_count integer not null check (frame_count >= 0),
  sample_count integer not null check (sample_count >= 0),
  grid_cols integer not null check (grid_cols > 0),
  grid_rows integer not null check (grid_rows > 0),
  grid jsonb not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index heatmaps_organisation_id_idx on public.heatmaps (organisation_id);
create index heatmaps_video_id_idx on public.heatmaps (video_id);

create or replace function public.check_heatmap_video_organisation()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.videos v
    where v.id = new.video_id and v.organisation_id = new.organisation_id
  ) then
    raise exception 'Heatmap organisation must match video organisation';
  end if;

  if not exists (
    select 1 from public.video_calibrations c
    where c.id = new.calibration_id
      and c.organisation_id = new.organisation_id
      and c.video_id = new.video_id
  ) then
    raise exception 'Heatmap calibration must match its video and organisation';
  end if;

  return new;
end;
$$;

create trigger heatmaps_check_organisation
  before insert or update on public.heatmaps
  for each row execute function public.check_heatmap_video_organisation();

-- Row Level Security
--
-- Same access model as clips/events: any member can view, only analysis
-- roles (owner/admin/coach/analyst) can create.

alter table public.video_calibrations enable row level security;
alter table public.heatmaps enable row level security;

create policy "Members can view their organisation's calibrations"
  on public.video_calibrations for select
  using (public.is_organisation_member(organisation_id));

create policy "Owners, admins, coaches and analysts can manage calibrations"
  on public.video_calibrations for all
  using (public.has_organisation_role(organisation_id, array['owner', 'admin', 'coach', 'analyst']::public.organisation_role[]))
  with check (public.has_organisation_role(organisation_id, array['owner', 'admin', 'coach', 'analyst']::public.organisation_role[]));

create policy "Members can view their organisation's heatmaps"
  on public.heatmaps for select
  using (public.is_organisation_member(organisation_id));

create policy "Owners, admins, coaches and analysts can manage heatmaps"
  on public.heatmaps for all
  using (public.has_organisation_role(organisation_id, array['owner', 'admin', 'coach', 'analyst']::public.organisation_role[]))
  with check (public.has_organisation_role(organisation_id, array['owner', 'admin', 'coach', 'analyst']::public.organisation_role[]));
