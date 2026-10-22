-- Sponsor-funded memberships are separate from historical Olea Gives grants.
-- Only the service role may create placements or inspect their organization IDs.
create table public.sponsorship_board_targets (
  package_id text not null references public.sponsorship_packages(id),
  plan_id text not null references public.membership_plans(id),
  board_count integer not null check (board_count > 0),
  allocation_cents integer not null check (allocation_cents > 0),
  primary key (package_id, plan_id)
);

create table public.sponsored_memberships (
  id uuid primary key default gen_random_uuid(),
  sponsorship_id uuid not null references public.sponsorships(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscription_id uuid unique references public.subscriptions(id) on delete set null,
  plan_id text not null references public.membership_plans(id),
  verified_budget_cents bigint not null check (verified_budget_cents > 0),
  allocation_cents integer not null check (allocation_cents > 0),
  status text not null default 'active'
    check (status in ('active', 'completed', 'canceled')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create unique index sponsored_memberships_one_active_per_org
  on public.sponsored_memberships (organization_id)
  where status = 'active';
create index sponsored_memberships_sponsorship_idx
  on public.sponsored_memberships (sponsorship_id, status);
create index sponsored_memberships_expiry_idx
  on public.sponsored_memberships (ends_at)
  where status = 'active';

alter table public.sponsorship_board_targets enable row level security;
alter table public.sponsored_memberships enable row level security;

revoke all on public.sponsorship_board_targets from anon, authenticated;
revoke all on public.sponsored_memberships from anon, authenticated;
grant select on public.sponsorship_board_targets to service_role;
grant select, insert, update on public.sponsored_memberships to service_role;

comment on table public.sponsored_memberships is
  'One year of membership paid for through a sponsorship. Private placement details are never exposed to other sponsors.';

-- Forward rollback plan: revoke function grants in the following migration,
-- stop placements, then add a new migration to retire these tables after all
-- active sponsored memberships have ended. Do not delete active subscriptions.
