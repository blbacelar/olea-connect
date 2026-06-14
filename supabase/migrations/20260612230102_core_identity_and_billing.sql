create schema if not exists private;

revoke all on schema private from public;

create type public.organization_kind as enum (
  'nonprofit',
  'registered_charity',
  'society',
  'community_organization',
  'foundation',
  'other'
);

create type public.organization_member_role as enum ('owner', 'admin', 'member');
create type public.organization_member_status as enum ('invited', 'active', 'suspended');
create type public.platform_role as enum (
  'super_admin',
  'content_admin',
  'grants_admin',
  'community_admin',
  'finance_admin'
);
create type public.billing_interval as enum ('month', 'year');
create type public.subscription_status as enum (
  'incomplete',
  'trialing',
  'active',
  'past_due',
  'paused',
  'canceled',
  'unpaid'
);
create type public.billing_provider as enum ('stripe', 'shopify', 'manual');
create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_path text,
  locale text not null default 'en-CA',
  timezone text not null default 'America/Edmonton',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_length check (char_length(full_name) <= 160),
  constraint profiles_locale_length check (char_length(locale) between 2 and 20)
);

create table public.platform_user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.platform_role not null,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  slug text not null unique,
  kind public.organization_kind not null default 'nonprofit',
  registration_number text,
  charity_number text,
  country_code char(2) not null default 'CA',
  province_or_region text,
  website_url text,
  annual_revenue_cents bigint,
  cra_good_standing boolean,
  profile_completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_name_length check (char_length(name) between 1 and 180),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint organizations_annual_revenue_nonnegative check (
    annual_revenue_cents is null or annual_revenue_cents >= 0
  )
);

create table public.organization_brand_profiles (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  display_name text not null,
  logo_path text,
  primary_color text not null default '#1d3b2a',
  secondary_color text not null default '#d97757',
  brand_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_brand_primary_color_hex check (
    primary_color ~ '^#[0-9A-Fa-f]{6}$'
  ),
  constraint organization_brand_secondary_color_hex check (
    secondary_color ~ '^#[0-9A-Fa-f]{6}$'
  )
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_member_role not null default 'member',
  status public.organization_member_status not null default 'active',
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.membership_plans (
  id text primary key,
  name text not null,
  description text not null,
  monthly_price_cents integer not null,
  annual_price_cents integer not null,
  currency char(3) not null default 'CAD',
  included_seats integer not null,
  template_selection_limit integer,
  sort_order integer not null,
  is_active boolean not null default true,
  features jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint membership_plans_id_format check (id ~ '^[a-z0-9_]+$'),
  constraint membership_plans_prices_nonnegative check (
    monthly_price_cents >= 0 and annual_price_cents >= 0
  ),
  constraint membership_plans_seats_positive check (included_seats > 0),
  constraint membership_plans_selection_limit_positive check (
    template_selection_limit is null or template_selection_limit > 0
  ),
  constraint membership_plans_features_array check (jsonb_typeof(features) = 'array')
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan_id text not null references public.membership_plans(id),
  provider public.billing_provider not null default 'stripe',
  provider_customer_id text,
  provider_subscription_id text,
  billing_interval public.billing_interval not null,
  status public.subscription_status not null default 'incomplete',
  quantity integer not null default 1,
  current_period_start timestamptz,
  current_period_end timestamptz,
  pause_starts_at timestamptz,
  pause_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_quantity_positive check (quantity > 0),
  constraint subscriptions_pause_window check (
    pause_ends_at is null
    or pause_starts_at is null
    or pause_ends_at >= pause_starts_at
  ),
  constraint subscriptions_period_window check (
    current_period_end is null
    or current_period_start is null
    or current_period_end >= current_period_start
  )
);

create table public.subscription_items (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  item_type text not null,
  provider_item_id text,
  quantity integer not null default 1,
  unit_amount_cents integer not null,
  currency char(3) not null default 'CAD',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_items_type_format check (item_type ~ '^[a-z0-9_]+$'),
  constraint subscription_items_quantity_positive check (quantity > 0),
  constraint subscription_items_amount_nonnegative check (unit_amount_cents >= 0)
);

create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.organization_member_role not null default 'member',
  status public.invitation_status not null default 'pending',
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_invitations_email_normalized check (email = lower(trim(email))),
  constraint organization_invitations_expiry_after_creation check (expires_at > created_at)
);

create table public.organization_integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  external_id text,
  status text not null default 'active',
  settings jsonb not null default '{}'::jsonb,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider),
  constraint organization_integrations_provider_format check (provider ~ '^[a-z0-9_]+$')
);

create unique index subscriptions_provider_subscription_id_key
  on public.subscriptions(provider, provider_subscription_id)
  where provider_subscription_id is not null;
create index subscriptions_organization_id_idx on public.subscriptions(organization_id);
create index subscriptions_plan_id_idx on public.subscriptions(plan_id);
create index subscriptions_status_idx on public.subscriptions(status);
create index subscription_items_subscription_id_idx on public.subscription_items(subscription_id);
create index organization_members_user_id_idx on public.organization_members(user_id);
create index organization_members_invited_by_idx on public.organization_members(invited_by);
create index organization_members_active_org_idx
  on public.organization_members(organization_id, role)
  where status = 'active';
create index organizations_created_by_idx on public.organizations(created_by);
create index organization_invitations_organization_id_idx
  on public.organization_invitations(organization_id);
create index organization_invitations_invited_by_idx
  on public.organization_invitations(invited_by);
create index organization_invitations_accepted_by_idx
  on public.organization_invitations(accepted_by);
create index organization_invitations_pending_email_idx
  on public.organization_invitations(email)
  where status = 'pending';
create index organization_integrations_organization_id_idx
  on public.organization_integrations(organization_id);
create index platform_user_roles_role_idx on public.platform_user_roles(role);
create index platform_user_roles_granted_by_idx on public.platform_user_roles(granted_by);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function private.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members memberships
    where memberships.organization_id = target_organization_id
      and memberships.user_id = (select auth.uid())
      and memberships.status = 'active'
  );
$$;

create or replace function private.has_org_role(
  target_organization_id uuid,
  allowed_roles public.organization_member_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members memberships
    where memberships.organization_id = target_organization_id
      and memberships.user_id = (select auth.uid())
      and memberships.status = 'active'
      and memberships.role = any(allowed_roles)
  );
$$;

create or replace function private.is_platform_admin(
  allowed_roles public.platform_role[] default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.platform_user_roles roles
    where roles.user_id = (select auth.uid())
      and (allowed_roles is null or roles.role = any(allowed_roles))
  );
$$;

revoke all on all functions in schema private from public;
grant usage on schema private to authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.has_org_role(uuid, public.organization_member_role[]) to authenticated;
grant execute on function private.is_platform_admin(public.platform_role[]) to authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function private.set_updated_at();
create trigger organization_brand_profiles_set_updated_at
  before update on public.organization_brand_profiles
  for each row execute function private.set_updated_at();
create trigger organization_members_set_updated_at
  before update on public.organization_members
  for each row execute function private.set_updated_at();
create trigger membership_plans_set_updated_at
  before update on public.membership_plans
  for each row execute function private.set_updated_at();
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function private.set_updated_at();
create trigger subscription_items_set_updated_at
  before update on public.subscription_items
  for each row execute function private.set_updated_at();
create trigger organization_invitations_set_updated_at
  before update on public.organization_invitations
  for each row execute function private.set_updated_at();
create trigger organization_integrations_set_updated_at
  before update on public.organization_integrations
  for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;
alter table public.platform_user_roles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_brand_profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.membership_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_items enable row level security;
alter table public.organization_invitations enable row level security;
alter table public.organization_integrations enable row level security;

create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "platform_roles_select_admin"
  on public.platform_user_roles for select to authenticated
  using ((select private.is_platform_admin(null)));

create policy "organizations_select_member"
  on public.organizations for select to authenticated
  using ((select private.is_org_member(id)) or (select private.is_platform_admin(null)));
create policy "organizations_update_admin"
  on public.organizations for update to authenticated
  using (
    (select private.has_org_role(
      id,
      array['owner', 'admin']::public.organization_member_role[]
    ))
    or (select private.is_platform_admin(null))
  )
  with check (
    (select private.has_org_role(
      id,
      array['owner', 'admin']::public.organization_member_role[]
    ))
    or (select private.is_platform_admin(null))
  );

create policy "brand_profiles_select_member"
  on public.organization_brand_profiles for select to authenticated
  using (
    (select private.is_org_member(organization_id))
    or (select private.is_platform_admin(null))
  );
create policy "brand_profiles_insert_admin"
  on public.organization_brand_profiles for insert to authenticated
  with check (
    (select private.has_org_role(
      organization_id,
      array['owner', 'admin']::public.organization_member_role[]
    ))
    or (select private.is_platform_admin(null))
  );
create policy "brand_profiles_update_admin"
  on public.organization_brand_profiles for update to authenticated
  using (
    (select private.has_org_role(
      organization_id,
      array['owner', 'admin']::public.organization_member_role[]
    ))
    or (select private.is_platform_admin(null))
  )
  with check (
    (select private.has_org_role(
      organization_id,
      array['owner', 'admin']::public.organization_member_role[]
    ))
    or (select private.is_platform_admin(null))
  );

create policy "organization_members_select_org"
  on public.organization_members for select to authenticated
  using (
    (select private.is_org_member(organization_id))
    or (select private.is_platform_admin(null))
  );
create policy "organization_members_insert_admin"
  on public.organization_members for insert to authenticated
  with check (
    (select private.has_org_role(
      organization_id,
      array['owner', 'admin']::public.organization_member_role[]
    ))
    or (select private.is_platform_admin(null))
  );
create policy "organization_members_update_admin"
  on public.organization_members for update to authenticated
  using (
    (select private.has_org_role(
      organization_id,
      array['owner', 'admin']::public.organization_member_role[]
    ))
    or (select private.is_platform_admin(null))
  )
  with check (
    (select private.has_org_role(
      organization_id,
      array['owner', 'admin']::public.organization_member_role[]
    ))
    or (select private.is_platform_admin(null))
  );
create policy "organization_members_delete_admin"
  on public.organization_members for delete to authenticated
  using (
    (select private.has_org_role(
      organization_id,
      array['owner', 'admin']::public.organization_member_role[]
    ))
    or (select private.is_platform_admin(null))
  );

create policy "membership_plans_read"
  on public.membership_plans for select
  to anon, authenticated
  using (is_active);

create policy "subscriptions_select_member"
  on public.subscriptions for select to authenticated
  using (
    (select private.is_org_member(organization_id))
    or (select private.is_platform_admin(null))
  );
create policy "subscription_items_select_member"
  on public.subscription_items for select to authenticated
  using (
    exists (
      select 1
      from public.subscriptions subscriptions
      where subscriptions.id = subscription_id
        and (
          (select private.is_org_member(subscriptions.organization_id))
          or (select private.is_platform_admin(null))
        )
    )
  );

create policy "organization_invitations_select_admin"
  on public.organization_invitations for select to authenticated
  using (
    (select private.has_org_role(
      organization_id,
      array['owner', 'admin']::public.organization_member_role[]
    ))
    or (select private.is_platform_admin(null))
  );
create policy "organization_invitations_insert_admin"
  on public.organization_invitations for insert to authenticated
  with check (
    invited_by = (select auth.uid())
    and (
      (select private.has_org_role(
        organization_id,
        array['owner', 'admin']::public.organization_member_role[]
      ))
      or (select private.is_platform_admin(null))
    )
  );
create policy "organization_invitations_update_admin"
  on public.organization_invitations for update to authenticated
  using (
    (select private.has_org_role(
      organization_id,
      array['owner', 'admin']::public.organization_member_role[]
    ))
    or (select private.is_platform_admin(null))
  )
  with check (
    (select private.has_org_role(
      organization_id,
      array['owner', 'admin']::public.organization_member_role[]
    ))
    or (select private.is_platform_admin(null))
  );

create policy "organization_integrations_select_admin"
  on public.organization_integrations for select to authenticated
  using (
    (select private.has_org_role(
      organization_id,
      array['owner', 'admin']::public.organization_member_role[]
    ))
    or (select private.is_platform_admin(null))
  );

grant select, update on public.profiles to authenticated;
grant select, update on public.organizations to authenticated;
grant select, insert, update on public.organization_brand_profiles to authenticated;
grant select, insert, update, delete on public.organization_members to authenticated;
grant select on public.membership_plans to anon, authenticated;
grant select on public.subscriptions, public.subscription_items to authenticated;
grant select, insert, update on public.organization_invitations to authenticated;
grant select on public.organization_integrations to authenticated;
