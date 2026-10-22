begin;

select plan(10);

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
values
  (
    '91000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'strix-a@example.com',
    '',
    now(),
    '{}'::jsonb,
    '{"full_name":"Strix A"}'::jsonb,
    now(),
    now()
  ),
  (
    '91000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'strix-b@example.com',
    '',
    now(),
    '{}'::jsonb,
    '{"full_name":"Strix B"}'::jsonb,
    now(),
    now()
  );

insert into public.organizations (id, name, slug, created_by)
values
  (
    '92000000-0000-0000-0000-000000000001',
    'Strix Tenant A',
    'strix-tenant-a',
    '91000000-0000-0000-0000-000000000001'
  ),
  (
    '92000000-0000-0000-0000-000000000002',
    'Strix Tenant B',
    'strix-tenant-b',
    '91000000-0000-0000-0000-000000000002'
  );

insert into public.organization_members (
  organization_id,
  user_id,
  role,
  status,
  joined_at
)
values
  (
    '92000000-0000-0000-0000-000000000001',
    '91000000-0000-0000-0000-000000000001',
    'owner',
    'active',
    now()
  ),
  (
    '92000000-0000-0000-0000-000000000002',
    '91000000-0000-0000-0000-000000000002',
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
values
  ('92000000-0000-0000-0000-000000000001', 'roots', 'manual', 'month', 'active'),
  ('92000000-0000-0000-0000-000000000002', 'roots', 'manual', 'month', 'active');

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
  join_url,
  recording_url
)
values
  (
    '93000000-0000-0000-0000-000000000001',
    'webinar',
    'completed',
    'strix-webinar-a',
    'Strix Webinar A',
    'Tenant A webinar.',
    now() - interval '2 days',
    now() - interval '2 days' + interval '1 hour',
    'America/Vancouver',
    'https://zoom.us/j/strix-a',
    'https://recordings.example.com/strix-a'
  ),
  (
    '93000000-0000-0000-0000-000000000002',
    'webinar',
    'completed',
    'strix-webinar-b',
    'Strix Webinar B',
    'Tenant B webinar.',
    now() - interval '2 days',
    now() - interval '2 days' + interval '1 hour',
    'America/Vancouver',
    'https://zoom.us/j/strix-b',
    'https://recordings.example.com/strix-b'
  );

insert into public.event_plan_access (event_id, plan_id, included)
values
  ('93000000-0000-0000-0000-000000000001', 'roots', true),
  ('93000000-0000-0000-0000-000000000002', 'roots', false);

update public.event_plan_access
set ticket_price_cents = 2500
where event_id = '93000000-0000-0000-0000-000000000002';

insert into public.event_registrations (
  id,
  event_id,
  organization_id,
  user_id,
  status
)
values (
  '94000000-0000-0000-0000-000000000001',
  '93000000-0000-0000-0000-000000000001',
  '92000000-0000-0000-0000-000000000001',
  '91000000-0000-0000-0000-000000000001',
  'registered'
);

insert into public.grant_programs (
  id,
  type,
  name,
  slug,
  description,
  default_award_cents
)
values (
  '95000000-0000-0000-0000-000000000001',
  'quarterly',
  'Strix Grant Program',
  'strix-grant-program',
  'Security policy regression grant program.',
  50000
);

insert into public.grant_rounds (
  id,
  program_id,
  name,
  status,
  opens_at,
  closes_at,
  award_amount_cents,
  available_awards,
  budget_cents
)
values (
  '95000000-0000-0000-0000-000000000002',
  '95000000-0000-0000-0000-000000000001',
  'Strix Grant Round',
  'open',
  now() - interval '1 day',
  now() + interval '30 days',
  50000,
  2,
  100000
);

insert into public.grant_applications (
  id,
  round_id,
  organization_id,
  applicant_user_id,
  status,
  focus_area,
  funding_request,
  expected_outcome,
  requested_amount_cents,
  cra_good_standing,
  registered_in_canada,
  submitted_at
)
values (
  '95000000-0000-0000-0000-000000000003',
  '95000000-0000-0000-0000-000000000002',
  '92000000-0000-0000-0000-000000000001',
  '91000000-0000-0000-0000-000000000001',
  'draft',
  'operational_capacity',
  'Draft request',
  'Draft outcome',
  50000,
  true,
  true,
  null
);

insert into public.grant_application_attachments (
  id,
  application_id,
  organization_id,
  uploaded_by,
  file_name,
  file_path,
  content_type,
  size_bytes
)
values (
  '96000000-0000-0000-0000-000000000001',
  '95000000-0000-0000-0000-000000000003',
  '92000000-0000-0000-0000-000000000002',
  '91000000-0000-0000-0000-000000000002',
  'legacy-mismatch.pdf',
  '92000000-0000-0000-0000-000000000002/95000000-0000-0000-0000-000000000003/legacy-mismatch.pdf',
  'application/pdf',
  128
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"91000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select is(
  (
    select title
    from public.events
    where id = '93000000-0000-0000-0000-000000000001'
  ),
  'Strix Webinar A',
  'members can still read safe event catalog columns'
);

select is(
  (
    select has_recording
    from public.events
    where id = '93000000-0000-0000-0000-000000000001'
  ),
  true,
  'members can read recording availability without receiving the recording URL'
);

select throws_ok(
  $$ select recording_url from public.events limit 1 $$,
  '42501',
  null,
  'members cannot read event recording URLs directly from the catalog table'
);

select lives_ok(
  $$
    insert into public.grant_application_attachments (
      application_id,
      organization_id,
      uploaded_by,
      file_name,
      file_path,
      content_type,
      size_bytes
    )
    values (
      '95000000-0000-0000-0000-000000000003',
      '92000000-0000-0000-0000-000000000001',
      '91000000-0000-0000-0000-000000000001',
      'supporting.pdf',
      '92000000-0000-0000-0000-000000000001/95000000-0000-0000-0000-000000000003/supporting.pdf',
      'application/pdf',
      128
    )
  $$,
  'members can attach files when the application and organization match'
);

select throws_ok(
  $$
    insert into public.grant_application_attachments (
      application_id,
      organization_id,
      uploaded_by,
      file_name,
      file_path,
      content_type,
      size_bytes
    )
    values (
      '95000000-0000-0000-0000-000000000003',
      '92000000-0000-0000-0000-000000000002',
      '91000000-0000-0000-0000-000000000001',
      'cross-tenant.pdf',
      '92000000-0000-0000-0000-000000000002/95000000-0000-0000-0000-000000000003/cross-tenant.pdf',
      'application/pdf',
      128
    )
  $$,
  '42501',
  null,
  'members cannot attach files to an application through a different organization'
);

select is(
  (
    select count(*)::integer
    from public.grant_application_attachments
    where id = '96000000-0000-0000-0000-000000000001'
  ),
  0,
  'legacy attachment rows with mismatched application scope are hidden'
);

select throws_ok(
  $$
    update public.grant_application_attachments
    set uploaded_by = '91000000-0000-0000-0000-000000000002'
    where file_name = 'supporting.pdf'
  $$,
  '42501',
  null,
  'members cannot take ownership of another attachment record'
);

select throws_ok(
  $$
    update public.event_registrations
    set
      event_id = '93000000-0000-0000-0000-000000000002',
      organization_id = '92000000-0000-0000-0000-000000000002'
    where id = '94000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  null,
  'members cannot repoint their registration to another tenant event'
);

select throws_ok(
  $$
    update public.event_registrations
    set status = 'attended'
    where id = '94000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  null,
  'members cannot mark their own registration as attended'
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
      '93000000-0000-0000-0000-000000000002',
      '92000000-0000-0000-0000-000000000001',
      '91000000-0000-0000-0000-000000000001',
      'registered'
    )
  $$,
  '42501',
  null,
  'members cannot directly register for an event that requires paid checkout'
);

select * from finish();
rollback;
