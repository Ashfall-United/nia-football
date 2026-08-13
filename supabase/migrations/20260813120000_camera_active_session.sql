-- Tracks which session a camera's live feed should be attributed to.
--
-- Cameras are reused across sessions (see 20260812190000_cameras.sql), so
-- there's no static camera->session link. A media operator sets this
-- right before going live (Live Monitor page); when Cloudflare's webhook
-- reports the resulting live recording, we use it to know which session
-- to file the video under, then clear it — a stale value must not
-- misattribute the next live session's recording.

alter table public.cameras
  add column active_session_id uuid references public.sessions (id) on delete set null;

create index cameras_active_session_id_idx on public.cameras (active_session_id);

create or replace function public.check_camera_active_session_organisation()
returns trigger
language plpgsql
as $$
begin
  if new.active_session_id is not null and not exists (
    select 1 from public.sessions s
    where s.id = new.active_session_id and s.organisation_id = new.organisation_id
  ) then
    raise exception 'Camera active session must match camera organisation';
  end if;
  return new;
end;
$$;

create trigger cameras_check_active_session_organisation
  before insert or update on public.cameras
  for each row execute function public.check_camera_active_session_organisation();
