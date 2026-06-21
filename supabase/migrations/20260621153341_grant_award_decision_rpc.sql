create or replace function public.create_grant_award(
  target_application_id uuid,
  target_amount_cents integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  application_record record;
  round_record record;
  existing_award_record record;
  active_award_count integer;
  active_award_total_cents bigint;
  award_id uuid;
begin
  if not (select private.is_platform_admin(array['super_admin', 'grants_admin']::public.platform_role[])) then
    raise exception 'Only grants administrators can create awards.';
  end if;

  select
    applications.id,
    applications.round_id,
    applications.status,
    applications.requested_amount_cents
  into application_record
  from public.grant_applications applications
  where applications.id = target_application_id
  for update;

  if application_record.id is null then
    raise exception 'Grant application was not found.';
  end if;

  if application_record.status not in ('shortlisted', 'approved') then
    raise exception 'Only shortlisted or approved applications can be awarded.';
  end if;

  select
    rounds.id,
    rounds.award_amount_cents,
    rounds.available_awards,
    rounds.budget_cents
  into round_record
  from public.grant_rounds rounds
  where rounds.id = application_record.round_id
  for update;

  if round_record.id is null then
    raise exception 'Grant round was not found.';
  end if;

  if target_amount_cents <= 0 then
    raise exception 'Award amount must be greater than zero.';
  end if;

  if target_amount_cents > application_record.requested_amount_cents then
    raise exception 'Award amount cannot exceed the requested amount.';
  end if;

  if target_amount_cents > round_record.award_amount_cents then
    raise exception 'Award amount cannot exceed the round award amount.';
  end if;

  select awards.id, awards.amount_cents, awards.status
  into existing_award_record
  from public.grant_awards awards
  where awards.application_id = application_record.id
  for update;

  select
    count(*),
    coalesce(sum(awards.amount_cents), 0)
  into active_award_count, active_award_total_cents
  from public.grant_awards awards
  join public.grant_applications applications
    on applications.id = awards.application_id
  where applications.round_id = application_record.round_id
    and awards.status <> 'canceled'
    and awards.application_id <> application_record.id;

  if existing_award_record.id is null and active_award_count >= round_record.available_awards then
    raise exception 'Award count cannot exceed the round limit.';
  end if;

  if active_award_total_cents + target_amount_cents > round_record.budget_cents then
    raise exception 'Award total cannot exceed the round budget.';
  end if;

  insert into public.grant_awards (
    application_id,
    amount_cents,
    status
  )
  values (
    application_record.id,
    target_amount_cents,
    'approved'
  )
  on conflict (application_id) do update
  set
    amount_cents = excluded.amount_cents,
    status = excluded.status
  returning id into award_id;

  update public.grant_applications
  set status = 'approved'
  where id = application_record.id;

  return award_id;
end;
$$;

revoke all on function public.create_grant_award(uuid, integer) from public;
grant execute on function public.create_grant_award(uuid, integer) to authenticated;
