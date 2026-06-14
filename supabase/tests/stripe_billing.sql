begin;

do $$
declare
  claimed boolean;
  attempt_count integer;
begin
  select public.claim_stripe_webhook(
    'evt_billing_test',
    'customer.subscription.updated',
    '{"id":"evt_billing_test"}'::jsonb
  )
  into claimed;

  if claimed is not true then
    raise exception 'The first webhook claim must succeed';
  end if;

  select public.claim_stripe_webhook(
    'evt_billing_test',
    'customer.subscription.updated',
    '{"id":"evt_billing_test"}'::jsonb
  )
  into claimed;

  if claimed is not false then
    raise exception 'A concurrent duplicate webhook claim must be rejected';
  end if;

  update public.webhook_events
  set processing_started_at = now() - interval '6 minutes'
  where provider = 'stripe'
    and provider_event_id = 'evt_billing_test';

  select public.claim_stripe_webhook(
    'evt_billing_test',
    'customer.subscription.updated',
    '{"id":"evt_billing_test","retry":true}'::jsonb
  )
  into claimed;

  if claimed is not true then
    raise exception 'A stale unprocessed webhook must be reclaimable';
  end if;

  select attempts
  into attempt_count
  from public.webhook_events
  where provider = 'stripe'
    and provider_event_id = 'evt_billing_test';

  if attempt_count <> 2 then
    raise exception 'Expected two webhook attempts, got %', attempt_count;
  end if;

  update public.webhook_events
  set processed_at = now(), processing_started_at = null
  where provider = 'stripe'
    and provider_event_id = 'evt_billing_test';

  select public.claim_stripe_webhook(
    'evt_billing_test',
    'customer.subscription.updated',
    '{"id":"evt_billing_test"}'::jsonb
  )
  into claimed;

  if claimed is not false then
    raise exception 'A processed webhook must never be reclaimed';
  end if;
end;
$$;

rollback;
