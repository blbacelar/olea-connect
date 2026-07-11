begin;

select plan(12);

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
    'harvest-consulting@example.com',
    '',
    now(),
    '{}'::jsonb,
    '{"full_name":"Harvest Member"}'::jsonb,
    now(),
    now()
  ),
  (
    '91000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'roots-consulting@example.com',
    '',
    now(),
    '{}'::jsonb,
    '{"full_name":"Roots Member"}'::jsonb,
    now(),
    now()
  ),
  (
    '91000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'consulting-staff@example.com',
    '',
    now(),
    '{}'::jsonb,
    '{"full_name":"Consulting Staff"}'::jsonb,
    now(),
    now()
  );

insert into public.organizations (id, name, slug, created_by)
values
  (
    '92000000-0000-0000-0000-000000000001',
    'Harvest Consulting Org',
    'harvest-consulting-org',
    '91000000-0000-0000-0000-000000000001'
  ),
  (
    '92000000-0000-0000-0000-000000000002',
    'Roots Consulting Org',
    'roots-consulting-org',
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
  id,
  organization_id,
  plan_id,
  provider,
  billing_interval,
  status,
  current_period_start,
  current_period_end
)
values
  (
    '93000000-0000-0000-0000-000000000001',
    '92000000-0000-0000-0000-000000000001',
    'harvest',
    'manual',
    'month',
    'active',
    '2026-07-01',
    '2026-07-31'
  ),
  (
    '93000000-0000-0000-0000-000000000002',
    '92000000-0000-0000-0000-000000000002',
    'roots',
    'manual',
    'month',
    'active',
    '2026-07-01',
    '2026-07-31'
  );

insert into public.platform_user_roles (user_id, role)
values (
  '91000000-0000-0000-0000-000000000003',
  'consulting_admin'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"91000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select throws_ok(
  $$
    select public.create_consulting_request(
      'governance_support',
      'Review governance question',
      'Please help us review this governance question.',
      'standard'
    )
  $$,
  'P0001',
  'Only active Harvest organizations can request consulting support.',
  'non-Harvest organizations cannot create consulting requests'
);

reset role;

create temporary table captured_consulting_request (id uuid primary key);
grant select, insert, update, delete on captured_consulting_request to authenticated;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"91000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

insert into captured_consulting_request (id)
select public.create_consulting_request(
  'board_package',
  'Prepare board package',
  'Please review the board package before next meeting.',
  'high'
);

select is(
  (
    select status
    from public.consulting_requests
    where id = (select id from captured_consulting_request)
  ),
  'submitted'::public.consulting_request_status,
  'Harvest members can create submitted consulting requests'
);

select is(
  (
    select count(*)::integer
    from public.consulting_requests
  ),
  1,
  'members see only their organization consulting requests'
);

select throws_ok(
  $$
    select public.update_consulting_request_operations(
      (select id from captured_consulting_request),
      'accepted',
      null,
      null,
      null,
      null,
      'We accepted this request.'
    )
  $$,
  'P0001',
  'Only consulting staff can manage consulting requests.',
  'members cannot assign or triage consulting requests'
);

select throws_ok(
  $$
    select public.record_consulting_time_entry(
      (select id from captured_consulting_request),
      30,
      'Reviewed initial materials.',
      '2026-07-10',
      false
    )
  $$,
  'P0001',
  'Only consulting staff can record consulting time.',
  'members cannot create time entries'
);

reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"91000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select is(
  (
    select count(*)::integer
    from public.consulting_requests
  ),
  0,
  'other tenants cannot read Harvest consulting requests'
);

reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"91000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select lives_ok(
  $$
    select public.update_consulting_request_operations(
      (select id from captured_consulting_request),
      'accepted',
      '91000000-0000-0000-0000-000000000003',
      '2026-07-15 19:00:00+00',
      '2026-07-12 19:00:00+00',
      'Assigned to consulting staff.',
      'We accepted this request.'
    )
  $$,
  'consulting staff can triage and assign requests'
);

select is(
  (
    select assigned_to
    from public.consulting_requests
    where id = (select id from captured_consulting_request)
  ),
  '91000000-0000-0000-0000-000000000003'::uuid,
  'staff assignment is persisted'
);

select lives_ok(
  $$
    select public.record_consulting_time_entry(
      (select id from captured_consulting_request),
      300,
      'Prepared the board package.',
      '2026-07-10',
      false
    )
  $$,
  'staff can record time up to the included Harvest limit'
);

select throws_ok(
  $$
    select public.record_consulting_time_entry(
      (select id from captured_consulting_request),
      1,
      'A minute too far.',
      '2026-07-10',
      false
    )
  $$,
  'P0001',
  'This time entry exceeds the available consulting hours for the current period.',
  'concurrent-safe accounting prevents silent over-consumption'
);

select lives_ok(
  $$
    select public.update_consulting_request_operations(
      (select id from captured_consulting_request),
      'completed',
      '91000000-0000-0000-0000-000000000003',
      null,
      null,
      'Completed request.',
      'Your request is complete.'
    )
  $$,
  'consulting staff can complete requests'
);

select isnt_empty(
  $$
    select 1
    from public.consulting_request_activity
    where request_id = (select id from captured_consulting_request)
      and event_type in ('request.created', 'request.updated', 'time.recorded')
  $$,
  'completed requests retain auditable activity history'
);

select * from finish();
rollback;
