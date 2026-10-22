create or replace function private.grant_application_belongs_to_org(
  target_application_id uuid,
  target_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.grant_applications applications
    where applications.id = target_application_id
      and applications.organization_id = target_organization_id
  );
$$;

revoke execute on function private.grant_application_belongs_to_org(uuid, uuid)
  from public;
grant execute on function private.grant_application_belongs_to_org(uuid, uuid)
  to authenticated;

drop policy if exists "grant_application_attachments_insert_org"
  on public.grant_application_attachments;
create policy "grant_application_attachments_insert_org"
  on public.grant_application_attachments for insert to authenticated
  with check (
    (
      uploaded_by = (select auth.uid())
      and (select private.is_org_member(organization_id))
      and (select private.grant_application_belongs_to_org(
        application_id,
        organization_id
      ))
    )
    or (select private.is_platform_admin(array['super_admin', 'grants_admin']::public.platform_role[]))
  );

drop policy if exists "grant_application_attachments_update_org"
  on public.grant_application_attachments;
create policy "grant_application_attachments_update_org"
  on public.grant_application_attachments for update to authenticated
  using (
    (
      (select private.is_org_member(organization_id))
      and (select private.grant_application_belongs_to_org(
        application_id,
        organization_id
      ))
    )
    or (select private.is_platform_admin(array['super_admin', 'grants_admin']::public.platform_role[]))
  )
  with check (
    (
      uploaded_by = (select auth.uid())
      and (select private.is_org_member(organization_id))
      and (select private.grant_application_belongs_to_org(
        application_id,
        organization_id
      ))
    )
    or (select private.is_platform_admin(array['super_admin', 'grants_admin']::public.platform_role[]))
  );

drop policy if exists "grant_application_attachments_delete_org"
  on public.grant_application_attachments;
create policy "grant_application_attachments_delete_org"
  on public.grant_application_attachments for delete to authenticated
  using (
    (
      (select private.is_org_member(organization_id))
      and (select private.grant_application_belongs_to_org(
        application_id,
        organization_id
      ))
    )
    or (select private.is_platform_admin(array['super_admin', 'grants_admin']::public.platform_role[]))
  );

revoke select on public.events from authenticated;
grant select (
  id,
  type,
  status,
  slug,
  title,
  summary,
  description,
  starts_at,
  ends_at,
  timezone,
  capacity,
  registration_opens_at,
  registration_closes_at,
  meeting_provider,
  provider_event_id,
  land_acknowledgement,
  created_by,
  created_at,
  updated_at
) on public.events to authenticated;

drop policy if exists "event_registrations_update_own"
  on public.event_registrations;
create policy "event_registrations_update_own"
  on public.event_registrations for update to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_platform_admin(
      array['super_admin', 'community_admin']::public.platform_role[]
    ))
  )
  with check (
    (
      user_id = (select auth.uid())
      and (select private.can_access_event(event_id, organization_id))
    )
    or (select private.is_platform_admin(
      array['super_admin', 'community_admin']::public.platform_role[]
    ))
  );
