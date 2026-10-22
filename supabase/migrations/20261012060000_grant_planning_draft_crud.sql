create or replace function public.update_grant_planning_draft(
  target_organization_id uuid,
  target_application_id uuid,
  grant_name text,
  funder_name text,
  grant_notes text,
  amount_cents integer,
  deadline_date date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  planning_application public.grant_applications%rowtype;
  planning_round public.grant_rounds%rowtype;
begin
  select * into planning_application
  from public.grant_applications
  where id = target_application_id and organization_id = target_organization_id
  for update;

  if not found or planning_application.status <> 'draft'
    or planning_application.eligibility_snapshot->>'source' <> 'module_create' then
    raise exception 'This workspace draft cannot be edited.';
  end if;

  select * into planning_round from public.grant_rounds
  where id = planning_application.round_id for update;

  if planning_round.status <> 'draft'
    or (select count(*) from public.grant_applications where round_id = planning_round.id) <> 1 then
    raise exception 'This grant is shared or no longer a draft.';
  end if;

  if length(trim(grant_name)) not between 1 and 180
    or length(trim(funder_name)) > 180 or length(trim(grant_notes)) > 2000
    or amount_cents <= 0 or deadline_date < current_date then
    raise exception 'Check the grant details and deadline.';
  end if;

  update public.grant_rounds set
    name = trim(grant_name),
    closes_at = deadline_date::timestamp at time zone 'UTC' + interval '23 hours 59 minutes 59 seconds',
    award_amount_cents = amount_cents,
    budget_cents = amount_cents,
    public_notes = concat_ws(E'\n',
      case when trim(funder_name) <> '' then 'Funder: ' || trim(funder_name) end,
      case when trim(grant_notes) <> '' then 'Notes: ' || trim(grant_notes) end)
  where id = planning_round.id;

  update public.grant_applications set
    requested_amount_cents = amount_cents,
    funding_request = case when trim(grant_notes) <> '' then trim(grant_notes)
      else 'Planning entry for ' || trim(grant_name) end,
    expected_outcome = case when trim(grant_notes) <> '' then trim(grant_notes)
      else 'Initial planning entry created from the grant platform workspace.' end
  where id = target_application_id;
end;
$$;

create or replace function public.delete_grant_planning_draft(
  target_organization_id uuid,
  target_application_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  planning_application public.grant_applications%rowtype;
  planning_round public.grant_rounds%rowtype;
begin
  select * into planning_application from public.grant_applications
  where id = target_application_id and organization_id = target_organization_id
  for update;

  if not found or planning_application.status <> 'draft'
    or planning_application.eligibility_snapshot->>'source' <> 'module_create' then
    raise exception 'This workspace draft cannot be deleted.';
  end if;

  select * into planning_round from public.grant_rounds
  where id = planning_application.round_id for update;

  if planning_round.status <> 'draft'
    or (select count(*) from public.grant_applications where round_id = planning_round.id) <> 1 then
    raise exception 'This grant is shared or no longer a draft.';
  end if;

  delete from public.grant_rounds where id = planning_round.id;
end;
$$;

revoke all on function public.update_grant_planning_draft(uuid, uuid, text, text, text, integer, date) from public, anon, authenticated;
revoke all on function public.delete_grant_planning_draft(uuid, uuid) from public, anon, authenticated;
grant execute on function public.update_grant_planning_draft(uuid, uuid, text, text, text, integer, date) to service_role;
grant execute on function public.delete_grant_planning_draft(uuid, uuid) to service_role;
