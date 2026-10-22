begin;

select plan(7);

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
  '81000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'seedling-selection@example.com',
  '',
  now(),
  '{}'::jsonb,
  '{"full_name":"Seedling Selection Owner"}'::jsonb,
  now(),
  now()
);

insert into public.organizations (id, name, slug, created_by)
values (
  '82000000-0000-0000-0000-000000000001',
  'Seedling Selection Org',
  'seedling-selection-org',
  '81000000-0000-0000-0000-000000000001'
);

insert into public.organization_members (
  organization_id,
  user_id,
  role,
  status,
  joined_at
)
values (
  '82000000-0000-0000-0000-000000000001',
  '81000000-0000-0000-0000-000000000001',
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
  status
)
values (
  '83000000-0000-0000-0000-000000000001',
  '82000000-0000-0000-0000-000000000001',
  'seedling',
  'manual',
  'month',
  'active'
);

insert into public.resources (
  id,
  type,
  status,
  slug,
  title,
  summary
)
values (
  '84000000-0000-0000-0000-000000000001',
  'template',
  'draft',
  'draft-template-selection',
  'Draft Template Selection',
  'Draft template used to verify selection hardening.'
);

insert into storage.objects (bucket_id, name, owner, metadata)
values
  (
    'resource-assets',
    '10000000-0000-4000-8000-000000000001/board-self-evaluation.pdf',
    '81000000-0000-0000-0000-000000000001',
    '{"mimetype":"application/pdf"}'::jsonb
  ),
  (
    'resource-assets',
    '10000000-0000-4000-8000-000000000007/board-calendar-operational-workflow.pdf',
    '81000000-0000-0000-0000-000000000001',
    '{"mimetype":"application/pdf"}'::jsonb
  ),
  (
    'resource-assets',
    '10000000-0000-4000-8000-000000000006/archived-governance-policy-manual.pdf',
    '81000000-0000-0000-0000-000000000001',
    '{"mimetype":"application/pdf"}'::jsonb
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"81000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select throws_ok(
  $test$
    insert into public.organization_resource_access (
      organization_id,
      resource_id,
      access_kind,
      granted_by
    )
    values (
      '82000000-0000-0000-0000-000000000001',
      '84000000-0000-0000-0000-000000000001',
      'selection',
      '81000000-0000-0000-0000-000000000001'
    )
  $test$,
  'P0001',
  'Only published templates can be selected',
  'direct selection rows are limited to published template resources'
);

select lives_ok(
  $test$
    insert into public.organization_resource_access (
      organization_id,
      resource_id,
      access_kind,
      granted_by
    )
    values
      (
        '82000000-0000-0000-0000-000000000001',
        '10000000-0000-4000-8000-000000000001',
        'selection',
        '81000000-0000-0000-0000-000000000001'
      ),
      (
        '82000000-0000-0000-0000-000000000001',
        '10000000-0000-4000-8000-000000000007',
        'selection',
        '81000000-0000-0000-0000-000000000001'
      )
  $test$,
  'Seedling owners can persist the available real template selections'
);

select is(
  (
    select count(*)::integer
    from public.organization_resource_access
    where organization_id = '82000000-0000-0000-0000-000000000001'
      and access_kind = 'selection'
  ),
  2,
  'two Seedling selections are stored as organization resource access records'
);

select is(
  (
    select bool_and(locked_until = starts_at + interval '12 months')
    from public.organization_resource_access
    where organization_id = '82000000-0000-0000-0000-000000000001'
      and access_kind = 'selection'
  ),
  true,
  'selected templates are locked for 12 months in the database'
);

select throws_ok(
  $test$
    delete from public.organization_resource_access
    where organization_id = '82000000-0000-0000-0000-000000000001'
      and access_kind = 'selection'
      and resource_id = '10000000-0000-4000-8000-000000000001'
  $test$,
  'P0001',
  null,
  'locked selections cannot be changed before the lock date'
);

select results_eq(
  $test$
    select name
    from storage.objects
    where bucket_id = 'resource-assets'
    order by name
  $test$,
  $expected$
    values
      ('10000000-0000-4000-8000-000000000001/board-self-evaluation.pdf'::text),
      ('10000000-0000-4000-8000-000000000007/board-calendar-operational-workflow.pdf'::text)
  $expected$,
  'direct API access to archived template assets is denied'
);

reset role;

update public.subscriptions
set plan_id = 'roots'
where id = '83000000-0000-0000-0000-000000000001';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"81000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select results_eq(
  $test$
    select name
    from storage.objects
    where bucket_id = 'resource-assets'
    order by name
  $test$,
  $expected$
    values
      ('10000000-0000-4000-8000-000000000001/board-self-evaluation.pdf'::text),
      ('10000000-0000-4000-8000-000000000007/board-calendar-operational-workflow.pdf'::text)
  $expected$,
  'upgrading preserves access to the real template assets'
);

select * from finish();
rollback;
