create table if not exists public.board_recruitment_workspaces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  accent_color text not null default '#1f5f8b',
  survey_year integer not null default extract(year from current_date)::integer,
  term_length_years integer not null default 3,
  max_consecutive_terms integer not null default 3,
  max_years_of_service integer not null default 10,
  upcoming_agm_year integer not null default extract(year from current_date)::integer,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint board_recruitment_accent_hex check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint board_recruitment_term_rules check (
    term_length_years between 1 and 10 and
    max_consecutive_terms between 1 and 10 and
    max_years_of_service between 1 and 80 and
    upcoming_agm_year between 2000 and 2100 and
    survey_year between 2000 and 2100
  )
);

create table if not exists public.board_recruitment_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.board_recruitment_workspaces(id) on delete cascade,
  full_name text not null,
  role_title text not null default '',
  member_type text not null default 'director',
  office text not null default '',
  email text not null default '',
  date_joined date,
  active boolean not null default true,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint board_recruitment_member_type check (member_type in ('director', 'staff')),
  constraint board_recruitment_office check (office in ('', 'chair', 'vice', 'secretary', 'treasurer')),
  constraint board_recruitment_member_name check (char_length(trim(full_name)) between 1 and 160),
  constraint board_recruitment_member_email check (email = '' or email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

create table if not exists public.board_recruitment_skill_categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.board_recruitment_workspaces(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  unique (workspace_id, name)
);

create table if not exists public.board_recruitment_skills (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.board_recruitment_workspaces(id) on delete cascade,
  category_id uuid not null references public.board_recruitment_skill_categories(id) on delete cascade,
  name text not null,
  is_custom boolean not null default false,
  sort_order integer not null default 0,
  unique (workspace_id, name)
);

create table if not exists public.board_recruitment_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.board_recruitment_workspaces(id) on delete cascade,
  member_id uuid not null references public.board_recruitment_members(id) on delete cascade,
  survey_year integer not null,
  status text not null default 'pending',
  token_hash text unique,
  expires_at timestamptz not null default (now() + interval '7 days'),
  sent_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, member_id, survey_year),
  constraint board_recruitment_invitation_status check (status in ('pending', 'sent', 'responded')),
  constraint board_recruitment_invitation_expiry check (expires_at > created_at)
);

create table if not exists public.board_recruitment_responses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.board_recruitment_workspaces(id) on delete cascade,
  member_id uuid not null references public.board_recruitment_members(id) on delete cascade,
  skill_id uuid not null references public.board_recruitment_skills(id) on delete cascade,
  survey_year integer not null,
  has_skill boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (workspace_id, member_id, skill_id, survey_year)
);

create table if not exists public.board_recruitment_committees (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.board_recruitment_workspaces(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create table if not exists public.board_recruitment_committee_members (
  committee_id uuid not null references public.board_recruitment_committees(id) on delete cascade,
  member_id uuid not null references public.board_recruitment_members(id) on delete cascade,
  is_chair boolean not null default false,
  primary key (committee_id, member_id)
);

create unique index if not exists board_recruitment_one_chair
  on public.board_recruitment_committee_members (committee_id) where is_chair;

create index if not exists board_recruitment_members_workspace_idx on public.board_recruitment_members(workspace_id);
create index if not exists board_recruitment_skills_workspace_idx on public.board_recruitment_skills(workspace_id);
create index if not exists board_recruitment_responses_workspace_idx on public.board_recruitment_responses(workspace_id);
create index if not exists board_recruitment_invitations_token_idx on public.board_recruitment_invitations(token_hash) where token_hash is not null;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'board_recruitment_workspaces',
    'board_recruitment_members',
    'board_recruitment_skill_categories',
    'board_recruitment_skills',
    'board_recruitment_invitations',
    'board_recruitment_responses',
    'board_recruitment_committees',
    'board_recruitment_committee_members'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
  end loop;
end $$;

drop policy if exists board_recruitment_workspace_access on public.board_recruitment_workspaces;
create policy board_recruitment_workspace_access on public.board_recruitment_workspaces
  for all to authenticated
  using ((select private.is_org_member(organization_id)))
  with check ((select private.is_org_member(organization_id)));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'board_recruitment_members',
    'board_recruitment_skill_categories',
    'board_recruitment_skills',
    'board_recruitment_invitations',
    'board_recruitment_responses',
    'board_recruitment_committees'
  ] loop
    execute format('drop policy if exists board_recruitment_org_access on public.%I', table_name);
    execute format(
      'create policy board_recruitment_org_access on public.%I for all to authenticated using (exists (select 1 from public.board_recruitment_workspaces w where w.id = workspace_id and (select private.is_org_member(w.organization_id)))) with check (exists (select 1 from public.board_recruitment_workspaces w where w.id = workspace_id and (select private.is_org_member(w.organization_id))))',
      table_name
    );
  end loop;
end $$;

drop policy if exists board_recruitment_committee_members_access on public.board_recruitment_committee_members;
create policy board_recruitment_committee_members_access on public.board_recruitment_committee_members
  for all to authenticated
  using (exists (
    select 1 from public.board_recruitment_committees c
    join public.board_recruitment_workspaces w on w.id = c.workspace_id
    where c.id = committee_id and (select private.is_org_member(w.organization_id))
  ))
  with check (exists (
    select 1 from public.board_recruitment_committees c
    join public.board_recruitment_workspaces w on w.id = c.workspace_id
    where c.id = committee_id and (select private.is_org_member(w.organization_id))
  ));
