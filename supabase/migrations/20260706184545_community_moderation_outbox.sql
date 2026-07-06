create index if not exists integration_events_community_moderation_claim_idx
  on public.integration_events(available_at, created_at)
  where provider = 'community_moderation'
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
  if target_provider not in ('attio', 'quickbooks', 'community_moderation') then
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

create or replace function public.claim_community_moderation_integration_event()
returns public.integration_events
language sql
security invoker
set search_path = ''
as $$
  select private.claim_provider_integration_event('community_moderation');
$$;

revoke all on function public.claim_community_moderation_integration_event() from public;
revoke all on function public.claim_community_moderation_integration_event() from anon;
revoke all on function public.claim_community_moderation_integration_event() from authenticated;
grant execute on function public.claim_community_moderation_integration_event()
  to service_role;
