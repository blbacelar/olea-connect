-- Organization-owned governance growth workspaces. All reads and writes go
-- through server actions that verify the active membership and member role.
create table public.strategic_plans (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 160),
  mission text not null default '' check (char_length(mission) <= 2000),
  vision text not null default '' check (char_length(vision) <= 2000),
  starts_on date not null,
  ends_on date not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'completed')),
  approved_on date,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on > starts_on),
  check (ends_on <= starts_on + interval '5 years')
);

create table public.strategic_goals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.strategic_plans(organization_id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 160),
  intended_outcome text not null check (char_length(trim(intended_outcome)) between 3 and 1000),
  measure text not null default '' check (char_length(measure) <= 240),
  owner_name text not null default '' check (char_length(owner_name) <= 160),
  due_on date,
  status text not null default 'planned'
    check (status in ('planned', 'on_track', 'at_risk', 'completed')),
  progress_note text not null default '' check (char_length(progress_note) <= 2000),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index strategic_goals_organization_idx
  on public.strategic_goals(organization_id, sort_order);

create table public.board_evaluation_cycles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  year integer not null check (year between 2000 and 2100),
  status text not null default 'open' check (status in ('open', 'closed')),
  closes_on date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  unique (organization_id, year),
  unique (id, organization_id)
);
create index board_evaluation_cycles_org_idx
  on public.board_evaluation_cycles(organization_id, year desc);
create unique index board_evaluation_one_open_cycle_per_org
  on public.board_evaluation_cycles(organization_id)
  where status = 'open';

create table public.board_evaluation_responses (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  respondent_id uuid not null references auth.users(id) on delete cascade,
  scores jsonb not null check (jsonb_typeof(scores) = 'object'),
  improvement_note text not null default '' check (char_length(improvement_note) <= 2000),
  submitted_at timestamptz not null default now(),
  unique (cycle_id, respondent_id),
  foreign key (cycle_id, organization_id)
    references public.board_evaluation_cycles(id, organization_id) on delete cascade
);
create index board_evaluation_responses_cycle_idx
  on public.board_evaluation_responses(cycle_id);

create table public.board_evaluation_actions (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 200),
  owner_name text not null default '' check (char_length(owner_name) <= 160),
  due_on date,
  status text not null default 'planned'
    check (status in ('planned', 'in_progress', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (cycle_id, organization_id)
    references public.board_evaluation_cycles(id, organization_id) on delete cascade
);
create index board_evaluation_actions_cycle_idx
  on public.board_evaluation_actions(cycle_id);

alter table public.strategic_plans enable row level security;
alter table public.strategic_goals enable row level security;
alter table public.board_evaluation_cycles enable row level security;
alter table public.board_evaluation_responses enable row level security;
alter table public.board_evaluation_actions enable row level security;

revoke all on public.strategic_plans, public.strategic_goals,
  public.board_evaluation_cycles, public.board_evaluation_responses,
  public.board_evaluation_actions from anon, authenticated;
grant select, insert, update, delete on public.strategic_plans,
  public.strategic_goals, public.board_evaluation_cycles,
  public.board_evaluation_responses, public.board_evaluation_actions
  to service_role;

-- Forward rollback: remove application paths first, then retire tables in a
-- later migration after exporting each organization's governance history.
