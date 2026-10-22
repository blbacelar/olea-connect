begin;

select plan(5);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '46000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'event-ops@example.com',
  '',
  now(),
  '{}'::jsonb,
  '{"full_name":"Event Ops"}'::jsonb,
  now(),
  now()
);

insert into public.organizations (id, name, slug, created_by)
values (
  '56000000-0000-0000-0000-000000000001',
  'Event Ops Org',
  'event-ops-org',
  '46000000-0000-0000-0000-000000000001'
);

insert into public.organization_members (
  organization_id,
  user_id,
  role,
  status,
  joined_at
)
values (
  '56000000-0000-0000-0000-000000000001',
  '46000000-0000-0000-0000-000000000001',
  'owner',
  'active',
  now()
);

insert into public.subscriptions (
  organization_id,
  plan_id,
  provider,
  billing_interval,
  status
)
values (
  '56000000-0000-0000-0000-000000000001',
  'roots',
  'manual',
  'month',
  'active'
);

insert into public.events (
  id,
  type,
  status,
  slug,
  title,
  summary,
  starts_at,
  ends_at,
  timezone,
  meeting_provider,
  provider_event_id,
  join_url
)
values (
  '66000000-0000-0000-0000-000000000001',
  'webinar',
  'scheduled',
  'event-ops-webinar',
  'Event Ops Webinar',
  'Test webinar.',
  now() + interval '7 days',
  now() + interval '7 days 1 hour',
  'America/Vancouver',
  'zoom',
  'zoom-event-ops',
  'https://zoom.us/j/123456789'
);

insert into public.event_plan_access (event_id, plan_id, included)
values ('66000000-0000-0000-0000-000000000001', 'roots', true);

insert into public.event_registrations (
  id,
  event_id,
  organization_id,
  user_id,
  status,
  provider_registration_id
)
values (
  '76000000-0000-0000-0000-000000000001',
  '66000000-0000-0000-0000-000000000001',
  '56000000-0000-0000-0000-000000000001',
  '46000000-0000-0000-0000-000000000001',
  'registered',
  'zoom-reg-1'
);

select throws_ok(
  $$
    insert into public.event_registrations (
      event_id,
      organization_id,
      user_id,
      status
    )
    values (
      '66000000-0000-0000-0000-000000000001',
      '56000000-0000-0000-0000-000000000001',
      '46000000-0000-0000-0000-000000000001',
      'registered'
    )
  $$,
  '23505',
  'duplicate key value violates unique constraint "event_registrations_event_id_user_id_key"',
  'duplicate event registrations are prevented'
);

update public.event_registrations
set
  status = 'attended',
  attended_at = now(),
  provider_attendance_id = 'zoom-att-1',
  watch_duration_seconds = 1840,
  attendance_imported_at = now()
where id = '76000000-0000-0000-0000-000000000001';

select is(
  (
    select watch_duration_seconds
    from public.event_registrations
    where id = '76000000-0000-0000-0000-000000000001'
  ),
  1840,
  'attendance imports can update watch duration'
);

update public.events
set starts_at = starts_at + interval '1 day',
    ends_at = ends_at + interval '1 day'
where id = '66000000-0000-0000-0000-000000000001';

select is(
  (
    select count(*)::integer
    from public.integration_events
    where event_type = 'event.rescheduled'
      and aggregate_id = '66000000-0000-0000-0000-000000000001'
      and provider = 'email'
  ),
  1,
  'rescheduled events notify registered members through the email outbox'
);

update public.events
set status = 'canceled'
where id = '66000000-0000-0000-0000-000000000001';

select is(
  (
    select count(*)::integer
    from public.integration_events
    where event_type = 'event.canceled'
      and aggregate_id = '66000000-0000-0000-0000-000000000001'
      and provider = 'email'
  ),
  1,
  'canceled events notify registered members through the email outbox'
);

select is(
  (
    select payload ->> 'recipient_email'
    from public.integration_events
    where event_type = 'event.canceled'
      and aggregate_id = '66000000-0000-0000-0000-000000000001'
    limit 1
  ),
  'event-ops@example.com',
  'event notifications target the registered member email'
);

select * from finish();
rollback;
