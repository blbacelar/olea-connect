begin;

select plan(12);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('91000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ed-review-chair@example.com', '', now(), '{}'::jsonb, '{"full_name":"Review Chair"}'::jsonb, now(), now()),
  ('91000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ed-review-member@example.com', '', now(), '{}'::jsonb, '{"full_name":"Regular Member"}'::jsonb, now(), now());

insert into public.organizations (id, name, slug, created_by)
values ('92000000-0000-0000-0000-000000000001', 'ED Review Test Org', 'ed-review-test-org', '91000000-0000-0000-0000-000000000001');

insert into public.organization_members (organization_id, user_id, role, status, joined_at)
values
  ('92000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', 'owner', 'active', now()),
  ('92000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000002', 'member', 'active', now());

insert into public.ed_review_cycles (id, organization_id, status, created_by)
values ('93000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001', 'open', '91000000-0000-0000-0000-000000000001');

insert into public.ed_review_reviewer_assignments (cycle_id, user_id, role, granted_by)
values ('93000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', 'board_chair', '91000000-0000-0000-0000-000000000001');

insert into public.ed_review_campaigns (id, cycle_id, kind, title, token_hash, status, opens_at, created_by)
values ('94000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000001', 'staff', 'Staff feedback', repeat('a', 64), 'open', now() - interval '1 minute', '91000000-0000-0000-0000-000000000001');

select has_table('public', 'ed_review_responses', 'anonymous survey responses have a dedicated table');
select hasnt_column('public', 'ed_review_responses', 'user_id', 'responses do not retain an authenticated user identity');
select hasnt_column('public', 'ed_review_responses', 'recipient_email', 'responses do not retain a delivery email');
select hasnt_column('public', 'ed_review_responses', 'ip_address', 'responses do not retain IP addresses');
select hasnt_column('public', 'ed_review_responses', 'user_agent', 'responses do not retain browser data');

set local role anon;
select lives_ok(
  $$
    select public.submit_ed_review_response(
      repeat('a', 64),
      repeat('b', 64),
      '{"ratings":{"S1a":5},"comments":{"S1":"Clear leadership"},"overall":{"greatest_strength":"Clarity","important_change":"","additional_comments":""}}'::jsonb
    )
  $$,
  'an anonymous respondent can submit a valid open shared-link response'
);
reset role;

select is(
  (select count(*)::integer from public.ed_review_responses where campaign_id = '94000000-0000-0000-0000-000000000001'),
  1,
  'an anonymous submission persists exactly one deidentified response'
);

set local role anon;
select lives_ok(
  $$
    select public.submit_ed_review_response(
      repeat('a', 64),
      repeat('b', 64),
      '{"ratings":{"S1a":5},"comments":{"S1":"Clear leadership"},"overall":{"greatest_strength":"Clarity","important_change":"","additional_comments":""}}'::jsonb
    )
  $$,
  'repeating the same anonymous browser submission is idempotent'
);
reset role;

select is(
  (select count(*)::integer from public.ed_review_responses where campaign_id = '94000000-0000-0000-0000-000000000001'),
  1,
  'an idempotent retry does not create a second anonymous response'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"91000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is_empty(
  $$ select id from public.ed_review_cycles $$,
  'a normal workspace member cannot read an ED review without explicit reviewer assignment'
);
reset role;

select is_empty(
  $$
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ed_review_responses'
      and column_name in ('user_id', 'email', 'recipient_email', 'ip_address', 'user_agent', 'client_timestamp')
  $$,
  'the response schema excludes direct respondent identity and device fields'
);

insert into public.ed_review_compilations (
  id, cycle_id, version, response_count, summary, generated_by, approved_at
) values (
  '95000000-0000-0000-0000-000000000001',
  '93000000-0000-0000-0000-000000000001',
  1,
  3,
  '{"generated_summary":{"executive_summary":"Initial"}}'::jsonb,
  '91000000-0000-0000-0000-000000000001',
  now()
);

select throws_ok(
  $$
    update public.ed_review_compilations
    set summary = '{"generated_summary":{"executive_summary":"Changed"}}'::jsonb
    where id = '95000000-0000-0000-0000-000000000001'
  $$,
  'P0001',
  'Approved ED review summaries are immutable.',
  'an approved Board Chair summary cannot be modified in place'
);

select * from finish();
rollback;
