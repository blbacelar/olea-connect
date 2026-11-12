-- Recovered from development Supabase schema_migrations on 2026-11-12.
-- Separate the final anonymous toolkit from the earlier identified annual cycle.
-- Public survey links are resolved only in server actions. Neither responses nor
-- link secrets have a respondent, email, IP, or user-agent column.
create table public.board_evaluation_toolkit_surveys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null check (kind in ('annual', 'meeting')),
  title text not null check (char_length(trim(title)) between 3 and 160),
  year integer check (year between 2000 and 2100),
  meeting_date date,
  status text not null default 'open' check (status in ('open', 'closed')),
  public_token text not null unique check (public_token ~ '^[a-f0-9]{64}$'),
  question_ids jsonb not null check (jsonb_typeof(question_ids) = 'array'),
  invited_count integer not null default 0 check (invited_count between 0 and 100000),
  board_size integer not null default 0 check (board_size between 0 and 100000),
  priorities jsonb not null default '[]'::jsonb check (jsonb_typeof(priorities) = 'array'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'annual' and year is not null and meeting_date is null)
    or (kind = 'meeting' and meeting_date is not null))
);

create index board_evaluation_toolkit_surveys_org_idx
  on public.board_evaluation_toolkit_surveys (organization_id, created_at desc);

create table public.board_evaluation_toolkit_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.board_evaluation_toolkit_surveys(id) on delete cascade,
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  submitted_at timestamptz not null default now()
);

create index board_evaluation_toolkit_responses_survey_idx
  on public.board_evaluation_toolkit_responses (survey_id);

alter table public.board_evaluation_toolkit_surveys enable row level security;

alter table public.board_evaluation_toolkit_responses enable row level security;

revoke all on public.board_evaluation_toolkit_surveys,
  public.board_evaluation_toolkit_responses from public, anon, authenticated;

grant select, insert, update, delete on public.board_evaluation_toolkit_surveys,
  public.board_evaluation_toolkit_responses to service_role;
