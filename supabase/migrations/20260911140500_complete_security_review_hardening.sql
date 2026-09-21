alter table public.events
  add column if not exists has_recording boolean
  generated always as (
    recording_storage_path is not null or recording_url is not null
  ) stored;

revoke select on public.events from public, anon, authenticated;
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
  has_recording,
  land_acknowledgement,
  created_by,
  created_at,
  updated_at
) on public.events to authenticated;

drop policy if exists "grant_application_attachments_select_org"
  on public.grant_application_attachments;
create policy "grant_application_attachments_select_org"
  on public.grant_application_attachments for select to authenticated
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

alter table public.grant_application_attachments
  add constraint grant_application_attachments_path_scope
  check (
    file_path like organization_id::text || '/' || application_id::text || '/%'
  ) not valid;

create or replace function private.protect_grant_attachment_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
    or private.is_platform_admin(array['super_admin', 'grants_admin']::public.platform_role[])
  then
    return new;
  end if;

  if new.application_id is distinct from old.application_id
    or new.organization_id is distinct from old.organization_id
    or new.uploaded_by is distinct from old.uploaded_by
    or new.file_path is distinct from old.file_path
  then
    raise exception 'Grant attachment ownership and storage scope cannot be changed.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.protect_grant_attachment_scope() from public;

drop trigger if exists grant_application_attachments_protect_scope
  on public.grant_application_attachments;
create trigger grant_application_attachments_protect_scope
  before update on public.grant_application_attachments
  for each row execute function private.protect_grant_attachment_scope();

create or replace function private.can_register_for_event(
  target_event_id uuid,
  target_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_platform_admin(null)
    or (
      private.is_org_member(target_organization_id)
      and exists (
        select 1
        from public.subscriptions subscriptions
        join public.event_plan_access event_access
          on event_access.plan_id = subscriptions.plan_id
        where subscriptions.organization_id = target_organization_id
          and subscriptions.status in ('trialing', 'active')
          and event_access.event_id = target_event_id
          and event_access.included
      )
    );
$$;

revoke all on function private.can_register_for_event(uuid, uuid) from public;
grant execute on function private.can_register_for_event(uuid, uuid)
  to authenticated;

drop policy if exists "event_registrations_insert"
  on public.event_registrations;
create policy "event_registrations_insert"
  on public.event_registrations for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status in ('registered', 'waitlisted')
    and (select private.can_register_for_event(event_id, organization_id))
  );

create or replace function private.protect_member_event_registration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
    or private.is_platform_admin(array['super_admin', 'community_admin']::public.platform_role[])
  then
    return new;
  end if;

  if old.user_id is distinct from auth.uid()
    or new.user_id is distinct from old.user_id
    or new.event_id is distinct from old.event_id
    or new.organization_id is distinct from old.organization_id
  then
    raise exception 'Event registration ownership cannot be changed.'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status and new.status <> 'canceled' then
    raise exception 'Members can only cancel their own event registration.'
      using errcode = '42501';
  end if;

  if new.attended_at is distinct from old.attended_at
    or new.watch_duration_seconds is distinct from old.watch_duration_seconds
    or new.provider_attendance_id is distinct from old.provider_attendance_id
  then
    raise exception 'Attendance can only be updated by an event administrator.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.protect_member_event_registration() from public;

drop trigger if exists event_registrations_protect_member_update
  on public.event_registrations;
create trigger event_registrations_protect_member_update
  before update on public.event_registrations
  for each row execute function private.protect_member_event_registration();
