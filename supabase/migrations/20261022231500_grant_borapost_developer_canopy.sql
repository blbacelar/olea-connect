-- Give the BoraPost developer workspace a complimentary Canopy subscription.
-- The historical Harvest checkout was in Stripe test mode; preserve its
-- provider references for audit while retiring it from active entitlements.
-- This migration is intentionally a no-op outside the identified production
-- workspace. If that workspace exists but differs from the verified snapshot,
-- stop instead of changing an unrelated customer's billing record.
do $$
declare
  v_user_id constant uuid := '53f3a630-db9d-431f-bf22-48a83683415e';
  v_organization_id constant uuid := 'dd1269a9-0b82-4abc-9968-840689c52d86';
  v_legacy_subscription_id constant uuid := '18e76ce6-f5e1-4aa8-bfdd-7cf725a27585';
  v_grant_key constant text := 'borapost-developer-canopy-2026-10-22';
  v_legacy public.subscriptions%rowtype;
  v_new_subscription_id uuid;
  v_seat_quantity integer;
begin
  if not exists (select 1 from auth.users where id = v_user_id) then
    return;
  end if;

  if not exists (
    select 1
    from auth.users as user_record
    join public.organization_members as member
      on member.user_id = user_record.id
    join public.organizations as organization
      on organization.id = member.organization_id
    where user_record.id = v_user_id
      and lower(user_record.email) = 'bruno@oleaconnects.com'
      and member.organization_id = v_organization_id
      and member.role = 'owner'
      and member.status = 'active'
      and organization.name = 'BoraPost'
  ) then
    raise exception 'BoraPost developer grant identity check failed';
  end if;

  if exists (
    select 1 from public.subscriptions
    where organization_id = v_organization_id
      and metadata->>'grant_key' = v_grant_key
  ) then
    return;
  end if;

  select * into v_legacy
  from public.subscriptions
  where id = v_legacy_subscription_id
  for update;

  if not found
    or v_legacy.organization_id <> v_organization_id
    or v_legacy.plan_id <> 'harvest'
    or v_legacy.provider <> 'stripe'
    or v_legacy.status <> 'active'
    or coalesce(v_legacy.metadata->>'checkout_session_id', '') not like 'cs_test_%'
  then
    raise exception 'BoraPost legacy test subscription check failed';
  end if;

  if exists (
    select 1 from public.subscriptions
    where organization_id = v_organization_id
      and id <> v_legacy_subscription_id
      and status in ('active', 'trialing')
  ) then
    raise exception 'BoraPost has another active subscription';
  end if;

  if not exists (
    select 1 from public.membership_plans
    where id = 'canopy' and is_active
  ) then
    raise exception 'Canopy is not an active plan';
  end if;

  select coalesce(sum(quantity), 0)::integer into v_seat_quantity
  from public.subscription_items
  where subscription_id = v_legacy_subscription_id
    and item_type = 'seat'
    and active;

  update public.subscriptions
  set status = 'canceled',
      canceled_at = now(),
      cancel_at_period_end = false,
      metadata = metadata || jsonb_build_object(
        'superseded_by_internal_grant', v_grant_key
      )
  where id = v_legacy_subscription_id;

  insert into public.subscriptions (
    organization_id, plan_id, provider, billing_interval, status,
    quantity, current_period_start, metadata
  ) values (
    v_organization_id, 'canopy', 'manual', 'year', 'active',
    1, now(), jsonb_build_object(
      'funding_source', 'developer',
      'grant_key', v_grant_key,
      'granted_to_user_id', v_user_id,
      'replaces_test_subscription_id', v_legacy_subscription_id,
      'reason', 'User-requested developer access; no payment due'
    )
  ) returning id into v_new_subscription_id;

  insert into public.subscription_items (
    subscription_id, item_type, quantity, unit_amount_cents, currency
  ) values (
    v_new_subscription_id, 'membership', 1, 0, 'CAD'
  );

  if v_seat_quantity > 0 then
    insert into public.subscription_items (
      subscription_id, item_type, quantity, unit_amount_cents, currency
    ) values (
      v_new_subscription_id, 'seat', v_seat_quantity, 0, 'CAD'
    );
  end if;
end;
$$;
