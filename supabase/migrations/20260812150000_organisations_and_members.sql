-- Organisation and membership model.
--
-- Every organisation is an isolated tenant. Membership rows are the only
-- source of truth for "does this user belong to this organisation, and
-- with what role" — nothing in this app should trust a client-supplied
-- organisation_id without checking against this table.

create extension if not exists "pgcrypto" with schema extensions;

create type public.organisation_role as enum (
  'owner',
  'admin',
  'coach',
  'analyst',
  'media',
  'viewer'
);

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organisation_members (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.organisation_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, user_id)
);

create index organisation_members_organisation_id_idx
  on public.organisation_members (organisation_id);

create index organisation_members_user_id_idx
  on public.organisation_members (user_id);

-- updated_at maintenance

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organisations_set_updated_at
  before update on public.organisations
  for each row execute function public.set_updated_at();

create trigger organisation_members_set_updated_at
  before update on public.organisation_members
  for each row execute function public.set_updated_at();

-- Row Level Security
--
-- organisation_members policies reference organisation_members itself
-- (via these helpers), so the helpers must be SECURITY DEFINER to avoid
-- recursive policy evaluation.

alter table public.organisations enable row level security;
alter table public.organisation_members enable row level security;

create or replace function public.is_organisation_member(org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.organisation_members m
    where m.organisation_id = org_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_organisation_role(
  org_id uuid,
  roles public.organisation_role[]
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.organisation_members m
    where m.organisation_id = org_id
      and m.user_id = auth.uid()
      and m.role = any(roles)
  );
$$;

revoke all on function public.is_organisation_member(uuid) from public;
grant execute on function public.is_organisation_member(uuid) to authenticated;

revoke all on function public.has_organisation_role(uuid, public.organisation_role[]) from public;
grant execute on function public.has_organisation_role(uuid, public.organisation_role[]) to authenticated;

create policy "Members can view their organisations"
  on public.organisations for select
  using (public.is_organisation_member(id));

create policy "Owners and admins can update their organisation"
  on public.organisations for update
  using (public.has_organisation_role(id, array['owner', 'admin']::public.organisation_role[]))
  with check (public.has_organisation_role(id, array['owner', 'admin']::public.organisation_role[]));

create policy "Members can view fellow members"
  on public.organisation_members for select
  using (public.is_organisation_member(organisation_id));

create policy "Owners and admins can manage members"
  on public.organisation_members for all
  using (public.has_organisation_role(organisation_id, array['owner', 'admin']::public.organisation_role[]))
  with check (public.has_organisation_role(organisation_id, array['owner', 'admin']::public.organisation_role[]));

-- No direct INSERT policy exists on organisations: creation only happens
-- through create_organisation() below, which atomically creates the
-- organisation and its owner membership so an organisation can never
-- exist without an owner.

create or replace function public.create_organisation(org_name text, org_slug text)
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

  insert into public.organisations (name, slug)
  values (org_name, org_slug)
  returning * into new_org;

  insert into public.organisation_members (organisation_id, user_id, role)
  values (new_org.id, auth.uid(), 'owner');

  return new_org;
end;
$$;

revoke all on function public.create_organisation(text, text) from public;
grant execute on function public.create_organisation(text, text) to authenticated;
