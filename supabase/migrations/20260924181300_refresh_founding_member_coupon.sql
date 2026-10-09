create or replace function public.reserve_founding_member(
  target_request_id uuid,
  target_discount_identifier text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_claim public.founding_member_claims%rowtype;
  claimed_count integer;
  next_claim_number integer;
  reservation_expires_at timestamptz := now() + interval '31 minutes';
begin
  if target_discount_identifier is null or btrim(target_discount_identifier) = '' then
    return jsonb_build_object('eligible', false);
  end if;

  perform pg_advisory_xact_lock(hashtext('olea-connects:founding-member-claims'));

  update public.founding_member_claims
  set status = 'released'
  where status = 'reserved' and expires_at <= now();

  select * into existing_claim
  from public.founding_member_claims
  where provisioning_request_id = target_request_id;

  if found and existing_claim.status = 'paid' then
    return jsonb_build_object(
      'eligible', true,
      'claim_number', existing_claim.claim_number,
      'discount_identifier', existing_claim.discount_identifier
    );
  end if;

  if found and existing_claim.status = 'reserved' and existing_claim.expires_at > now() then
    if existing_claim.discount_identifier is distinct from target_discount_identifier then
      update public.founding_member_claims
      set discount_identifier = target_discount_identifier
      where provisioning_request_id = target_request_id;

      update public.workspace_provisioning_requests
      set founding_discount_identifier = target_discount_identifier
      where id = target_request_id;
    end if;

    return jsonb_build_object(
      'eligible', true,
      'claim_number', existing_claim.claim_number,
      'discount_identifier', target_discount_identifier
    );
  end if;

  select count(*)::integer into claimed_count
  from public.founding_member_claims
  where status = 'paid' or (status = 'reserved' and expires_at > now());

  if claimed_count >= 50 then
    update public.workspace_provisioning_requests
    set founding_member_eligible = false,
        founding_discount_identifier = null,
        founding_member_year = null
    where id = target_request_id;
    return jsonb_build_object('eligible', false);
  end if;

  select min(candidate)::integer into next_claim_number
  from generate_series(1, 50) as candidate
  where not exists (
    select 1
    from public.founding_member_claims
    where claim_number = candidate
      and (status = 'paid' or (status = 'reserved' and expires_at > now()))
  );

  delete from public.founding_member_claims
  where claim_number = next_claim_number
    and provisioning_request_id <> target_request_id
    and status = 'released';

  insert into public.founding_member_claims (
    claim_number, provisioning_request_id, discount_identifier, expires_at
  )
  values (
    next_claim_number, target_request_id, target_discount_identifier,
    reservation_expires_at
  )
  on conflict (provisioning_request_id) do update
  set claim_number = excluded.claim_number,
      status = 'reserved',
      discount_identifier = excluded.discount_identifier,
      claimed_at = now(),
      expires_at = excluded.expires_at,
      paid_at = null;

  update public.workspace_provisioning_requests
  set founding_member_eligible = true,
      founding_discount_identifier = target_discount_identifier,
      founding_member_year = 1
  where id = target_request_id;

  return jsonb_build_object(
    'eligible', true,
    'discount_identifier', target_discount_identifier,
    'expires_at', reservation_expires_at
  );
end;
$$;

revoke all on function public.reserve_founding_member(uuid, text) from public, anon, authenticated;
grant execute on function public.reserve_founding_member(uuid, text) to service_role;
