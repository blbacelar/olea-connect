create type public.kpi_rag_status as enum ('green', 'amber', 'red', 'na');
create type public.kpi_milestone_status as enum ('not_started', 'in_progress', 'complete', 'at_risk');

create table public.kpi_dashboards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null default 'KPI Dashboard and Board Reporting',
  organization_name text not null default '',
  reporting_year integer not null default extract(year from now())::integer,
  financial_year_end date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id),
  constraint kpi_dashboards_title_length check (char_length(trim(title)) between 3 and 140),
  constraint kpi_dashboards_org_name_length check (char_length(organization_name) <= 140),
  constraint kpi_dashboards_reporting_year_range check (reporting_year between 2000 and 2100)
);

create table public.kpi_quarter_settings (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.kpi_dashboards(id) on delete cascade,
  quarter smallint not null,
  month_number smallint not null,
  sort_order smallint not null,
  created_at timestamptz not null default now(),
  unique (dashboard_id, quarter, month_number),
  unique (dashboard_id, month_number),
  constraint kpi_quarter_settings_quarter_range check (quarter between 1 and 4),
  constraint kpi_quarter_settings_month_range check (month_number between 1 and 12),
  constraint kpi_quarter_settings_sort_range check (sort_order between 1 and 12)
);

create table public.kpi_definitions (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.kpi_dashboards(id) on delete cascade,
  domain text not null,
  name text not null,
  owner text not null default '',
  target_display text not null,
  target_number numeric(14, 2) not null,
  baseline_number numeric(14, 2),
  outcome_area text not null default '',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kpi_definitions_domain_length check (char_length(trim(domain)) between 2 and 80),
  constraint kpi_definitions_name_length check (char_length(trim(name)) between 2 and 140),
  constraint kpi_definitions_owner_length check (char_length(owner) <= 100),
  constraint kpi_definitions_target_display_length check (char_length(trim(target_display)) between 1 and 60),
  constraint kpi_definitions_target_number_positive check (target_number >= 0),
  constraint kpi_definitions_baseline_number_positive check (baseline_number is null or baseline_number >= 0),
  constraint kpi_definitions_outcome_area_length check (char_length(outcome_area) <= 120)
);

create table public.kpi_quarter_results (
  id uuid primary key default gen_random_uuid(),
  kpi_id uuid not null references public.kpi_definitions(id) on delete cascade,
  quarter smallint not null,
  current_value numeric(14, 2),
  rag_status public.kpi_rag_status not null default 'na',
  context_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kpi_id, quarter),
  constraint kpi_quarter_results_quarter_range check (quarter between 1 and 4),
  constraint kpi_quarter_results_current_value_positive check (current_value is null or current_value >= 0),
  constraint kpi_quarter_results_notes_length check (char_length(context_notes) <= 1200)
);

create table public.kpi_board_assessments (
  id uuid primary key default gen_random_uuid(),
  kpi_id uuid not null references public.kpi_definitions(id) on delete cascade,
  full_year_rag public.kpi_rag_status not null default 'na',
  board_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kpi_id),
  constraint kpi_board_assessments_notes_length check (char_length(board_notes) <= 1200)
);

create table public.kpi_milestones (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.kpi_dashboards(id) on delete cascade,
  title text not null,
  owner text not null default '',
  due_date date,
  status public.kpi_milestone_status not null default 'not_started',
  notes text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kpi_milestones_title_length check (char_length(trim(title)) between 2 and 160),
  constraint kpi_milestones_owner_length check (char_length(owner) <= 100),
  constraint kpi_milestones_notes_length check (char_length(notes) <= 1200)
);

create table public.kpi_risks (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.kpi_dashboards(id) on delete cascade,
  area text not null,
  description text not null,
  mitigation text not null default '',
  owner text not null default '',
  rag_status public.kpi_rag_status not null default 'na',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kpi_risks_area_length check (char_length(trim(area)) between 2 and 100),
  constraint kpi_risks_description_length check (char_length(trim(description)) between 3 and 600),
  constraint kpi_risks_mitigation_length check (char_length(mitigation) <= 1200),
  constraint kpi_risks_owner_length check (char_length(owner) <= 100)
);

create table public.kpi_annual_summaries (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.kpi_dashboards(id) on delete cascade,
  overview text not null default '',
  achievements text not null default '',
  challenges text not null default '',
  stakeholder_story text not null default '',
  financial_context text not null default '',
  risk_response text not null default '',
  next_steps text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dashboard_id),
  constraint kpi_annual_summaries_overview_length check (char_length(overview) <= 2000),
  constraint kpi_annual_summaries_achievements_length check (char_length(achievements) <= 2000),
  constraint kpi_annual_summaries_challenges_length check (char_length(challenges) <= 2000),
  constraint kpi_annual_summaries_story_length check (char_length(stakeholder_story) <= 2000),
  constraint kpi_annual_summaries_financial_length check (char_length(financial_context) <= 2000),
  constraint kpi_annual_summaries_risk_length check (char_length(risk_response) <= 2000),
  constraint kpi_annual_summaries_next_steps_length check (char_length(next_steps) <= 2000)
);

create index kpi_dashboards_org_idx on public.kpi_dashboards(organization_id);
create index kpi_definitions_dashboard_idx on public.kpi_definitions(dashboard_id, active, sort_order);
create index kpi_quarter_results_kpi_idx on public.kpi_quarter_results(kpi_id, quarter);
create index kpi_milestones_dashboard_idx on public.kpi_milestones(dashboard_id, due_date);
create index kpi_risks_dashboard_idx on public.kpi_risks(dashboard_id, rag_status);

create trigger kpi_dashboards_set_updated_at
  before update on public.kpi_dashboards
  for each row execute function private.set_updated_at();

create trigger kpi_definitions_set_updated_at
  before update on public.kpi_definitions
  for each row execute function private.set_updated_at();

create trigger kpi_quarter_results_set_updated_at
  before update on public.kpi_quarter_results
  for each row execute function private.set_updated_at();

create trigger kpi_board_assessments_set_updated_at
  before update on public.kpi_board_assessments
  for each row execute function private.set_updated_at();

create trigger kpi_milestones_set_updated_at
  before update on public.kpi_milestones
  for each row execute function private.set_updated_at();

create trigger kpi_risks_set_updated_at
  before update on public.kpi_risks
  for each row execute function private.set_updated_at();

create trigger kpi_annual_summaries_set_updated_at
  before update on public.kpi_annual_summaries
  for each row execute function private.set_updated_at();

alter table public.kpi_dashboards enable row level security;
alter table public.kpi_quarter_settings enable row level security;
alter table public.kpi_definitions enable row level security;
alter table public.kpi_quarter_results enable row level security;
alter table public.kpi_board_assessments enable row level security;
alter table public.kpi_milestones enable row level security;
alter table public.kpi_risks enable row level security;
alter table public.kpi_annual_summaries enable row level security;

create policy "kpi_dashboards_select_org"
  on public.kpi_dashboards for select to authenticated
  using ((select private.is_org_member(organization_id)) or (select private.is_platform_admin(null)));

create policy "kpi_dashboards_insert_org"
  on public.kpi_dashboards for insert to authenticated
  with check ((select private.is_org_member(organization_id)) or (select private.is_platform_admin(null)));

create policy "kpi_dashboards_update_org"
  on public.kpi_dashboards for update to authenticated
  using ((select private.is_org_member(organization_id)) or (select private.is_platform_admin(null)))
  with check ((select private.is_org_member(organization_id)) or (select private.is_platform_admin(null)));

create policy "kpi_dashboards_delete_admin"
  on public.kpi_dashboards for delete to authenticated
  using (
    (select private.has_org_role(organization_id, array['owner', 'admin']::public.organization_member_role[]))
    or (select private.is_platform_admin(null))
  );

create policy "kpi_quarter_settings_select_org"
  on public.kpi_quarter_settings for select to authenticated
  using (
    exists (
      select 1 from public.kpi_dashboards dashboards
      where dashboards.id = dashboard_id
        and ((select private.is_org_member(dashboards.organization_id)) or (select private.is_platform_admin(null)))
    )
  );

create policy "kpi_quarter_settings_write_org"
  on public.kpi_quarter_settings for all to authenticated
  using (
    exists (
      select 1 from public.kpi_dashboards dashboards
      where dashboards.id = dashboard_id
        and ((select private.is_org_member(dashboards.organization_id)) or (select private.is_platform_admin(null)))
    )
  )
  with check (
    exists (
      select 1 from public.kpi_dashboards dashboards
      where dashboards.id = dashboard_id
        and ((select private.is_org_member(dashboards.organization_id)) or (select private.is_platform_admin(null)))
    )
  );

create policy "kpi_definitions_select_org"
  on public.kpi_definitions for select to authenticated
  using (
    exists (
      select 1 from public.kpi_dashboards dashboards
      where dashboards.id = dashboard_id
        and ((select private.is_org_member(dashboards.organization_id)) or (select private.is_platform_admin(null)))
    )
  );

create policy "kpi_definitions_write_org"
  on public.kpi_definitions for all to authenticated
  using (
    exists (
      select 1 from public.kpi_dashboards dashboards
      where dashboards.id = dashboard_id
        and ((select private.is_org_member(dashboards.organization_id)) or (select private.is_platform_admin(null)))
    )
  )
  with check (
    exists (
      select 1 from public.kpi_dashboards dashboards
      where dashboards.id = dashboard_id
        and ((select private.is_org_member(dashboards.organization_id)) or (select private.is_platform_admin(null)))
    )
  );

create policy "kpi_quarter_results_select_org"
  on public.kpi_quarter_results for select to authenticated
  using (
    exists (
      select 1
      from public.kpi_definitions definitions
      join public.kpi_dashboards dashboards on dashboards.id = definitions.dashboard_id
      where definitions.id = kpi_id
        and ((select private.is_org_member(dashboards.organization_id)) or (select private.is_platform_admin(null)))
    )
  );

create policy "kpi_quarter_results_write_org"
  on public.kpi_quarter_results for all to authenticated
  using (
    exists (
      select 1
      from public.kpi_definitions definitions
      join public.kpi_dashboards dashboards on dashboards.id = definitions.dashboard_id
      where definitions.id = kpi_id
        and ((select private.is_org_member(dashboards.organization_id)) or (select private.is_platform_admin(null)))
    )
  )
  with check (
    exists (
      select 1
      from public.kpi_definitions definitions
      join public.kpi_dashboards dashboards on dashboards.id = definitions.dashboard_id
      where definitions.id = kpi_id
        and ((select private.is_org_member(dashboards.organization_id)) or (select private.is_platform_admin(null)))
    )
  );

create policy "kpi_board_assessments_select_org"
  on public.kpi_board_assessments for select to authenticated
  using (
    exists (
      select 1
      from public.kpi_definitions definitions
      join public.kpi_dashboards dashboards on dashboards.id = definitions.dashboard_id
      where definitions.id = kpi_id
        and ((select private.is_org_member(dashboards.organization_id)) or (select private.is_platform_admin(null)))
    )
  );

create policy "kpi_board_assessments_write_org"
  on public.kpi_board_assessments for all to authenticated
  using (
    exists (
      select 1
      from public.kpi_definitions definitions
      join public.kpi_dashboards dashboards on dashboards.id = definitions.dashboard_id
      where definitions.id = kpi_id
        and ((select private.is_org_member(dashboards.organization_id)) or (select private.is_platform_admin(null)))
    )
  )
  with check (
    exists (
      select 1
      from public.kpi_definitions definitions
      join public.kpi_dashboards dashboards on dashboards.id = definitions.dashboard_id
      where definitions.id = kpi_id
        and ((select private.is_org_member(dashboards.organization_id)) or (select private.is_platform_admin(null)))
    )
  );

create policy "kpi_milestones_select_org"
  on public.kpi_milestones for select to authenticated
  using (
    exists (
      select 1 from public.kpi_dashboards dashboards
      where dashboards.id = dashboard_id
        and ((select private.is_org_member(dashboards.organization_id)) or (select private.is_platform_admin(null)))
    )
  );

create policy "kpi_milestones_write_org"
  on public.kpi_milestones for all to authenticated
  using (
    exists (
      select 1 from public.kpi_dashboards dashboards
      where dashboards.id = dashboard_id
        and ((select private.is_org_member(dashboards.organization_id)) or (select private.is_platform_admin(null)))
    )
  )
  with check (
    exists (
      select 1 from public.kpi_dashboards dashboards
      where dashboards.id = dashboard_id
        and ((select private.is_org_member(dashboards.organization_id)) or (select private.is_platform_admin(null)))
    )
  );

create policy "kpi_risks_select_org"
  on public.kpi_risks for select to authenticated
  using (
    exists (
      select 1 from public.kpi_dashboards dashboards
      where dashboards.id = dashboard_id
        and ((select private.is_org_member(dashboards.organization_id)) or (select private.is_platform_admin(null)))
    )
  );

create policy "kpi_risks_write_org"
  on public.kpi_risks for all to authenticated
  using (
    exists (
      select 1 from public.kpi_dashboards dashboards
      where dashboards.id = dashboard_id
        and ((select private.is_org_member(dashboards.organization_id)) or (select private.is_platform_admin(null)))
    )
  )
  with check (
    exists (
      select 1 from public.kpi_dashboards dashboards
      where dashboards.id = dashboard_id
        and ((select private.is_org_member(dashboards.organization_id)) or (select private.is_platform_admin(null)))
    )
  );

create policy "kpi_annual_summaries_select_org"
  on public.kpi_annual_summaries for select to authenticated
  using (
    exists (
      select 1 from public.kpi_dashboards dashboards
      where dashboards.id = dashboard_id
        and ((select private.is_org_member(dashboards.organization_id)) or (select private.is_platform_admin(null)))
    )
  );

create policy "kpi_annual_summaries_write_org"
  on public.kpi_annual_summaries for all to authenticated
  using (
    exists (
      select 1 from public.kpi_dashboards dashboards
      where dashboards.id = dashboard_id
        and ((select private.is_org_member(dashboards.organization_id)) or (select private.is_platform_admin(null)))
    )
  )
  with check (
    exists (
      select 1 from public.kpi_dashboards dashboards
      where dashboards.id = dashboard_id
        and ((select private.is_org_member(dashboards.organization_id)) or (select private.is_platform_admin(null)))
    )
  );

grant select, insert, update, delete on public.kpi_dashboards to authenticated;
grant select, insert, update, delete on public.kpi_quarter_settings to authenticated;
grant select, insert, update, delete on public.kpi_definitions to authenticated;
grant select, insert, update, delete on public.kpi_quarter_results to authenticated;
grant select, insert, update, delete on public.kpi_board_assessments to authenticated;
grant select, insert, update, delete on public.kpi_milestones to authenticated;
grant select, insert, update, delete on public.kpi_risks to authenticated;
grant select, insert, update, delete on public.kpi_annual_summaries to authenticated;
