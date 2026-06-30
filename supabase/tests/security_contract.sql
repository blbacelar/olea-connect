begin;

select plan(10);

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
  ('community_comments', 'tenant'),
  ('community_events', 'tenant'),
  ('community_managers', 'admin'),
  ('community_posts', 'tenant'),
  ('community_reactions', 'self'),
  ('community_space_access_rules', 'catalog'),
  ('community_spaces', 'catalog'),
  ('communities', 'catalog'),
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
  ('webhook_events', 'service'),
  ('workspace_provisioning_requests', 'service');

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

insert into public.resources (
  id,
  type,
  status,
  slug,
  title,
  summary
)
values (
  '40000000-0000-0000-0000-000000000001',
  'template',
  'draft',
  'security-export-template',
  'Security Export Template',
  'Template used to verify generated document isolation.'
);

insert into public.template_definitions (
  resource_id,
  renderer_key,
  field_schema,
  supports_pdf,
  supports_docx
)
values (
  '40000000-0000-0000-0000-000000000001',
  'dynamic_form',
  '{
    "version": 1,
    "sections": [
      {
        "id": "overview",
        "title": "Overview",
        "questions": [
          { "id": "summary", "type": "textarea", "label": "Summary" }
        ]
      }
    ]
  }'::jsonb,
  true,
  true
);

insert into public.template_instances (
  id,
  organization_id,
  resource_id,
  created_by,
  title,
  form_data,
  branding_snapshot
)
values
  (
    '50000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'Tenant A Export',
    '{"summary":"Tenant A"}'::jsonb,
    '{"primaryColor":"#2f6b4f","secondaryColor":"#dbe8dd","logoInitials":"TA"}'::jsonb
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    'Tenant B Export',
    '{"summary":"Tenant B"}'::jsonb,
    '{"primaryColor":"#2f6b4f","secondaryColor":"#dbe8dd","logoInitials":"TB"}'::jsonb
  );

insert into public.template_exports (
  id,
  template_instance_id,
  organization_id,
  resource_id,
  created_by,
  format,
  file_name,
  storage_path,
  definition_version,
  schema_snapshot,
  form_data_snapshot,
  branding_snapshot,
  checksum_sha256
)
values
  (
    '60000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'pdf',
    'Tenant-A_Export_2026-06-19.pdf',
    '30000000-0000-0000-0000-000000000001/50000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000001/Tenant-A_Export_2026-06-19.pdf',
    1,
    '{}'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb,
    repeat('a', 64)
  ),
  (
    '60000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    'pdf',
    'Tenant-B_Export_2026-06-19.pdf',
    '30000000-0000-0000-0000-000000000002/50000000-0000-0000-0000-000000000002/60000000-0000-0000-0000-000000000002/Tenant-B_Export_2026-06-19.pdf',
    1,
    '{}'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb,
    repeat('b', 64)
  );

insert into storage.objects (
  bucket_id,
  name,
  owner,
  metadata
)
values
  (
    'generated-documents',
    '30000000-0000-0000-0000-000000000001/50000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000001/Tenant-A_Export_2026-06-19.pdf',
    '20000000-0000-0000-0000-000000000001',
    '{"mimetype":"application/pdf"}'::jsonb
  ),
  (
    'generated-documents',
    '30000000-0000-0000-0000-000000000002/50000000-0000-0000-0000-000000000002/60000000-0000-0000-0000-000000000002/Tenant-B_Export_2026-06-19.pdf',
    '20000000-0000-0000-0000-000000000002',
    '{"mimetype":"application/pdf"}'::jsonb
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

select results_eq(
  $test$
    select id
    from public.template_exports
    order by id
  $test$,
  $expected$
    values ('60000000-0000-0000-0000-000000000001'::uuid)
  $expected$,
  'a member can only read generated exports for their own tenant'
);

select results_eq(
  $test$
    select name
    from storage.objects
    where bucket_id = 'generated-documents'
    order by name
  $test$,
  $expected$
    values ('30000000-0000-0000-0000-000000000001/50000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000001/Tenant-A_Export_2026-06-19.pdf'::text)
  $expected$,
  'a member can only read generated files for their own tenant'
);

select * from finish();
rollback;
