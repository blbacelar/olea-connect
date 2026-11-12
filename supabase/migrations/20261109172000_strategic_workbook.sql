-- Recovered from development Supabase schema_migrations on 2026-11-12.
-- Workbook state is revisioned so concurrent editors cannot silently overwrite one another.
create table public.strategic_workbooks (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  revision integer not null default 1 check (revision > 0),
  state jsonb not null default '{}'::jsonb check (jsonb_typeof(state) = 'object'),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.strategic_workbook_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_revision integer not null check (source_revision > 0),
  title text not null check (char_length(trim(title)) between 3 and 160),
  summary jsonb not null check (jsonb_typeof(summary) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index strategic_workbook_snapshots_org_idx
  on public.strategic_workbook_snapshots (organization_id, created_at desc);

alter table public.strategic_workbooks enable row level security;

alter table public.strategic_workbook_snapshots enable row level security;

revoke all on public.strategic_workbooks,
  public.strategic_workbook_snapshots from public, anon, authenticated;

grant select, insert, update, delete on public.strategic_workbooks,
  public.strategic_workbook_snapshots to service_role;
