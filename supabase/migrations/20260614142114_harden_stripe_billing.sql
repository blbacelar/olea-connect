alter table public.webhook_events
  add column processing_started_at timestamptz,
  add column attempts integer not null default 0,
  add constraint webhook_events_attempts_nonnegative check (attempts >= 0);

create index webhook_events_processing_idx
  on public.webhook_events(provider, processing_started_at)
  where processed_at is null;

create or replace function public.claim_stripe_webhook(
  target_event_id text,
  target_event_type text,
  target_payload jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_rows integer := 0;
begin
  insert into public.webhook_events (
    provider,
    provider_event_id,
    event_type,
    payload,
    processing_started_at,
    attempts
  )
  values (
    'stripe',
    target_event_id,
    target_event_type,
    target_payload,
    now(),
    1
  )
  on conflict (provider, provider_event_id) do nothing;

  if found then
    return true;
  end if;

  update public.webhook_events
  set
    event_type = target_event_type,
    payload = target_payload,
    processing_started_at = now(),
    processing_error = null,
    attempts = attempts + 1
  where provider = 'stripe'
    and provider_event_id = target_event_id
    and processed_at is null
    and (
      processing_started_at is null
      or processing_started_at < now() - interval '5 minutes'
    );

  get diagnostics affected_rows = row_count;
  return affected_rows = 1;
end;
$$;

revoke all on function public.claim_stripe_webhook(text, text, jsonb) from public;
revoke all on function public.claim_stripe_webhook(text, text, jsonb) from anon;
revoke all on function public.claim_stripe_webhook(text, text, jsonb) from authenticated;
grant execute on function public.claim_stripe_webhook(text, text, jsonb) to service_role;

create or replace function public.has_current_subscription()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members memberships
    join public.subscriptions subscriptions
      on subscriptions.organization_id = memberships.organization_id
    where memberships.user_id = (select auth.uid())
      and memberships.status = 'active'
      and subscriptions.status in ('trialing', 'active')
  )
  or exists (
    select 1
    from public.platform_user_roles roles
    where roles.user_id = (select auth.uid())
  );
$$;

revoke all on function public.has_current_subscription() from public;
revoke all on function public.has_current_subscription() from anon;
grant execute on function public.has_current_subscription() to authenticated;
grant execute on function public.has_current_subscription() to service_role;
