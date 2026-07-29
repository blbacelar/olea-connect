begin;

select plan(16);

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
    '41000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'workspace-success@example.com',
    '',
    now(),
    '{}'::jsonb,
    '{"organization_name":"Untrusted Metadata Org"}'::jsonb,
    now(),
    now()
  ),
  (
    '41000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'workspace-unverified@example.com',
    '',
    null,
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '41000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'workspace-recovery@example.com',
    '',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.workspace_provisioning_requests (
  id,
  user_id,
  email,
  full_name,
  organization_name,
  province_or_region,
  plan_id,
  billing_interval,
  provider_customer_id,
  provider_subscription_id,
  provider_status,
  payment_confirmed_at
)
values (
  '71000000-0000-0000-0000-000000000001',
  '41000000-0000-0000-0000-000000000001',
  'workspace-success@example.com',
  'Workspace Owner',
  'Trusted Request Org',
  'AB',
  'roots',
  'month',
  'cus_success',
  'sub_success',
  'active',
  now()
);

select is(
  public.attempt_workspace_provisioning(
    '71000000-0000-0000-0000-000000000001'
  )->>'status',
  'completed',
  'a verified paid request provisions successfully'
);

select is(
  (
    select count(*)::integer
    from public.organizations
    where created_by = '41000000-0000-0000-0000-000000000001'
  ),
  1,
  'success creates exactly one organization'
);

select is(
  (
    select name
    from public.organizations
    where created_by = '41000000-0000-0000-0000-000000000001'
  ),
  'Trusted Request Org',
  'trusted activation data is used instead of auth user metadata'
);

select is(
  (
    select count(*)::integer
    from public.organization_members
    where user_id = '41000000-0000-0000-0000-000000000001'
      and role = 'owner'
  ),
  1,
  'success creates exactly one owner membership'
);

select is(
  (
    select count(*)::integer
    from public.organization_brand_profiles brands
    join public.organizations organizations
      on organizations.id = brands.organization_id
    where organizations.created_by =
      '41000000-0000-0000-0000-000000000001'
  ),
  1,
  'success creates the default brand profile'
);

select is(
  (
    select count(*)::integer
    from public.subscriptions subscriptions
    join public.organizations organizations
      on organizations.id = subscriptions.organization_id
    where organizations.created_by =
      '41000000-0000-0000-0000-000000000001'
      and subscriptions.provider_subscription_id = 'sub_success'
  ),
  1,
  'success creates the paid subscription'
);

select is(
  public.attempt_workspace_provisioning(
    '71000000-0000-0000-0000-000000000001'
  )->>'status',
  'completed',
  'retrying a completed request is idempotent'
);

select is(
  (
    select count(*)::integer
    from public.organizations
    where created_by = '41000000-0000-0000-0000-000000000001'
  ),
  1,
  'retry does not duplicate the organization'
);

insert into public.workspace_provisioning_requests (
  id,
  user_id,
  email,
  full_name,
  organization_name,
  plan_id,
  billing_interval,
  provider_subscription_id,
  provider_status,
  payment_confirmed_at
)
values (
  '71000000-0000-0000-0000-000000000002',
  '41000000-0000-0000-0000-000000000002',
  'workspace-unverified@example.com',
  'Unverified Owner',
  'Verification Later Org',
  'seedling',
  'year',
  'sub_verification_later',
  'active',
  now()
);

select is(
  public.attempt_workspace_provisioning(
    '71000000-0000-0000-0000-000000000002'
  )->>'status',
  'pending_verification',
  'payment before verification remains pending'
);

select is(
  (
    select count(*)::integer
    from public.organizations
    where created_by = '41000000-0000-0000-0000-000000000002'
  ),
  0,
  'an unverified request creates no tenant data'
);

update auth.users
set email_confirmed_at = now()
where id = '41000000-0000-0000-0000-000000000002';

select is(
  public.attempt_workspace_provisioning(
    '71000000-0000-0000-0000-000000000002'
  )->>'status',
  'completed',
  'verification safely resumes a paid request'
);

insert into public.organizations (id, name, slug)
values (
  '51000000-0000-0000-0000-000000000099',
  'Existing Billing Org',
  'existing-billing-org'
);

insert into public.subscriptions (
  organization_id,
  plan_id,
  provider,
  provider_subscription_id,
  billing_interval,
  status
)
values (
  '51000000-0000-0000-0000-000000000099',
  'roots',
  'stripe',
  'sub_conflict',
  'month',
  'active'
);

insert into public.workspace_provisioning_requests (
  id,
  user_id,
  email,
  full_name,
  organization_name,
  plan_id,
  billing_interval,
  provider_subscription_id,
  provider_status,
  payment_confirmed_at
)
values (
  '71000000-0000-0000-0000-000000000003',
  '41000000-0000-0000-0000-000000000003',
  'workspace-recovery@example.com',
  'Recovery Owner',
  'Recovery Org',
  'canopy',
  'month',
  'sub_conflict',
  'active',
  now()
);

select is(
  public.attempt_workspace_provisioning(
    '71000000-0000-0000-0000-000000000003'
  )->>'status',
  'failed',
  'a conflicting provider subscription records a failed attempt'
);

select isnt(
  (
    select last_error
    from public.workspace_provisioning_requests
    where id = '71000000-0000-0000-0000-000000000003'
  ),
  null,
  'failed provisioning retains an actionable error'
);

select is(
  (
    select count(*)::integer
    from public.organizations
    where created_by = '41000000-0000-0000-0000-000000000003'
  ),
  0,
  'failed provisioning rolls back partial tenant data'
);

update public.workspace_provisioning_requests
set provider_subscription_id = 'sub_recovered'
where id = '71000000-0000-0000-0000-000000000003';

select is(
  public.attempt_workspace_provisioning(
    '71000000-0000-0000-0000-000000000003'
  )->>'status',
  'completed',
  'a corrected failed request can be recovered'
);

select is(
  (
    select attempts
    from public.workspace_provisioning_requests
    where id = '71000000-0000-0000-0000-000000000003'
  ),
  2,
  'recovery records both provisioning attempts'
);

select * from finish();
rollback;
