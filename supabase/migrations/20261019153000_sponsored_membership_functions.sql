-- One locked transaction creates both the funded placement and its manual
-- subscription. This prevents a paid subscription from being overwritten or
-- a sponsorship from allocating more boards than its signed package promises.
create function public.activate_sponsored_membership(
  p_sponsorship_id uuid,
  p_organization_id uuid,
  p_plan_id text,
  p_verified_budget_cents bigint,
  p_created_by uuid
) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_sponsorship public.sponsorships%rowtype;
  v_organization public.organizations%rowtype;
  v_target public.sponsorship_board_targets%rowtype;
  v_used integer;
  v_received bigint;
  v_allocated bigint;
  v_subscription_id uuid;
  v_placement_id uuid;
  v_started_at timestamptz := now();
begin
  select * into v_sponsorship from public.sponsorships
  where id = p_sponsorship_id for update;
  if not found or v_sponsorship.status <> 'active'
    or v_sponsorship.currency <> 'CAD'
    or current_date < v_sponsorship.starts_on
    or current_date > v_sponsorship.ends_on then
    raise exception 'Choose an active sponsorship within its agreed term.';
  end if;

  select * into v_target from public.sponsorship_board_targets
  where package_id = v_sponsorship.package_id and plan_id = p_plan_id;
  if not found then
    raise exception 'This package has no remaining target for the chosen membership.';
  end if;

  select count(*) into v_used from public.sponsored_memberships
  where sponsorship_id = p_sponsorship_id and plan_id = p_plan_id
    and status <> 'canceled';
  if v_used >= v_target.board_count then
    raise exception 'The funded board target for this plan has been reached.';
  end if;

  select coalesce(sum(amount_cents), 0) into v_received
  from public.sponsor_contributions
  where sponsorship_id = p_sponsorship_id and status = 'received'
    and currency = 'CAD';
  select coalesce(sum(allocation_cents), 0) into v_allocated
  from public.sponsored_memberships
  where sponsorship_id = p_sponsorship_id and status <> 'canceled';
  if v_received < v_allocated + v_target.allocation_cents then
    raise exception 'Record sufficient received sponsorship funds before placing another board.';
  end if;

  select * into v_organization from public.organizations
  where id = p_organization_id for update;
  if not found or v_organization.country_code <> 'CA'
    or v_organization.kind = 'other' then
    raise exception 'Choose an eligible Canadian nonprofit organization.';
  end if;
  if p_verified_budget_cents is null or p_verified_budget_cents <= 0 or
    not (
      (p_plan_id = 'seedling' and p_verified_budget_cents < 50000000) or
      (p_plan_id = 'roots' and p_verified_budget_cents between 50000000 and 200000000)
    ) then
    raise exception 'The verified annual budget must match the selected membership tier.';
  end if;

  if exists (
    select 1 from public.subscriptions
    where organization_id = p_organization_id
      and status in ('active', 'trialing')
  ) then
    raise exception 'This organization already has an active membership.';
  end if;

  insert into public.subscriptions (
    organization_id, plan_id, provider, billing_interval, status,
    current_period_start, current_period_end, metadata
  ) values (
    p_organization_id, p_plan_id, 'manual', 'year', 'active',
    v_started_at, v_started_at + interval '1 year',
    pg_catalog.jsonb_build_object(
      'funding_source', 'sponsorship',
      'sponsorship_id', p_sponsorship_id
    )
  ) returning id into v_subscription_id;

  insert into public.sponsored_memberships (
    sponsorship_id, organization_id, subscription_id, plan_id, verified_budget_cents,
    allocation_cents, starts_at, ends_at, created_by
  ) values (
    p_sponsorship_id, p_organization_id, v_subscription_id, p_plan_id, p_verified_budget_cents,
    v_target.allocation_cents, v_started_at,
    v_started_at + interval '1 year', p_created_by
  ) returning id into v_placement_id;

  insert into public.audit_logs (
    actor_user_id, organization_id, action, entity_type, entity_id,
    changes, metadata
  ) values (
    p_created_by, p_organization_id, 'sponsored_membership.activated',
    'sponsored_membership', v_placement_id::text,
    pg_catalog.jsonb_build_object(
      'plan_id', p_plan_id, 'verified_budget_cents', p_verified_budget_cents,
      'allocation_cents', v_target.allocation_cents,
      'starts_at', v_started_at, 'ends_at', v_started_at + interval '1 year'
    ),
    pg_catalog.jsonb_build_object('sponsorship_id', p_sponsorship_id)
  );

  return v_placement_id;
end;
$$;

create function public.expire_sponsored_memberships()
returns integer
language plpgsql
set search_path = ''
as $$
declare v_count integer;
begin
  update public.subscriptions as subscription
  set status = 'canceled', canceled_at = now(), updated_at = now()
  from public.sponsored_memberships as placement
  where placement.subscription_id = subscription.id
    and placement.status = 'active' and placement.ends_at <= now()
    and subscription.provider = 'manual' and subscription.status = 'active';

  update public.sponsored_memberships
  set status = 'completed', updated_at = now()
  where status = 'active' and ends_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.activate_sponsored_membership(uuid, uuid, text, bigint, uuid)
  from public, anon, authenticated;
revoke all on function public.expire_sponsored_memberships()
  from public, anon, authenticated;
grant execute on function public.activate_sponsored_membership(uuid, uuid, text, bigint, uuid)
  to service_role;
grant execute on function public.expire_sponsored_memberships() to service_role;
