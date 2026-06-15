begin;

select plan(7);

select ok(
  has_schema_privilege('service_role', 'private', 'USAGE'),
  'service role can resolve the private email claim function'
);

select ok(
  not has_schema_privilege('anon', 'private', 'USAGE'),
  'anonymous clients cannot resolve private functions'
);

update public.integration_events
set status = 'completed', completed_at = now()
where provider = 'email'
  and status in ('pending', 'failed', 'processing');

insert into public.integration_events (
  id,
  event_type,
  aggregate_type,
  aggregate_id,
  provider,
  payload,
  idempotency_key
)
values
  (
    '72000000-0000-0000-0000-000000000001',
    'organization.invitation.created',
    'organization_invitation',
    '82000000-0000-0000-0000-000000000001',
    'email',
    '{"email":"delivery@example.com"}'::jsonb,
    'email-delivery-test'
  ),
  (
    '72000000-0000-0000-0000-000000000002',
    'organization.invitation.created',
    'organization_invitation',
    '82000000-0000-0000-0000-000000000002',
    'email',
    '{"email":"later@example.com"}'::jsonb,
    'email-delivery-later-test'
  );

update public.integration_events
set available_at = now() + interval '1 hour'
where id = '72000000-0000-0000-0000-000000000002';

select is(
  (public.claim_email_integration_event()).id,
  '72000000-0000-0000-0000-000000000001'::uuid,
  'the next available email event is claimed'
);

select is(
  (
    select status::text
    from public.integration_events
    where id = '72000000-0000-0000-0000-000000000001'
  ),
  'processing',
  'claiming marks the event as processing'
);

select is(
  (
    select attempts
    from public.integration_events
    where id = '72000000-0000-0000-0000-000000000001'
  ),
  1,
  'claiming increments the delivery attempt'
);

select is(
  (public.claim_email_integration_event()).id,
  null,
  'processing and future events cannot be claimed immediately'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.claim_email_integration_event()',
    'EXECUTE'
  ),
  'browser roles cannot claim lifecycle email events'
);

select * from finish();
rollback;
