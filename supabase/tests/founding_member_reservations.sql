begin;

select plan(4);

delete from public.founding_member_claims;

create temporary table founding_test_users (
  sequence_number integer primary key,
  user_id uuid not null,
  request_id uuid not null
);

insert into founding_test_users (sequence_number, user_id, request_id)
select sequence_number, gen_random_uuid(), gen_random_uuid()
from generate_series(1, 51) as sequence_number;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select
  user_id,
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'founding-' || sequence_number || '@example.test',
  '',
  now(),
  '{}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
from founding_test_users;

insert into public.workspace_provisioning_requests (
  id, user_id, email, full_name, organization_name, plan_id,
  billing_interval, status, founding_offer_requested
)
select
  request_id,
  user_id,
  'founding-' || sequence_number || '@example.test',
  'Founding Owner ' || sequence_number,
  'Founding Organization ' || sequence_number,
  'roots',
  'year',
  'pending_payment',
  true
from founding_test_users;

do $$
declare
  target_request_id uuid;
begin
  for target_request_id in
    select request_id
    from founding_test_users
    where sequence_number <= 50
    order by sequence_number
  loop
    perform public.reserve_founding_member(target_request_id, 'founding_coupon');
  end loop;
end;
$$;

select is(
  (select count(*)::integer from public.founding_member_claims where status = 'reserved'),
  50,
  'exactly 50 active reservations can be held'
);

select is(
  (
    select public.reserve_founding_member(request_id, 'founding_coupon')->>'eligible'
    from founding_test_users
    where sequence_number = 51
  ),
  'false',
  'the 51st active reservation is declined'
);

update public.founding_member_claims
set expires_at = now() - interval '1 minute'
where claim_number = 1;

select is(
  (
    select public.reserve_founding_member(request_id, 'founding_coupon')->>'eligible'
    from founding_test_users
    where sequence_number = 51
  ),
  'true',
  'an expired reservation releases its spot'
);

select is(
  (select count(*)::integer from public.founding_member_claims where status = 'reserved'),
  50,
  'the active reservation count remains capped after reuse'
);

select * from finish();

rollback;
