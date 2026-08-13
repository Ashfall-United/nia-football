-- Links a clip back to the event it was generated from, when it was
-- created via the "Add as clip" highlight action rather than manually.
-- Nullable: most clips still have no originating event. On delete set
-- null rather than cascade — deleting the event shouldn't delete a clip
-- an analyst has already curated into the library.

alter table public.clips
  add column source_event_id uuid references public.events (id) on delete set null;

create index clips_source_event_id_idx on public.clips (source_event_id);

-- Same defence as the video/organisation check: a clip's source event, if
-- set, must belong to the same organisation as the clip.
create or replace function public.check_clip_source_event_organisation()
returns trigger
language plpgsql
as $$
begin
  if new.source_event_id is not null and not exists (
    select 1 from public.events e
    where e.id = new.source_event_id and e.organisation_id = new.organisation_id
  ) then
    raise exception 'Clip source event must match clip organisation';
  end if;
  return new;
end;
$$;

create trigger clips_check_source_event_organisation
  before insert or update on public.clips
  for each row execute function public.check_clip_source_event_organisation();
