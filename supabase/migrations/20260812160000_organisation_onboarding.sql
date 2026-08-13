-- Organisation onboarding: club classification, country, logo, and how the
-- club heard about Nia. Collected on the onboarding page a newly-confirmed
-- user lands on before they see the dashboard.

create type public.organisation_type as enum (
  'academy',
  'youth_club',
  'semi_professional',
  'professional',
  'school_university'
);

alter table public.organisations
  add column organisation_type public.organisation_type not null,
  add column country text not null check (char_length(btrim(country)) > 0),
  add column logo_url text,
  add column referral_source text;

-- create_organisation() now accepts the onboarding fields. Type and country
-- are required for every new organisation going forward; logo and referral
-- source are optional (a club may skip the logo, or decline the marketing
-- question, without being blocked from onboarding).
create or replace function public.create_organisation(
  org_name text,
  org_slug text,
  org_type public.organisation_type,
  org_country text,
  org_logo_url text default null,
  org_referral_source text default null
)
returns public.organisations
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org public.organisations;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.organisations (
    name, slug, organisation_type, country, logo_url, referral_source
  )
  values (
    org_name, org_slug, org_type, org_country, org_logo_url, org_referral_source
  )
  returning * into new_org;

  insert into public.organisation_members (organisation_id, user_id, role)
  values (new_org.id, auth.uid(), 'owner');

  return new_org;
end;
$$;

revoke all on function public.create_organisation(
  text, text, public.organisation_type, text, text, text
) from public;
grant execute on function public.create_organisation(
  text, text, public.organisation_type, text, text, text
) to authenticated;

drop function if exists public.create_organisation(text, text);

-- Club logos: uploaded before the organisation exists (the RPC above needs
-- a URL to insert), so objects are scoped to the uploading user's own
-- folder rather than an organisation_id. Publicly readable since logos are
-- branding, not tenant data.

insert into storage.buckets (id, name, public)
values ('organisation-logos', 'organisation-logos', true)
on conflict (id) do nothing;

create policy "Anyone can view organisation logos"
  on storage.objects for select
  using (bucket_id = 'organisation-logos');

create policy "Users can upload their own organisation logo"
  on storage.objects for insert
  with check (
    bucket_id = 'organisation-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can replace their own organisation logo"
  on storage.objects for update
  using (
    bucket_id = 'organisation-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'organisation-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

