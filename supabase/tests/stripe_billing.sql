begin;

select plan(5);

select ok(
  public.claim_stripe_webhook(
    'evt_billing_test',
    'customer.subscription.updated',
    '{"id":"evt_billing_test"}'::jsonb
  ),
  'the first webhook claim succeeds'
);

select ok(
  not public.claim_stripe_webhook(
    'evt_billing_test',
    'customer.subscription.updated',
    '{"id":"evt_billing_test"}'::jsonb
  ),
  'a concurrent duplicate webhook claim is rejected'
);

update public.webhook_events
set processing_started_at = now() - interval '6 minutes'
where provider = 'stripe'
  and provider_event_id = 'evt_billing_test';

select ok(
  public.claim_stripe_webhook(
    'evt_billing_test',
    'customer.subscription.updated',
    '{"id":"evt_billing_test","retry":true}'::jsonb
  ),
  'a stale unprocessed webhook can be reclaimed'
);

select is(
  (
    select attempts
    from public.webhook_events
    where provider = 'stripe'
      and provider_event_id = 'evt_billing_test'
  ),
  2,
  'reclaiming records a second processing attempt'
);

update public.webhook_events
set processed_at = now(), processing_started_at = null
where provider = 'stripe'
  and provider_event_id = 'evt_billing_test';

select ok(
  not public.claim_stripe_webhook(
    'evt_billing_test',
    'customer.subscription.updated',
    '{"id":"evt_billing_test"}'::jsonb
  ),
  'a processed webhook is never reclaimed'
);

select * from finish();
rollback;
