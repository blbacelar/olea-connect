begin;

select plan(10);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-4000-8000-000000009901', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'planning-owner-a@example.com', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000009902', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'planning-owner-b@example.com', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.organizations (id, name, slug, kind, annual_budget_range) values
  ('00000000-0000-4000-8000-000000009911', 'Planning owner A', 'planning-owner-a', 'nonprofit', 'under-250k'),
  ('00000000-0000-4000-8000-000000009912', 'Planning owner B', 'planning-owner-b', 'nonprofit', 'under-250k');
insert into public.organization_members (organization_id, user_id, role, status) values
  ('00000000-0000-4000-8000-000000009911', '00000000-0000-4000-8000-000000009901', 'member', 'active'),
  ('00000000-0000-4000-8000-000000009912', '00000000-0000-4000-8000-000000009902', 'member', 'active');

insert into public.grant_programs
  (id, type, name, slug, description, default_award_cents)
values ('00000000-0000-4000-8000-000000009920', 'quarterly',
  'Planning visibility test', 'planning-visibility-test', 'RLS fixture', 10000);

insert into public.grant_rounds
  (id, program_id, name, status, planning_organization_id, opens_at, closes_at,
   award_amount_cents, available_awards, budget_cents) values
  ('00000000-0000-4000-8000-000000009921', '00000000-0000-4000-8000-000000009920',
   'A creator draft', 'draft', '00000000-0000-4000-8000-000000009911',
   now(), now() + interval '30 days', 10000, 1, 10000),
  ('00000000-0000-4000-8000-000000009922', '00000000-0000-4000-8000-000000009920',
   'B creator draft', 'draft', '00000000-0000-4000-8000-000000009912',
   now(), now() + interval '30 days', 10000, 1, 10000),
  ('00000000-0000-4000-8000-000000009923', '00000000-0000-4000-8000-000000009920',
   'Legacy unowned draft', 'draft', null,
   now(), now() + interval '30 days', 10000, 1, 10000),
  ('00000000-0000-4000-8000-000000009924', '00000000-0000-4000-8000-000000009920',
   'Unmarked owner draft', 'draft', '00000000-0000-4000-8000-000000009911',
   now(), now() + interval '30 days', 10000, 1, 10000),
  ('00000000-0000-4000-8000-000000009925', '00000000-0000-4000-8000-000000009920',
   'Published round', 'open', null,
   now(), now() + interval '30 days', 10000, 1, 10000);

insert into public.grant_applications
  (id, round_id, organization_id, applicant_user_id, focus_area,
   funding_request, expected_outcome, requested_amount_cents,
   cra_good_standing, registered_in_canada, eligibility_snapshot) values
  ('00000000-0000-4000-8000-000000009931', '00000000-0000-4000-8000-000000009921',
   '00000000-0000-4000-8000-000000009911', '00000000-0000-4000-8000-000000009901',
   'operational_capacity', 'Planning A', 'Outcome A', 10000, true, true,
   '{"source":"module_create"}'::jsonb),
  ('00000000-0000-4000-8000-000000009932', '00000000-0000-4000-8000-000000009922',
   '00000000-0000-4000-8000-000000009912', '00000000-0000-4000-8000-000000009902',
   'operational_capacity', 'Planning B', 'Outcome B', 10000, true, true,
   '{"source":"module_create"}'::jsonb),
  ('00000000-0000-4000-8000-000000009933', '00000000-0000-4000-8000-000000009923',
   '00000000-0000-4000-8000-000000009911', '00000000-0000-4000-8000-000000009901',
   'operational_capacity', 'Legacy planning', 'Legacy outcome', 10000, true, true,
   '{"source":"module_create"}'::jsonb),
  ('00000000-0000-4000-8000-000000009934', '00000000-0000-4000-8000-000000009924',
   '00000000-0000-4000-8000-000000009911', '00000000-0000-4000-8000-000000009901',
   'operational_capacity', 'Unmarked planning', 'Unmarked outcome', 10000, true, true,
   '{}'::jsonb),
  -- A forged module_create marker in B's application must not reveal A's draft.
  ('00000000-0000-4000-8000-000000009935', '00000000-0000-4000-8000-000000009921',
   '00000000-0000-4000-8000-000000009912', '00000000-0000-4000-8000-000000009902',
   'operational_capacity', 'Claimed planning', 'Claimed outcome', 10000, true, true,
   '{"source":"module_create"}'::jsonb);

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000009901","role":"authenticated"}', true);

select is((select name from public.grant_rounds where id = '00000000-0000-4000-8000-000000009921'),
  'A creator draft', 'creator can read its planning draft');
select is((select count(*)::integer from public.grant_rounds where id = '00000000-0000-4000-8000-000000009922'),
  0, 'creator cannot read another organization draft');
select is((select count(*)::integer from public.grant_rounds where id = '00000000-0000-4000-8000-000000009923'),
  0, 'legacy draft without verified owner stays private');
select is((select count(*)::integer from public.grant_rounds where id = '00000000-0000-4000-8000-000000009924'),
  0, 'an owner value without module_create provenance is insufficient');
select is((select count(*)::integer from public.grant_rounds where id = '00000000-0000-4000-8000-000000009925'),
  1, 'published round remains visible');
select is((select count(*)::integer from public.grant_applications application
  join public.grant_rounds round on round.id = application.round_id
  where application.id = '00000000-0000-4000-8000-000000009931'),
  1, 'creator application can load its joined round on reload');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000009902","role":"authenticated"}', true);
select is((select name from public.grant_rounds where id = '00000000-0000-4000-8000-000000009922'),
  'B creator draft', 'second creator can read its own planning draft');
select is((select count(*)::integer from public.grant_rounds where id = '00000000-0000-4000-8000-000000009921'),
  0, 'forged module_create application cannot reveal first creator draft');
select is((select count(*)::integer from public.grant_applications application
  join public.grant_rounds round on round.id = application.round_id
  where application.id = '00000000-0000-4000-8000-000000009935'),
  0, 'second organization application does not expose first creator round');
select is((select count(*)::integer from public.grant_rounds where id = '00000000-0000-4000-8000-000000009925'),
  1, 'published round remains visible to second organization');

select * from finish();
rollback;
