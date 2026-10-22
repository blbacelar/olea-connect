alter type public.event_status add value if not exists 'rescheduled';

alter table public.event_registrations
  add column if not exists provider_attendance_id text,
  add column if not exists attendance_imported_at timestamptz,
  add column if not exists last_provider_sync_at timestamptz,
  add column if not exists registration_source text not null default 'olea';

create index if not exists event_registrations_provider_registration_idx
  on public.event_registrations(provider_registration_id)
  where provider_registration_id is not null;

create index if not exists event_registrations_provider_attendance_idx
  on public.event_registrations(provider_attendance_id)
  where provider_attendance_id is not null;

create or replace function private.enqueue_event_schedule_change_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  notification_type text;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if old.status is distinct from new.status and new.status::text = 'canceled' then
    notification_type := 'event.canceled';
  elsif (
    old.starts_at is distinct from new.starts_at
    or old.ends_at is distinct from new.ends_at
    or old.timezone is distinct from new.timezone
    or old.status is distinct from new.status and new.status::text = 'rescheduled'
  ) and new.status::text in ('scheduled', 'live', 'rescheduled') then
    notification_type := 'event.rescheduled';
  else
    return new;
  end if;

  insert into public.integration_events (
    event_type,
    aggregate_type,
    aggregate_id,
    provider,
    payload,
    idempotency_key
  )
  select
    notification_type,
    'event',
    new.id::text,
    'email',
    jsonb_build_object(
      'event_id', new.id,
      'event_title', new.title,
      'event_slug', new.slug,
      'event_status', new.status,
      'starts_at', new.starts_at,
      'ends_at', new.ends_at,
      'timezone', new.timezone,
      'recipient_email', users.email,
      'recipient_user_id', registrations.user_id,
      'organization_id', registrations.organization_id
    ),
    notification_type || ':' || new.id::text || ':' || registrations.user_id::text || ':' || gen_random_uuid()::text
  from public.event_registrations registrations
  join auth.users users on users.id = registrations.user_id
  where registrations.event_id = new.id
    and registrations.status in ('registered', 'waitlisted', 'attended')
    and users.email is not null;

  return new;
end;
$$;

revoke all on function private.enqueue_event_schedule_change_notifications() from public;
revoke all on function private.enqueue_event_schedule_change_notifications() from anon;
revoke all on function private.enqueue_event_schedule_change_notifications() from authenticated;

drop trigger if exists events_enqueue_schedule_change_notifications on public.events;
create trigger events_enqueue_schedule_change_notifications
  after update of status, starts_at, ends_at, timezone on public.events
  for each row execute function private.enqueue_event_schedule_change_notifications();
