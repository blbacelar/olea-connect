create index integration_events_attio_claim_idx
  on public.integration_events(available_at, created_at)
  where provider = 'attio'
    and status in ('pending', 'failed');

create index integration_events_quickbooks_claim_idx
  on public.integration_events(available_at, created_at)
  where provider = 'quickbooks'
    and status in ('pending', 'failed');

create or replace function private.claim_provider_integration_event(target_provider text)
returns public.integration_events
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed public.integration_events;
begin
  if target_provider not in ('attio', 'quickbooks') then
    raise exception 'Unsupported integration provider: %', target_provider;
  end if;

  select *
  into claimed
  from public.integration_events
  where provider = target_provider
    and status in ('pending', 'failed')
    and available_at <= now()
    and attempts < 5
    and (
      processing_started_at is null
      or processing_started_at < now() - interval '5 minutes'
    )
  order by available_at, created_at
  for update skip locked
  limit 1;

  if not found then
    return null;
  end if;

  update public.integration_events
  set
    status = 'processing',
    processing_started_at = now(),
    attempts = attempts + 1,
    last_error = null
  where id = claimed.id
  returning * into claimed;

  return claimed;
end;
$$;

revoke all on function private.claim_provider_integration_event(text) from public;
revoke all on function private.claim_provider_integration_event(text) from anon;
revoke all on function private.claim_provider_integration_event(text) from authenticated;
grant execute on function private.claim_provider_integration_event(text)
  to service_role;

create or replace function public.claim_attio_integration_event()
returns public.integration_events
language sql
security invoker
set search_path = ''
as $$
  select private.claim_provider_integration_event('attio');
$$;

create or replace function public.claim_quickbooks_integration_event()
returns public.integration_events
language sql
security invoker
set search_path = ''
as $$
  select private.claim_provider_integration_event('quickbooks');
$$;

revoke all on function public.claim_attio_integration_event() from public;
revoke all on function public.claim_attio_integration_event() from anon;
revoke all on function public.claim_attio_integration_event() from authenticated;
grant execute on function public.claim_attio_integration_event()
  to service_role;

revoke all on function public.claim_quickbooks_integration_event() from public;
revoke all on function public.claim_quickbooks_integration_event() from anon;
revoke all on function public.claim_quickbooks_integration_event() from authenticated;
grant execute on function public.claim_quickbooks_integration_event()
  to service_role;

create or replace function private.replay_integration_event(target_event_id uuid)
returns public.integration_events
language plpgsql
security definer
set search_path = ''
as $$
declare
  replayed public.integration_events;
begin
  update public.integration_events
  set
    status = 'pending',
    attempts = 0,
    available_at = now(),
    locked_at = null,
    processing_started_at = null,
    completed_at = null,
    last_error = null
  where id = target_event_id
    and status in ('failed', 'dead_letter')
  returning * into replayed;

  if not found then
    return null;
  end if;

  return replayed;
end;
$$;

revoke all on function private.replay_integration_event(uuid) from public;
revoke all on function private.replay_integration_event(uuid) from anon;
revoke all on function private.replay_integration_event(uuid) from authenticated;
grant execute on function private.replay_integration_event(uuid)
  to service_role;

create or replace function public.replay_integration_event(target_event_id uuid)
returns public.integration_events
language sql
security invoker
set search_path = ''
as $$
  select private.replay_integration_event(target_event_id);
$$;

revoke all on function public.replay_integration_event(uuid) from public;
revoke all on function public.replay_integration_event(uuid) from anon;
revoke all on function public.replay_integration_event(uuid) from authenticated;
grant execute on function public.replay_integration_event(uuid)
  to service_role;
