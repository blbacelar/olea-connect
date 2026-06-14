begin;

select plan(8);

create temporary table expected_public_access (
  table_name text primary key,
  access_model text not null check (
    access_model in ('tenant', 'self', 'catalog', 'admin', 'service')
  )
);

insert into expected_public_access (table_name, access_model)
values
  ('audit_logs', 'admin'),
  ('community_memberships', 'tenant'),
  ('consulting_engagements', 'tenant'),
  ('consulting_requests', 'tenant'),
  ('consulting_time_entries', 'tenant'),
  ('event_plan_access', 'catalog'),
  ('event_registrations', 'tenant'),
  ('event_sponsors', 'catalog'),
  ('events', 'catalog'),
  ('grant_application_reviews', 'admin'),
  ('grant_applications', 'tenant'),
  ('grant_awards', 'tenant'),
  ('grant_program_contributions', 'service'),
  ('grant_programs', 'catalog'),
  ('grant_rounds', 'catalog'),
  ('integration_events', 'service'),
  ('membership_plans', 'catalog'),
  ('notifications', 'self'),
  ('organization_brand_profiles', 'tenant'),
  ('organization_integrations', 'tenant'),
  ('organization_invitations', 'tenant'),
  ('organization_members', 'tenant'),
  ('organization_resource_access', 'tenant'),
  ('organizations', 'tenant'),
  ('platform_user_roles', 'admin'),
  ('privacy_consents', 'self'),
  ('profiles', 'self'),
  ('resource_categories', 'catalog'),
  ('resource_plan_access', 'catalog'),
  ('resource_versions', 'catalog'),
  ('resources', 'catalog'),
  ('sponsor_contacts', 'service'),
  ('sponsor_contributions', 'service'),
  ('sponsors', 'catalog'),
  ('sponsorship_packages', 'catalog'),
  ('sponsorships', 'service'),
  ('subscription_items', 'tenant'),
  ('subscriptions', 'tenant'),
  ('survey_answers', 'tenant'),
  ('survey_respondents', 'tenant'),
  ('surveys', 'tenant'),
  ('template_definitions', 'catalog'),
  ('template_export_downloads', 'tenant'),
  ('template_exports', 'tenant'),
  ('template_field_types', 'catalog'),
  ('template_instances', 'tenant'),
  ('user_integrations', 'self'),
  ('webhook_events', 'service');

select is_empty(
  $test$
    select tablename
    from pg_tables
    where schemaname = 'public'
    except
    select table_name from expected_public_access
  $test$,
  'every public table has an explicit positive and negative access classification'
);

select is_empty(
  $test$
    select table_name from expected_public_access
    except
    select tablename
    from pg_tables
    where schemaname = 'public'
  $test$,
  'the access contract contains no removed public tables'
);

select is_empty(
  $test$
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and not c.relrowsecurity
  $test$,
  'RLS is enabled on every public table'
);

select is_empty(
  $test$
    select access.table_name
    from expected_public_access access
    where access.access_model <> 'service'
      and not exists (
        select 1
        from pg_policies policies
        where policies.schemaname = 'public'
          and policies.tablename = access.table_name
      )
  $test$,
  'every non-service table has at least one positive RLS policy'
);

select is_empty(
  $test$
    select access.table_name
    from expected_public_access access
    where access.access_model = 'service'
      and (
        has_table_privilege('anon', format('public.%I', access.table_name), 'SELECT')
        or has_table_privilege('authenticated', format('public.%I', access.table_name), 'SELECT')
      )
  $test$,
  'service-owned tables deny browser roles'
);

select is_empty(
  $test$
    select access.table_name
    from expected_public_access access
    where access.table_name <> 'membership_plans'
      and has_table_privilege('anon', format('public.%I', access.table_name), 'SELECT')
  $test$,
  'anonymous users cannot read public tables except the plan catalog'
);

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
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'tenant-a@example.com',
    '',
    now(),
    '{}'::jsonb,
    '{"full_name":"Tenant A"}'::jsonb,
    now(),
    now()
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'tenant-b@example.com',
    '',
    now(),
    '{}'::jsonb,
    '{"full_name":"Tenant B"}'::jsonb,
    now(),
    now()
  );

insert into public.organizations (id, name, slug, created_by)
values
  (
    '30000000-0000-0000-0000-000000000001',
    'Tenant A',
    'tenant-a',
    '20000000-0000-0000-0000-000000000001'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    'Tenant B',
    'tenant-b',
    '20000000-0000-0000-0000-000000000002'
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
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'owner',
    'active',
    now()
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    'owner',
    'active',
    now()
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select results_eq(
  $test$
    select id
    from public.organizations
    order by id
  $test$,
  $expected$
    values ('30000000-0000-0000-0000-000000000001'::uuid)
  $expected$,
  'a member can read their own tenant'
);

select is(
  (
    select count(*)::integer
    from public.organizations
    where id = '30000000-0000-0000-0000-000000000002'
  ),
  0,
  'a member cannot read another tenant'
);

select * from finish();
rollback;
