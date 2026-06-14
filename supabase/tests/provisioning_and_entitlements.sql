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
  '40000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'provisioning@example.com',
  '',
  now(),
  '{}'::jsonb,
  '{"full_name":"Provisioned Owner"}'::jsonb,
  now(),
  now()
);

select is(
  (
    select full_name
    from public.profiles
    where id = '40000000-0000-0000-0000-000000000001'
  ),
  'Provisioned Owner',
  'creating an auth user provisions a profile'
);

insert into public.organizations (id, name, slug, created_by)
values (
  '50000000-0000-0000-0000-000000000001',
  'Provisioning Org',
  'provisioning-org',
  '40000000-0000-0000-0000-000000000001'
);

insert into public.organization_members (
  organization_id,
  user_id,
  role,
  status,
  joined_at
)
values (
  '50000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  'owner',
  'active',
  now()
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"40000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select is(
  public.has_current_subscription(),
  false,
  'an organization without an active subscription has no entitlement'
);

reset role;

insert into public.subscriptions (
  id,
  organization_id,
  plan_id,
  provider,
  billing_interval,
  status
)
values (
  '60000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  'roots',
  'manual',
  'month',
  'active'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"40000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select is(
  public.has_current_subscription(),
  true,
  'an active subscription grants platform entitlement'
);

reset role;

update public.subscriptions
set status = 'past_due'
where id = '60000000-0000-0000-0000-000000000001';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"40000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select is(
  public.has_current_subscription(),
  false,
  'a past-due subscription removes platform entitlement'
);

reset role;

insert into public.platform_user_roles (user_id, role)
values (
  '40000000-0000-0000-0000-000000000001',
  'super_admin'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"40000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select is(
  public.has_current_subscription(),
  true,
  'platform administrators retain operational access'
);

select * from finish();
rollback;
