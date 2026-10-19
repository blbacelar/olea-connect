-- Olea grant application writes were retired in September, but private grant
-- history and attachment policies still accepted membership alone. Apply the
-- funded-year limit to those private rows and objects without changing the
-- historical access policy for organizations that were never sponsor funded.
create function private.funded_org_grant_access_current(target_organization_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select (
    not exists (
      select 1 from public.sponsored_memberships as placement
      where placement.organization_id = target_organization_id
    )
    and not exists (
      select 1 from public.subscriptions as subscription
      where subscription.organization_id = target_organization_id
        and subscription.provider = 'manual'
        and subscription.metadata->>'funding_source' = 'sponsorship'
    )
  )
  or exists (
    select 1 from public.subscriptions as subscription
    where subscription.organization_id = target_organization_id
      and private.subscription_grants_access(subscription.id)
  );
$$;

revoke all on function private.funded_org_grant_access_current(uuid)
  from public, anon, authenticated;
grant execute on function private.funded_org_grant_access_current(uuid)
  to authenticated, service_role;

-- Restrictive policies combine with the original member/administrator rules;
-- they do not grant access to a user who lacked it before this migration.
create policy grant_applications_funded_term
  on public.grant_applications as restrictive for select to authenticated
  using (
    (select private.is_platform_admin(null))
    or private.funded_org_grant_access_current(organization_id)
  );

create policy grant_application_attachments_funded_term
  on public.grant_application_attachments as restrictive for all to authenticated
  using (
    (select private.is_platform_admin(null))
    or private.funded_org_grant_access_current(organization_id)
  )
  with check (
    (select private.is_platform_admin(null))
    or private.funded_org_grant_access_current(organization_id)
  );

create policy grant_organization_settings_funded_term
  on public.grant_organization_settings as restrictive for all to authenticated
  using (
    (select private.is_platform_admin(null))
    or private.funded_org_grant_access_current(organization_id)
  )
  with check (
    (select private.is_platform_admin(null))
    or private.funded_org_grant_access_current(organization_id)
  );

create policy grant_partners_funded_term
  on public.grant_partners as restrictive for all to authenticated
  using (
    (select private.is_platform_admin(null))
    or private.funded_org_grant_access_current(organization_id)
  )
  with check (
    (select private.is_platform_admin(null))
    or private.funded_org_grant_access_current(organization_id)
  );

create policy grant_funder_interactions_funded_term
  on public.grant_funder_interactions as restrictive for all to authenticated
  using (
    (select private.is_platform_admin(null))
    or private.funded_org_grant_access_current(organization_id)
  )
  with check (
    (select private.is_platform_admin(null))
    or private.funded_org_grant_access_current(organization_id)
  );

-- Publicly announced awards remain public; private award history follows the
-- funded organization term while existing administrator access is preserved.
create policy grant_awards_funded_term
  on public.grant_awards as restrictive for select to authenticated
  using (
    public_announced_at is not null
    or (select private.is_platform_admin(null))
    or exists (
      select 1 from public.grant_applications as application
      where application.id = grant_awards.application_id
        and private.funded_org_grant_access_current(application.organization_id)
    )
  );

create policy grant_attachment_objects_funded_term
  on storage.objects as restrictive for all to authenticated
  using (
    bucket_id <> 'grant-attachments'
    or (select private.is_platform_admin(null))
    or private.funded_org_grant_access_current(private.first_path_uuid(name))
  )
  with check (
    bucket_id <> 'grant-attachments'
    or (select private.is_platform_admin(null))
    or private.funded_org_grant_access_current(private.first_path_uuid(name))
  );
