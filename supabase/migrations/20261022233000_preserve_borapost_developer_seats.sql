-- Keep BoraPost's current 24-seat capacity when moving from Harvest to
-- complimentary Canopy. The first grant migration is already applied in
-- development and is immutable; this follow-up adjusts only its seat item.
do $$
declare
  v_organization_id constant uuid := 'dd1269a9-0b82-4abc-9968-840689c52d86';
  v_legacy_subscription_id constant uuid := '18e76ce6-f5e1-4aa8-bfdd-7cf725a27585';
  v_grant_key constant text := 'borapost-developer-canopy-2026-10-22';
  v_grant_subscription_id uuid;
  v_previous_capacity integer;
  v_canopy_included_seats integer;
  v_extra_seats integer;
begin
  select id into v_grant_subscription_id
  from public.subscriptions
  where organization_id = v_organization_id
    and plan_id = 'canopy'
    and provider = 'manual'
    and status = 'active'
    and metadata->>'funding_source' = 'developer'
    and metadata->>'grant_key' = v_grant_key
  for update;

  if not found then
    return;
  end if;

  select plan.included_seats + coalesce(sum(item.quantity) filter (
    where item.item_type = 'seat' and item.active
  ), 0)::integer into v_previous_capacity
  from public.subscriptions as subscription
  join public.membership_plans as plan on plan.id = subscription.plan_id
  left join public.subscription_items as item on item.subscription_id = subscription.id
  where subscription.id = v_legacy_subscription_id
    and subscription.organization_id = v_organization_id
    and subscription.plan_id = 'harvest'
    and subscription.provider = 'stripe'
    and subscription.status = 'canceled'
  group by plan.included_seats;

  select included_seats into v_canopy_included_seats
  from public.membership_plans where id = 'canopy' and is_active;

  if v_previous_capacity is null or v_canopy_included_seats is null then
    raise exception 'BoraPost seat capacity check failed';
  end if;

  v_extra_seats := greatest(v_previous_capacity - v_canopy_included_seats, 0);

  if v_extra_seats > 0 then
    update public.subscription_items
    set quantity = v_extra_seats,
        unit_amount_cents = 0
    where subscription_id = v_grant_subscription_id
      and item_type = 'seat'
      and active;

    if not found then
      insert into public.subscription_items (
        subscription_id, item_type, quantity, unit_amount_cents, currency
      ) values (
        v_grant_subscription_id, 'seat', v_extra_seats, 0, 'CAD'
      );
    end if;
  end if;
end;
$$;
