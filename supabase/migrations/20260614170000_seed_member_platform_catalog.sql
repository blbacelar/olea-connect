-- Reference records used by the member platform. Organization-owned records
-- remain tenant scoped and are never seeded here.

insert into public.resources (
  id,
  category_id,
  type,
  status,
  slug,
  title,
  summary,
  description,
  estimated_minutes,
  published_at,
  is_featured
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    (select id from public.resource_categories where slug = 'governance'),
    'template',
    'published',
    'board-self-evaluation',
    'Board Self-Evaluation',
    'An annual survey to strengthen board performance and governance.',
    'A guided board evaluation with scored sections, reflections, and a branded PDF export.',
    20,
    '2026-06-01T16:00:00Z',
    true
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    (select id from public.resource_categories where slug = 'governance'),
    'template',
    'published',
    'board-meeting-agenda',
    'Board Meeting Agenda',
    'A focused, repeatable agenda for productive board meetings.',
    'A practical agenda structure that keeps board meetings focused and accountable.',
    10,
    '2026-06-01T16:00:00Z',
    true
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    (select id from public.resource_categories where slug = 'hr-and-volunteers'),
    'template',
    'published',
    'director-onboarding-checklist',
    'Director Onboarding Checklist',
    'Give new directors the context and tools they need to contribute.',
    'A reusable checklist for welcoming and preparing incoming board directors.',
    12,
    '2026-06-01T16:00:00Z',
    false
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    (select id from public.resource_categories where slug = 'governance'),
    'template',
    'published',
    'conflict-of-interest-policy',
    'Conflict of Interest Policy',
    'A clear policy framework for disclosure and ethical decisions.',
    'A policy template for identifying, disclosing, and managing conflicts of interest.',
    12,
    '2026-06-01T16:00:00Z',
    false
  ),
  (
    '10000000-0000-4000-8000-000000000005',
    (select id from public.resource_categories where slug = 'governance'),
    'template',
    'published',
    'director-role-description',
    'Director Role Description',
    'Clarify the responsibilities and expectations of every board director.',
    'A practical role description for recruiting, onboarding, and supporting directors.',
    10,
    '2026-06-01T16:00:00Z',
    false
  ),
  (
    '10000000-0000-4000-8000-000000000006',
    (select id from public.resource_categories where slug = 'governance'),
    'template',
    'published',
    'governance-policy-manual',
    'Governance Policy Manual',
    'Build a consistent policy foundation for board governance.',
    'A structured starting point for documenting the policies that guide your board.',
    30,
    '2026-06-01T16:00:00Z',
    false
  )
on conflict (id) do update
set
  category_id = excluded.category_id,
  status = excluded.status,
  slug = excluded.slug,
  title = excluded.title,
  summary = excluded.summary,
  description = excluded.description,
  estimated_minutes = excluded.estimated_minutes,
  published_at = excluded.published_at,
  is_featured = excluded.is_featured;

insert into public.template_definitions (
  resource_id,
  renderer_key,
  schema_version,
  field_schema,
  default_values,
  supports_pdf
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'board_self_evaluation',
    1,
    '{"type":"object","fields":[{"key":"boardYear","type":"text","label":"Board year"},{"key":"surveyPeriod","type":"text","label":"Survey period"},{"key":"answers","type":"survey","label":"Evaluation answers"},{"key":"openEndedAnswers","type":"long_text","label":"Reflections"}]}'::jsonb,
    '{}'::jsonb,
    true
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'board_meeting_agenda',
    1,
    '{"type":"object","fields":[{"key":"meetingDate","type":"date","label":"Meeting date"},{"key":"agendaItems","type":"repeater","label":"Agenda items"}]}'::jsonb,
    '{}'::jsonb,
    true
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'director_onboarding_checklist',
    1,
    '{"type":"object","fields":[{"key":"directorName","type":"text","label":"Director name"},{"key":"tasks","type":"checklist","label":"Onboarding tasks"}]}'::jsonb,
    '{}'::jsonb,
    true
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    'conflict_of_interest_policy',
    1,
    '{"type":"object","fields":[{"key":"effectiveDate","type":"date","label":"Effective date"},{"key":"policyText","type":"rich_text","label":"Policy"}]}'::jsonb,
    '{}'::jsonb,
    true
  ),
  (
    '10000000-0000-4000-8000-000000000005',
    'director_role_description',
    1,
    '{"type":"object","fields":[{"key":"roleTitle","type":"text","label":"Role title"},{"key":"responsibilities","type":"rich_text","label":"Responsibilities"}]}'::jsonb,
    '{}'::jsonb,
    true
  ),
  (
    '10000000-0000-4000-8000-000000000006',
    'governance_policy_manual',
    1,
    '{"type":"object","fields":[{"key":"policies","type":"repeater","label":"Policies"}]}'::jsonb,
    '{}'::jsonb,
    true
  )
on conflict (resource_id) do update
set
  renderer_key = excluded.renderer_key,
  schema_version = excluded.schema_version,
  field_schema = excluded.field_schema,
  default_values = excluded.default_values,
  supports_pdf = excluded.supports_pdf;

insert into public.resource_plan_access (resource_id, plan_id)
values
  ('10000000-0000-4000-8000-000000000001', 'roots'),
  ('10000000-0000-4000-8000-000000000001', 'canopy'),
  ('10000000-0000-4000-8000-000000000001', 'harvest'),
  ('10000000-0000-4000-8000-000000000002', 'roots'),
  ('10000000-0000-4000-8000-000000000002', 'canopy'),
  ('10000000-0000-4000-8000-000000000002', 'harvest'),
  ('10000000-0000-4000-8000-000000000003', 'roots'),
  ('10000000-0000-4000-8000-000000000003', 'canopy'),
  ('10000000-0000-4000-8000-000000000003', 'harvest'),
  ('10000000-0000-4000-8000-000000000004', 'canopy'),
  ('10000000-0000-4000-8000-000000000004', 'harvest'),
  ('10000000-0000-4000-8000-000000000005', 'roots'),
  ('10000000-0000-4000-8000-000000000005', 'canopy'),
  ('10000000-0000-4000-8000-000000000005', 'harvest'),
  ('10000000-0000-4000-8000-000000000006', 'roots'),
  ('10000000-0000-4000-8000-000000000006', 'canopy'),
  ('10000000-0000-4000-8000-000000000006', 'harvest')
on conflict do nothing;

insert into public.events (
  id,
  type,
  status,
  slug,
  title,
  summary,
  starts_at,
  ends_at,
  timezone,
  capacity,
  registration_opens_at,
  registration_closes_at
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    'webinar',
    'scheduled',
    'governance-best-practices-small-nonprofits',
    'Governance Best Practices for Small Nonprofits',
    'Practical governance foundations for small and growing nonprofit organizations.',
    '2026-07-15T18:00:00Z',
    '2026-07-15T19:00:00Z',
    'America/Toronto',
    100,
    '2026-06-15T16:00:00Z',
    '2026-07-15T17:45:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'webinar',
    'completed',
    'board-composition-101',
    'Board Composition 101',
    'Build a balanced board with the skills, perspectives, and lived experience your mission needs.',
    '2026-06-10T18:00:00Z',
    '2026-06-10T19:00:00Z',
    'America/Toronto',
    100,
    '2026-05-01T16:00:00Z',
    '2026-06-10T17:45:00Z'
  )
on conflict (id) do update
set
  status = excluded.status,
  slug = excluded.slug,
  title = excluded.title,
  summary = excluded.summary,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  timezone = excluded.timezone,
  capacity = excluded.capacity,
  registration_opens_at = excluded.registration_opens_at,
  registration_closes_at = excluded.registration_closes_at;

update public.events
set recording_url = 'https://oleaconnects.ca/recordings/board-composition-101'
where id = '20000000-0000-4000-8000-000000000002';

insert into public.event_plan_access (event_id, plan_id, included)
values
  ('20000000-0000-4000-8000-000000000001', 'roots', true),
  ('20000000-0000-4000-8000-000000000001', 'canopy', true),
  ('20000000-0000-4000-8000-000000000001', 'harvest', true),
  ('20000000-0000-4000-8000-000000000002', 'roots', true),
  ('20000000-0000-4000-8000-000000000002', 'canopy', true),
  ('20000000-0000-4000-8000-000000000002', 'harvest', true)
on conflict do nothing;

insert into public.grant_rounds (
  id,
  program_id,
  name,
  status,
  opens_at,
  closes_at,
  decision_at,
  award_amount_cents,
  available_awards,
  budget_cents,
  public_notes
)
values (
  '30000000-0000-4000-8000-000000000001',
  (
    select id
    from public.grant_programs
    where slug = 'quarterly-community-grant'
  ),
  'Q3 2026 Community Grant',
  'upcoming',
  '2026-07-01T14:00:00Z',
  '2026-07-22T05:59:59Z',
  '2026-08-15T16:00:00Z',
  50000,
  3,
  150000,
  'A simple capacity-building grant with no complex reporting requirement.'
)
on conflict (id) do update
set
  program_id = excluded.program_id,
  name = excluded.name,
  status = excluded.status,
  opens_at = excluded.opens_at,
  closes_at = excluded.closes_at,
  decision_at = excluded.decision_at,
  award_amount_cents = excluded.award_amount_cents,
  available_awards = excluded.available_awards,
  budget_cents = excluded.budget_cents,
  public_notes = excluded.public_notes;
