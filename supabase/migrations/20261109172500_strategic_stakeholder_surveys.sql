-- Recovered from development Supabase schema_migrations on 2026-11-12.
create table public.strategic_stakeholder_surveys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 160),
  public_token text not null unique check (public_token ~ '^[a-f0-9]{64}$'),
  audience text not null check (audience in ('board', 'staff', 'volunteers', 'clients', 'partners', 'funders', 'community')),
  questions jsonb not null check (jsonb_typeof(questions) = 'array'),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index strategic_stakeholder_surveys_org_idx
  on public.strategic_stakeholder_surveys (organization_id, created_at desc);

create table public.strategic_stakeholder_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.strategic_stakeholder_surveys(id) on delete cascade,
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  submitted_at timestamptz not null default now()
);

create index strategic_stakeholder_responses_survey_idx
  on public.strategic_stakeholder_responses (survey_id);

alter table public.strategic_stakeholder_surveys enable row level security;

alter table public.strategic_stakeholder_responses enable row level security;

revoke all on public.strategic_stakeholder_surveys,
  public.strategic_stakeholder_responses from public, anon, authenticated;

grant select, insert, update, delete on public.strategic_stakeholder_surveys,
  public.strategic_stakeholder_responses to service_role;
