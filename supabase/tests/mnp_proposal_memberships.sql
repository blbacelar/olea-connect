begin;

select plan(75);

select is(
  (select count(*)::integer from public.sponsorship_packages
   where is_active and id in ('seedkeeper','root_keeper','resilience_builder','legacy_guardian','catalyst')),
  5,
  'all five proposal sponsorship tiers are active'
);
select is(
  (select sum(board_count)::integer from public.sponsorship_board_targets
   where package_id = 'catalyst'),
  20,
  'Catalyst funds twenty board memberships'
);
select ok(
  not has_table_privilege('authenticated', 'public.sponsored_memberships', 'SELECT'),
  'ordinary members cannot read funded placements'
);
select ok(
  not has_function_privilege('authenticated', 'public.activate_sponsored_membership(uuid,uuid,text,bigint,uuid)', 'EXECUTE'),
  'ordinary members cannot activate a funded year'
);
select ok(
  has_function_privilege('service_role', 'public.activate_sponsored_membership(uuid,uuid,text,bigint,uuid)', 'EXECUTE'),
  'authorized server actions can activate a funded year'
);
select ok(
  not has_table_privilege('authenticated', 'public.board_evaluation_responses', 'SELECT'),
  'members cannot query individual evaluation responses directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.strategic_goals', 'UPDATE'),
  'members cannot bypass planning role checks'
);

insert into public.sponsors (id, name, slug, status) values
  ('00000000-0000-4000-8000-000000000101', 'Proposal test sponsor', 'proposal-test-sponsor', 'active');
insert into public.sponsorships (
  id, sponsor_id, package_id, status, starts_on, ends_on,
  contract_amount_cents, committed_contribution_cents
) values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101',
   'seedkeeper', 'active', current_date, current_date + 365, 200000, 0),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000101',
   'root_keeper', 'active', current_date, current_date + 365, 800000, 0),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000101',
   'root_keeper', 'active', current_date, current_date + 365, 800000, 0);
insert into public.sponsor_contributions (sponsorship_id, status, amount_cents) values
  ('00000000-0000-4000-8000-000000000201', 'received', 200000),
  ('00000000-0000-4000-8000-000000000202', 'received', 800000);
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-4000-8000-000000000401', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'mnp-sponsored-one@example.com', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000402', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'mnp-paid-one@example.com', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000403', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'mnp-reviewer-three@example.com', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());
insert into public.organizations (id, name, slug, kind, annual_budget_range) values
  ('00000000-0000-4000-8000-000000000301', 'Proposal seed one', 'proposal-seed-one', 'nonprofit', 'under-250k'),
  ('00000000-0000-4000-8000-000000000302', 'Proposal seed two', 'proposal-seed-two', 'nonprofit', '250k-500k'),
  ('00000000-0000-4000-8000-000000000303', 'Proposal seed three', 'proposal-seed-three', 'nonprofit', 'under-250k'),
  ('00000000-0000-4000-8000-000000000304', 'Proposal roots one', 'proposal-roots-one', 'nonprofit', '500k-1m');
insert into public.organization_members (organization_id, user_id, role, status)
values
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000401', 'member', 'active'),
  ('00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000402', 'member', 'active');
insert into public.communities (id, slug, name, status)
values ('00000000-0000-4000-8000-000000000601', 'mnp-funded-community', 'Funded community', 'active');
insert into public.community_spaces (id, community_id, slug, name, status)
values ('00000000-0000-4000-8000-000000000602',
  '00000000-0000-4000-8000-000000000601', 'mnp-funded-space', 'Funded space', 'active');
insert into public.events (id, type, status, slug, title, summary, starts_at, ends_at)
values ('00000000-0000-4000-8000-000000000603', 'webinar', 'scheduled',
  'mnp-funded-webinar', 'Funded webinar', 'Access test', now() + interval '1 day',
  now() + interval '1 day 1 hour');
insert into public.event_plan_access (event_id, plan_id, included)
values ('00000000-0000-4000-8000-000000000603', 'seedling', true);

select public.activate_sponsored_membership(
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000301', 'seedling', 49999999, null
);
select is(
  (select count(*)::integer from public.sponsored_memberships
   where sponsorship_id = '00000000-0000-4000-8000-000000000201' and status = 'active'),
  1,
  'funded placement is created atomically'
);
select is(
  (select metadata->>'funding_source' from public.subscriptions
   where organization_id = '00000000-0000-4000-8000-000000000301'),
  'sponsorship',
  'one-year manual subscription identifies the funding source'
);
select is(
  (select verified_budget_cents from public.sponsored_memberships
   where organization_id = '00000000-0000-4000-8000-000000000301'),
  49999999::bigint,
  'the confirmed annual budget is retained with the placement'
);
insert into public.grant_programs
  (id, type, name, slug, description, default_award_cents)
values ('00000000-0000-4000-8000-000000000701', 'quarterly',
  'Funded access test', 'funded-access-test', 'Private grant access test', 10000);
insert into public.grant_rounds
  (id, program_id, name, status, opens_at, closes_at, award_amount_cents,
   available_awards, budget_cents)
values ('00000000-0000-4000-8000-000000000702',
  '00000000-0000-4000-8000-000000000701', 'Funded access round', 'open',
  now() - interval '1 day', now() + interval '1 month', 10000, 2, 20000);
insert into public.grant_applications
  (id, round_id, organization_id, applicant_user_id, focus_area,
   funding_request, expected_outcome, requested_amount_cents,
   cra_good_standing, registered_in_canada)
values
  ('00000000-0000-4000-8000-000000000703',
   '00000000-0000-4000-8000-000000000702',
   '00000000-0000-4000-8000-000000000301',
   '00000000-0000-4000-8000-000000000401',
   'governance_strengthening', 'Private grant request', 'Better board governance',
   10000, true, true),
  ('00000000-0000-4000-8000-000000000704',
   '00000000-0000-4000-8000-000000000702',
   '00000000-0000-4000-8000-000000000303',
   '00000000-0000-4000-8000-000000000402',
   'governance_strengthening', 'Paid member grant request', 'Better board governance',
   10000, true, true);
insert into public.grant_application_attachments
  (application_id, organization_id, uploaded_by, file_name, file_path)
values ('00000000-0000-4000-8000-000000000703',
  '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000401', 'test.pdf',
  '00000000-0000-4000-8000-000000000301/00000000-0000-4000-8000-000000000703/test.pdf');
insert into public.grant_organization_settings (organization_id)
values ('00000000-0000-4000-8000-000000000301');
insert into public.grant_partners
  (id, organization_id, name, partner_type, contact_name, email, phone,
   focus_areas, status)
values ('00000000-0000-4000-8000-000000000705',
  '00000000-0000-4000-8000-000000000301', 'Funding contact', 'funder',
  'Grant Reviewer', 'reviewer@example.com', '604-555-0100', 'Governance', 'active');
insert into public.grant_funder_interactions
  (organization_id, partner_id, interaction_date, contact_method,
   contact_name, summary)
values ('00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000705', current_date, 'email',
  'Grant Reviewer', 'Private planning discussion');
insert into public.grant_awards (application_id, amount_cents)
values ('00000000-0000-4000-8000-000000000703', 10000);
insert into storage.objects (bucket_id, name, owner_id)
values ('grant-attachments',
  '00000000-0000-4000-8000-000000000301/00000000-0000-4000-8000-000000000703/test.pdf',
  '00000000-0000-4000-8000-000000000401');
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000401","role":"authenticated"}', true);
select ok(public.has_current_subscription(),
  'a funded membership grants access inside its one-year period');
select ok(private.has_active_member_subscription(),
  'current funded member passes the community membership gate');
select ok(private.can_access_community_space('00000000-0000-4000-8000-000000000602'),
  'current funded member can enter an included community space');
select ok(private.can_access_event('00000000-0000-4000-8000-000000000603',
  '00000000-0000-4000-8000-000000000301'),
  'current funded member can access an included event');
select ok(private.can_register_for_event('00000000-0000-4000-8000-000000000603',
  '00000000-0000-4000-8000-000000000301'),
  'current funded member can register for an included event');
select is((select count(*)::integer from public.grant_applications
  where organization_id = '00000000-0000-4000-8000-000000000301'), 1,
  'current funded member can read their private grant application');
select is((select count(*)::integer from public.grant_application_attachments
  where organization_id = '00000000-0000-4000-8000-000000000301'), 1,
  'current funded member can read their grant attachment metadata');
select is((select count(*)::integer from public.grant_organization_settings
  where organization_id = '00000000-0000-4000-8000-000000000301'), 1,
  'current funded member can read their grant settings');
select is((select count(*)::integer from public.grant_partners
  where organization_id = '00000000-0000-4000-8000-000000000301'), 1,
  'current funded member can read their grant partners');
select is((select count(*)::integer from public.grant_funder_interactions
  where organization_id = '00000000-0000-4000-8000-000000000301'), 1,
  'current funded member can read their grant interactions');
select is((select count(*)::integer from public.grant_awards
  where application_id = '00000000-0000-4000-8000-000000000703'), 1,
  'current funded member can read their private grant award');
select is((select count(*)::integer from storage.objects
  where bucket_id = 'grant-attachments'
    and name like '00000000-0000-4000-8000-000000000301/%'), 1,
  'current funded member can read their grant attachment object');
reset role;

select public.activate_sponsored_membership(
  '00000000-0000-4000-8000-000000000202',
  '00000000-0000-4000-8000-000000000304', 'roots', 50000000, null
);
select is(
  (select plan_id from public.subscriptions
   where organization_id = '00000000-0000-4000-8000-000000000304'),
  'roots',
  'Roots budget receives a Roots membership'
);
select throws_ok(
  $$select public.activate_sponsored_membership(
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000303', 'roots', 49999999, null)$$,
  'The verified annual budget must match the selected membership tier.',
  'budget bands are enforced against the exact confirmed amount'
);
select throws_ok(
  $$select public.activate_sponsored_membership(
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000303', 'seedling', 50000000, null)$$,
  'The verified annual budget must match the selected membership tier.',
  'exactly CA$500,000 cannot be placed as Seedling'
);
select throws_ok(
  $$select public.activate_sponsored_membership(
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000303', 'roots', 200000001, null)$$,
  'The verified annual budget must match the selected membership tier.',
  'above CA$2,000,000 cannot be placed as Roots'
);
select throws_ok(
  $$select public.activate_sponsored_membership(
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000301', 'seedling', 40000000, null)$$,
  'This organization already has an active membership.',
  'an existing paid or funded membership cannot be overwritten'
);
select public.activate_sponsored_membership(
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000302', 'seedling', 40000000, null
);
select is(
  (select count(*)::integer from public.sponsored_memberships
   where sponsorship_id = '00000000-0000-4000-8000-000000000201'),
  2,
  'Seedkeeper places exactly two boards'
);
select throws_ok(
  $$update public.sponsorships set package_id = 'root_keeper'
    where id = '00000000-0000-4000-8000-000000000201'$$,
  'Sponsorship package cannot change after funded boards are placed.',
  'a funded sponsorship cannot silently change package targets'
);
select throws_ok(
  $$update public.sponsor_contributions set amount_cents = 199999
    where sponsorship_id = '00000000-0000-4000-8000-000000000201'$$,
  'Received CAD funds cannot fall below allocated sponsored memberships.',
  'received funds cannot be reduced below funded allocations'
);
select throws_ok(
  $$update public.sponsor_contributions set status = 'pledged'
    where sponsorship_id = '00000000-0000-4000-8000-000000000201'$$,
  'Received CAD funds cannot fall below allocated sponsored memberships.',
  'received funds cannot be moved back to pledged after allocation'
);
select throws_ok(
  $$update public.sponsor_contributions set currency = 'USD'
    where sponsorship_id = '00000000-0000-4000-8000-000000000201'$$,
  'Received CAD funds cannot fall below allocated sponsored memberships.',
  'received funds cannot be changed to another currency after allocation'
);
select throws_ok(
  $$update public.sponsor_contributions set sponsorship_id = '00000000-0000-4000-8000-000000000202'
    where sponsorship_id = '00000000-0000-4000-8000-000000000201'$$,
  'Received CAD funds cannot fall below allocated sponsored memberships.',
  'received funds cannot be reassigned away from funded boards'
);
select throws_ok(
  $$delete from public.sponsor_contributions
    where sponsorship_id = '00000000-0000-4000-8000-000000000201'$$,
  'Received CAD funds cannot fall below allocated sponsored memberships.',
  'received funds cannot be deleted after allocation'
);
select throws_ok(
  $$select public.activate_sponsored_membership(
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000303', 'seedling', 40000000, null)$$,
  'The funded board target for this plan has been reached.',
  'package target cannot be exceeded'
);
select throws_ok(
  $$select public.activate_sponsored_membership(
    '00000000-0000-4000-8000-000000000203',
    '00000000-0000-4000-8000-000000000303', 'seedling', 40000000, null)$$,
  'Record sufficient received sponsorship funds before placing another board.',
  'pledged but unreceived money cannot fund access'
);
insert into public.sponsor_contributions
  (sponsorship_id, status, amount_cents, currency)
values ('00000000-0000-4000-8000-000000000203', 'received', 100000, 'USD');
select throws_ok(
  $$select public.activate_sponsored_membership(
    '00000000-0000-4000-8000-000000000203',
    '00000000-0000-4000-8000-000000000303', 'seedling', 40000000, null)$$,
  'Record sufficient received sponsorship funds before placing another board.',
  'received funds in another currency cannot fund a CAD placement'
);
select is(
  (select template_exports + training_certificates + attended_events +
          completed_evaluations + completed_milestones
   from public.sponsorship_impact_summary('00000000-0000-4000-8000-000000000201')),
  0::bigint,
  'impact report does not invent activity'
);
insert into public.sponsorships (
  id, sponsor_id, package_id, status, starts_on, ends_on,
  contract_amount_cents, committed_contribution_cents, category_exclusivity
) values (
  '00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000101',
  'resilience_builder', 'active', current_date, current_date + 365, 1444400, 0, 'Accounting'
);
select throws_ok(
  $$insert into public.sponsorships (
    id, sponsor_id, package_id, status, starts_on, ends_on,
    contract_amount_cents, committed_contribution_cents
  ) values (
    '00000000-0000-4000-8000-000000000207', '00000000-0000-4000-8000-000000000101',
    'resilience_builder', 'active', current_date, current_date + 365, 1444400, 0
  )$$,
  'An exclusive sponsorship requires an industry category.',
  'exclusive sponsorship cannot activate without an industry category'
);
select throws_ok(
  $$insert into public.sponsorships (
    id, sponsor_id, package_id, status, starts_on, ends_on,
    contract_amount_cents, committed_contribution_cents, category_exclusivity
  ) values (
    '00000000-0000-4000-8000-000000000205', '00000000-0000-4000-8000-000000000101',
    'legacy_guardian', 'active', current_date + 30, current_date + 400, 3300000, 0, ' accounting '
  )$$,
  'Another active sponsor already has this category during the chosen dates.',
  'exclusive industry category rejects overlapping terms regardless of casing or spaces'
);
select throws_ok(
  $$insert into public.sponsorships (
    id, sponsor_id, package_id, status, starts_on, ends_on,
    contract_amount_cents, committed_contribution_cents, category_exclusivity
  ) values (
    '00000000-0000-4000-8000-000000000208', '00000000-0000-4000-8000-000000000101',
    'seedkeeper', 'active', current_date + 30, current_date + 400, 200000, 0, ' accounting '
  )$$,
  'Another active sponsor already has this category during the chosen dates.',
  'an existing exclusive term blocks a lower-tier sponsor in the same category'
);
insert into public.sponsorships (
  id, sponsor_id, package_id, status, starts_on, ends_on,
  contract_amount_cents, committed_contribution_cents, category_exclusivity
) values (
  '00000000-0000-4000-8000-000000000206', '00000000-0000-4000-8000-000000000101',
  'legacy_guardian', 'active', current_date + 366, current_date + 730, 3300000, 0, 'accounting'
);
select is((select count(*)::integer from public.sponsorships
  where category_exclusivity ilike 'accounting%'), 2,
  'the same exclusive category is allowed after the prior term ends');
insert into public.sponsorships (
  id, sponsor_id, package_id, status, starts_on, ends_on,
  contract_amount_cents, committed_contribution_cents, category_exclusivity
) values
  ('00000000-0000-4000-8000-000000000209', '00000000-0000-4000-8000-000000000101',
   'seedkeeper', 'active', current_date, current_date + 365, 200000, 0, 'Education'),
  ('00000000-0000-4000-8000-000000000210', '00000000-0000-4000-8000-000000000101',
   'root_keeper', 'active', current_date + 30, current_date + 400, 800000, 0, ' education ');
select is((select count(*)::integer from public.sponsorships
  where lower(trim(category_exclusivity)) = 'education'), 2,
  'nonexclusive sponsorships may share an industry category');
select throws_ok(
  $$insert into public.sponsorships (
    id, sponsor_id, package_id, status, starts_on, ends_on,
    contract_amount_cents, committed_contribution_cents, category_exclusivity
  ) values (
    '00000000-0000-4000-8000-000000000211', '00000000-0000-4000-8000-000000000101',
    'resilience_builder', 'active', current_date + 30, current_date + 400, 1444400, 0, 'EDUCATION'
  )$$,
  'Another active sponsor already has this category during the chosen dates.',
  'a later exclusive term cannot overlap existing lower-tier terms in the same category'
);
insert into public.board_evaluation_cycles
  (organization_id, year, status)
values ('00000000-0000-4000-8000-000000000304', extract(year from current_date)::integer,
  'open');
select throws_ok(
  $$update public.board_evaluation_cycles set status = 'closed'
    where organization_id = '00000000-0000-4000-8000-000000000304'$$,
  'At least 3 board members must respond before you can close the evaluation.',
  'the database rejects closing an evaluation without three responses'
);
select is(
  (select completed_evaluations
   from public.sponsorship_impact_summary('00000000-0000-4000-8000-000000000202')),
  0::bigint,
  'closing an empty evaluation does not count as completed work'
);
insert into public.board_evaluation_responses
  (cycle_id, organization_id, respondent_id, scores)
select cycle.id, cycle.organization_id, reviewer.id, '{}'::jsonb
from public.board_evaluation_cycles as cycle
cross join (values
  ('00000000-0000-4000-8000-000000000401'::uuid),
  ('00000000-0000-4000-8000-000000000402'::uuid),
  ('00000000-0000-4000-8000-000000000403'::uuid)
) as reviewer(id)
where cycle.organization_id = '00000000-0000-4000-8000-000000000304';
update public.board_evaluation_cycles set status = 'closed'
where organization_id = '00000000-0000-4000-8000-000000000304';
select is(
  (select completed_evaluations
   from public.sponsorship_impact_summary('00000000-0000-4000-8000-000000000202')),
  1::bigint,
  'partner report counts an evaluation only after three responses'
);
select throws_ok(
  $$insert into public.board_evaluation_responses
      (cycle_id, organization_id, respondent_id, scores)
    select id, organization_id, '00000000-0000-4000-8000-000000000401', '{}'::jsonb
    from public.board_evaluation_cycles
    where organization_id = '00000000-0000-4000-8000-000000000304'$$,
  'This board evaluation is closed.',
  'direct response insertion is blocked after evaluation closure'
);
select throws_ok(
  $$update public.board_evaluation_responses set scores = '{"updated":1}'::jsonb
    where organization_id = '00000000-0000-4000-8000-000000000304'$$,
  'This board evaluation is closed.',
  'direct response updates are blocked after evaluation closure'
);
insert into public.board_evaluation_cycles
  (organization_id, year, status, closes_on)
values ('00000000-0000-4000-8000-000000000304',
  extract(year from current_date)::integer + 1, 'open', current_date - 1);
select throws_ok(
  $$insert into public.board_evaluation_responses
      (cycle_id, organization_id, respondent_id, scores)
    select id, organization_id, '00000000-0000-4000-8000-000000000401', '{}'::jsonb
    from public.board_evaluation_cycles
    where organization_id = '00000000-0000-4000-8000-000000000304' and status = 'open'$$,
  'This board evaluation is closed.',
  'the database rejects late responses after the evaluation deadline'
);
insert into public.kpi_dashboards (id, organization_id)
values ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000304');
insert into public.kpi_milestones (id, dashboard_id, title, status)
values ('00000000-0000-4000-8000-000000000502',
  '00000000-0000-4000-8000-000000000501', 'Funded board milestone', 'complete');
select ok((select completed_at is not null from public.kpi_milestones
  where id = '00000000-0000-4000-8000-000000000502'),
  'newly completed milestone records its completion time');
select is((select completed_milestones
  from public.sponsorship_impact_summary('00000000-0000-4000-8000-000000000202')),
  1::bigint, 'completed milestone appears in its funded year');
update public.kpi_milestones set notes = 'Edited without changing completion'
where id = '00000000-0000-4000-8000-000000000502';
select is((select completed_at from public.kpi_milestones
  where id = '00000000-0000-4000-8000-000000000502'), now(),
  'editing notes does not move the completion timestamp');
update public.kpi_milestones set status = 'in_progress'
where id = '00000000-0000-4000-8000-000000000502';
select is((select completed_milestones
  from public.sponsorship_impact_summary('00000000-0000-4000-8000-000000000202')),
  0::bigint, 'reopened milestone no longer appears as complete');

insert into public.subscriptions (
  organization_id, plan_id, provider, billing_interval, status, current_period_end
) values (
  '00000000-0000-4000-8000-000000000303', 'seedling', 'stripe', 'year', 'active',
  now() - interval '1 day'
);
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000402","role":"authenticated"}', true);
select ok(public.has_current_subscription(),
  'the sponsored expiry guard leaves paid-subscription entitlement rules unchanged');
select ok(private.has_active_member_subscription(),
  'paid membership still passes the community membership gate');
select ok(private.can_access_community_space('00000000-0000-4000-8000-000000000602'),
  'paid membership still accesses an included community space');
select ok(private.can_access_event('00000000-0000-4000-8000-000000000603',
  '00000000-0000-4000-8000-000000000303'),
  'paid membership still accesses an included event');
select ok(private.can_register_for_event('00000000-0000-4000-8000-000000000603',
  '00000000-0000-4000-8000-000000000303'),
  'paid membership still registers for an included event');
select is((select count(*)::integer from public.grant_applications
  where organization_id = '00000000-0000-4000-8000-000000000303'), 1,
  'paid membership retains private grant access');
reset role;

update public.sponsored_memberships
set starts_at = now() - interval '2 years', ends_at = now() - interval '1 day'
where organization_id = '00000000-0000-4000-8000-000000000301';
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000401","role":"authenticated"}', true);
select is(public.has_current_subscription(), false,
  'expired funded membership loses access even before the cron runs');
select is(private.has_active_member_subscription(), false,
  'expired funded membership fails the community membership gate before cron');
select is(private.can_access_community_space('00000000-0000-4000-8000-000000000602'),
  false, 'expired funded membership cannot enter a community space before cron');
select is(private.can_access_event('00000000-0000-4000-8000-000000000603',
  '00000000-0000-4000-8000-000000000301'), false,
  'expired funded membership cannot access an event before cron');
select is(private.can_register_for_event('00000000-0000-4000-8000-000000000603',
  '00000000-0000-4000-8000-000000000301'), false,
  'expired funded membership cannot register for an event before cron');
select is((select count(*)::integer from public.grant_applications
  where organization_id = '00000000-0000-4000-8000-000000000301'), 0,
  'expired funded member cannot query private grant applications');
select is((select count(*)::integer from public.grant_application_attachments
  where organization_id = '00000000-0000-4000-8000-000000000301'), 0,
  'expired funded member cannot query grant attachment metadata');
select is((select count(*)::integer from public.grant_organization_settings
  where organization_id = '00000000-0000-4000-8000-000000000301'), 0,
  'expired funded member cannot query grant settings');
select is((select count(*)::integer from public.grant_partners
  where organization_id = '00000000-0000-4000-8000-000000000301'), 0,
  'expired funded member cannot query grant partners');
select is((select count(*)::integer from public.grant_funder_interactions
  where organization_id = '00000000-0000-4000-8000-000000000301'), 0,
  'expired funded member cannot query grant interactions');
select is((select count(*)::integer from public.grant_awards
  where application_id = '00000000-0000-4000-8000-000000000703'), 0,
  'expired funded member cannot query private grant awards');
select is((select count(*)::integer from storage.objects
  where bucket_id = 'grant-attachments'
    and name like '00000000-0000-4000-8000-000000000301/%'), 0,
  'expired funded member cannot query grant attachment objects');
reset role;
select is(public.expire_sponsored_memberships(), 1, 'expired funded year is processed once');
select is(
  (select status::text from public.subscriptions
   where organization_id = '00000000-0000-4000-8000-000000000301'),
  'canceled',
  'expired manual subscription no longer grants access'
);
select is(
  (select status from public.sponsored_memberships
   where organization_id = '00000000-0000-4000-8000-000000000301'),
  'completed',
  'expired placement remains in the impact history'
);

select * from finish();
rollback;
