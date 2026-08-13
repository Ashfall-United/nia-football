-- Pending invites and member-management helpers.
--
-- Invites let owners/admins add coaches, analysts, media, and viewers without
-- touching the database manually. Existing users are added immediately; new
-- users accept via a tokenised link after signing up.

create table public.organisation_invites (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  email text not null check (char_length(btrim(email)) > 0),
  role public.organisation_role not null check (role <> 'owner'),
  token text not null unique default encode(extensions.gen_random_bytes(32), 'hex'),
  invited_by uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index organisation_invites_organisation_id_idx
  on public.organisation_invites (organisation_id);

create unique index organisation_invites_pending_email_idx
  on public.organisation_invites (organisation_id, lower(email))
  where accepted_at is null;

create trigger organisation_invites_set_updated_at
  before update on public.organisation_invites
  for each row execute function public.set_updated_at();

alter table public.organisation_invites enable row level security;

create policy "Owners and admins can manage invites"
  on public.organisation_invites for all
  using (
    public.has_organisation_role(
      organisation_id,
      array['owner', 'admin']::public.organisation_role[]
    )
  )
  with check (
    public.has_organisation_role(
      organisation_id,
      array['owner', 'admin']::public.organisation_role[]
    )
  );

-- Service-role lookup when deciding whether to add a user immediately.
create or replace function public.find_user_id_by_email(user_email text)
returns uuid
language sql
security definer
set search_path = public, auth
stable
as $$
  select id
  from auth.users
  where lower(email) = lower(btrim(user_email))
  limit 1;
$$;

revoke all on function public.find_user_id_by_email(text) from public;
grant execute on function public.find_user_id_by_email(text) to service_role;

-- Public preview for invite landing pages (token is the secret).
create or replace function public.get_organisation_invite_preview(invite_token text)
returns table (
  organisation_name text,
  organisation_slug text,
  role public.organisation_role,
  email text,
  is_expired boolean,
  is_accepted boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    o.name,
    o.slug,
    i.role,
    i.email,
    i.expires_at <= now(),
    i.accepted_at is not null
  from public.organisation_invites i
  join public.organisations o on o.id = i.organisation_id
  where i.token = invite_token;
$$;

revoke all on function public.get_organisation_invite_preview(text) from public;
grant execute on function public.get_organisation_invite_preview(text) to anon, authenticated;

create or replace function public.accept_organisation_invite(invite_token text)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  inv public.organisation_invites%rowtype;
  caller_email text;
  org_slug text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select email into caller_email from auth.users where id = auth.uid();

  select * into inv
  from public.organisation_invites
  where token = invite_token
    and accepted_at is null;

  if not found then
    raise exception 'Invite not found or already used';
  end if;

  if inv.expires_at <= now() then
    raise exception 'Invite expired';
  end if;

  if lower(caller_email) <> lower(inv.email) then
    raise exception 'This invite was sent to a different email address';
  end if;

  insert into public.organisation_members (organisation_id, user_id, role)
  values (inv.organisation_id, auth.uid(), inv.role)
  on conflict (organisation_id, user_id) do update
    set role = excluded.role,
        updated_at = now();

  update public.organisation_invites
  set accepted_at = now()
  where id = inv.id;

  select slug into org_slug
  from public.organisations
  where id = inv.organisation_id;

  return org_slug;
end;
$$;

revoke all on function public.accept_organisation_invite(text) from public;
grant execute on function public.accept_organisation_invite(text) to authenticated;

create or replace function public.list_organisation_members(org_id uuid)
returns table (
  member_id uuid,
  user_id uuid,
  email text,
  role public.organisation_role,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
stable
as $$
begin
  if not public.has_organisation_role(
    org_id,
    array['owner', 'admin']::public.organisation_role[]
  ) then
    raise exception 'Forbidden';
  end if;

  return query
  select
    m.id,
    m.user_id,
    u.email,
    m.role,
    m.created_at
  from public.organisation_members m
  join auth.users u on u.id = m.user_id
  where m.organisation_id = org_id
  order by m.created_at asc;
end;
$$;

revoke all on function public.list_organisation_members(uuid) from public;
grant execute on function public.list_organisation_members(uuid) to authenticated;
