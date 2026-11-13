-- Recovered from development Supabase schema_migrations on 2026-11-12.
create table public.ed_review_annual_general (
  cycle_id uuid primary key references public.ed_review_cycles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  revision integer not null default 1 check (revision > 0),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.ed_review_annual_compensation (
  cycle_id uuid primary key references public.ed_review_cycles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  revision integer not null default 1 check (revision > 0),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.ed_review_annual_access (
  cycle_id uuid not null references public.ed_review_cycles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('ed', 'admin', 'cfo', 'full')),
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (cycle_id, user_id)
);

create index ed_review_annual_access_org_idx on public.ed_review_annual_access (organization_id, user_id);

create or replace function private.validate_ed_review_annual_org()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.ed_review_cycles c
    where c.id = new.cycle_id and c.organization_id = new.organization_id) then
    raise exception 'ED review cycle and organization must match';
  end if;
  return new;
end;
$$;

create trigger ed_review_annual_general_org before insert or update on public.ed_review_annual_general
  for each row execute function private.validate_ed_review_annual_org();

create trigger ed_review_annual_comp_org before insert or update on public.ed_review_annual_compensation
  for each row execute function private.validate_ed_review_annual_org();

create trigger ed_review_annual_access_org before insert or update on public.ed_review_annual_access
  for each row execute function private.validate_ed_review_annual_org();

alter table public.ed_review_annual_general enable row level security;

alter table public.ed_review_annual_compensation enable row level security;

alter table public.ed_review_annual_access enable row level security;

revoke all on public.ed_review_annual_general, public.ed_review_annual_compensation,
  public.ed_review_annual_access from public, anon, authenticated;

grant select, insert, update, delete on public.ed_review_annual_general,
  public.ed_review_annual_compensation, public.ed_review_annual_access to service_role;

revoke all on function private.validate_ed_review_annual_org() from public;
