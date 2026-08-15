-- Analysts tag clips and need to share them externally; extend share-link
-- RLS to match SHARE_MANAGEMENT_ROLES in the app.

drop policy if exists "Owners, admins and coaches can manage share links"
  on public.shared_links;

create policy "Owners, admins, coaches and analysts can manage share links"
  on public.shared_links for all
  using (
    public.has_organisation_role(
      organisation_id,
      array['owner', 'admin', 'coach', 'analyst']::public.organisation_role[]
    )
  )
  with check (
    public.has_organisation_role(
      organisation_id,
      array['owner', 'admin', 'coach', 'analyst']::public.organisation_role[]
    )
  );
