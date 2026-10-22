-- Run against a disposable local Supabase database after db reset:
-- psql -X -v ON_ERROR_STOP=1 postgresql://postgres:postgres@127.0.0.1:54322/postgres \
--   -f scripts/test-grant-planning-backfill.sql
-- The transaction is rolled back, and the production-specific IDs must not
-- already exist. This executes the actual backfill migration, not a copy.
begin;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-4000-8000-000000009971', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'planning-backfill-a@example.com', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000009972', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'planning-backfill-b@example.com', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.organizations (id, name, slug, kind, annual_budget_range) values
  ('00000000-0000-4000-8000-000000009973', 'Verified planning owner', 'verified-planning-owner', 'nonprofit', 'under-250k'),
  ('00000000-0000-4000-8000-000000009974', 'Unrelated applicant', 'unrelated-planning-applicant', 'nonprofit', 'under-250k');

insert into public.grant_programs
  (id, type, name, slug, description, default_award_cents)
values ('00000000-0000-4000-8000-000000009975', 'quarterly',
  'Planning backfill test', 'planning-backfill-test', 'Backfill fixture', 10000);

insert into public.grant_rounds
  (id, program_id, name, status, opens_at, closes_at,
   award_amount_cents, available_awards, budget_cents, created_at)
values ('d73c6672-9c5b-4099-9556-eb2490aeaa25',
  '00000000-0000-4000-8000-000000009975', 'Verified draft', 'draft',
  '2026-10-22 12:00:00.03+00', '2026-11-22 12:00:00+00',
  10000, 1, 10000, '2026-10-22 12:00:00+00');

insert into public.grant_applications
  (id, round_id, organization_id, applicant_user_id, focus_area,
   funding_request, expected_outcome, requested_amount_cents,
   cra_good_standing, registered_in_canada, eligibility_snapshot, created_at)
values ('542c0d5c-4dbc-46bd-970f-297bf0faef61',
  'd73c6672-9c5b-4099-9556-eb2490aeaa25',
  '00000000-0000-4000-8000-000000009973',
  '00000000-0000-4000-8000-000000009971',
  'operational_capacity', 'Planning test', 'Planning outcome', 10000,
  true, true, '{"source":"manual","organization_name":"Verified planning owner"}'::jsonb,
  '2026-10-22 12:00:00.07+00');

-- A mismatched source must leave the draft unowned.
\ir ../supabase/migrations/20261022093600_backfill_verified_grant_planning_draft.sql
do $$ begin
  if (select planning_organization_id is not null from public.grant_rounds
      where id = 'd73c6672-9c5b-4099-9556-eb2490aeaa25') then
    raise exception 'backfill assigned an owner despite mismatched source';
  end if;
end $$;

-- The verified, unique pair can be backfilled.
update public.grant_applications
set eligibility_snapshot = '{"source":"module_create","organization_name":"Verified planning owner"}'::jsonb
where id = '542c0d5c-4dbc-46bd-970f-297bf0faef61';
\ir ../supabase/migrations/20261022093600_backfill_verified_grant_planning_draft.sql
do $$ begin
  if (select planning_organization_id from public.grant_rounds
      where id = 'd73c6672-9c5b-4099-9556-eb2490aeaa25')
      is distinct from '00000000-0000-4000-8000-000000009973'::uuid then
    raise exception 'backfill did not assign the verified owner';
  end if;
end $$;

-- Even a valid source cannot assign ownership when another org has an
-- application attached to the same round.
update public.grant_rounds set planning_organization_id = null
where id = 'd73c6672-9c5b-4099-9556-eb2490aeaa25';
insert into public.grant_applications
  (id, round_id, organization_id, applicant_user_id, focus_area,
   funding_request, expected_outcome, requested_amount_cents,
   cra_good_standing, registered_in_canada)
values ('00000000-0000-4000-8000-000000009976',
  'd73c6672-9c5b-4099-9556-eb2490aeaa25',
  '00000000-0000-4000-8000-000000009974',
  '00000000-0000-4000-8000-000000009972',
  'operational_capacity', 'Other application', 'Other outcome', 10000,
  true, true);
\ir ../supabase/migrations/20261022093600_backfill_verified_grant_planning_draft.sql
do $$ begin
  if (select planning_organization_id is not null from public.grant_rounds
      where id = 'd73c6672-9c5b-4099-9556-eb2490aeaa25') then
    raise exception 'backfill assigned an owner despite second application';
  end if;
end $$;

rollback;
