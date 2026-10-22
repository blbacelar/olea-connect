-- Preserve the signed sponsorship terms when administrators edit receipts or
-- create overlapping exclusive agreements. The advisory lock serializes terms
-- for one normalized industry category, including concurrent inserts.
create function private.guard_sponsorship_exclusivity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_exclusive boolean;
  v_category text;
begin
  if new.status <> 'active' then
    return new;
  end if;

  select category_exclusivity into v_exclusive
  from public.sponsorship_packages
  where id = new.package_id;
  v_category := pg_catalog.lower(pg_catalog.btrim(new.category_exclusivity));
  if v_category is null or v_category = '' then
    if coalesce(v_exclusive, false) then
      raise exception 'An exclusive sponsorship requires an industry category.';
    end if;
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(82616182, pg_catalog.hashtext(v_category));
  if exists (
    select 1 from public.sponsorships as other
    join public.sponsorship_packages as other_package
      on other_package.id = other.package_id
    where other.id is distinct from new.id
      and other.status = 'active'
      and pg_catalog.lower(pg_catalog.btrim(other.category_exclusivity)) = v_category
      and other.starts_on <= new.ends_on
      and other.ends_on >= new.starts_on
      and (v_exclusive or other_package.category_exclusivity)
  ) then
    raise exception 'Another active sponsor already has this category during the chosen dates.';
  end if;
  return new;
end;
$$;

create trigger sponsorships_guard_exclusivity
before insert or update of package_id, status, starts_on, ends_on, category_exclusivity
on public.sponsorships
for each row execute function private.guard_sponsorship_exclusivity();

-- Allocations are defined by the package agreed when the board was placed.
-- Changing it later would silently rewrite historical targets and capacity.
create function private.guard_sponsorship_package_after_placement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.package_id is distinct from old.package_id and exists (
    select 1 from public.sponsored_memberships
    where sponsorship_id = old.id and status <> 'canceled'
  ) then
    raise exception 'Sponsorship package cannot change after funded boards are placed.';
  end if;
  return new;
end;
$$;

create trigger sponsorships_guard_package_after_placement
before update of package_id on public.sponsorships
for each row execute function private.guard_sponsorship_package_after_placement();

-- An existing funded year may not be left with less received CAD than the
-- total already allocated. Locking the sponsorship row matches the activation
-- RPC's lock order and serializes concurrent receipt reductions.
create function private.guard_funded_contribution_reduction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_received bigint;
  v_allocated bigint;
begin
  if old.status <> 'received' or old.currency <> 'CAD' then
    return null;
  end if;
  if tg_op = 'UPDATE'
    and old.sponsorship_id = new.sponsorship_id
    and new.status = 'received' and new.currency = 'CAD'
    and new.amount_cents >= old.amount_cents then
    return null;
  end if;

  perform 1 from public.sponsorships
  where id = old.sponsorship_id for update;
  select coalesce(sum(amount_cents), 0) into v_received
  from public.sponsor_contributions
  where sponsorship_id = old.sponsorship_id
    and status = 'received' and currency = 'CAD';
  select coalesce(sum(allocation_cents), 0) into v_allocated
  from public.sponsored_memberships
  where sponsorship_id = old.sponsorship_id and status <> 'canceled';
  if v_received < v_allocated then
    raise exception 'Received CAD funds cannot fall below allocated sponsored memberships.';
  end if;
  return null;
end;
$$;

create trigger sponsor_contributions_guard_funded_reduction
after update of sponsorship_id, status, currency, amount_cents or delete
on public.sponsor_contributions
for each row execute function private.guard_funded_contribution_reduction();

-- RLS must stop a sponsored membership at its one-year end even if the daily
-- expiration job has not run. Other payment providers keep their prior rules.
create or replace function public.has_current_subscription()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members as membership
    join public.subscriptions as subscription
      on subscription.organization_id = membership.organization_id
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and subscription.status in ('trialing', 'active')
      and (
        not exists (
          select 1 from public.sponsored_memberships as placement
          where placement.subscription_id = subscription.id
        )
        or (
          subscription.current_period_end > now()
          and exists (
            select 1 from public.sponsored_memberships as placement
            where placement.subscription_id = subscription.id
              and placement.status = 'active'
              and placement.ends_at > now()
          )
        )
      )
  )
  or exists (
    select 1 from public.platform_user_roles as role
    where role.user_id = (select auth.uid())
  );
$$;

revoke all on function public.has_current_subscription() from public, anon;
grant execute on function public.has_current_subscription() to authenticated, service_role;
