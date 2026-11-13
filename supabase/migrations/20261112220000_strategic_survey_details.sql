-- Survey invitation and closing details from the Strategic Planning workbook.
alter table public.strategic_stakeholder_surveys
  drop constraint strategic_stakeholder_surveys_audience_check;

alter table public.strategic_stakeholder_surveys
  add constraint strategic_stakeholder_surveys_audience_check
  check (audience in ('board', 'staff', 'volunteers', 'clients', 'partners',
    'funders', 'community', 'everyone'));

alter table public.strategic_stakeholder_surveys
  add column details jsonb not null default '{}'::jsonb
    check (jsonb_typeof(details) = 'object');

alter table public.strategic_stakeholder_surveys
  add constraint strategic_stakeholder_surveys_details_size
  check (octet_length(details::text) <= 12000);
