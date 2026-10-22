create or replace function public.create_kpi_tracker_entry(
  target_dashboard_id uuid,
  target_quarter smallint,
  target_domain text,
  target_name text,
  target_owner text,
  target_display text,
  target_number numeric,
  target_baseline_number numeric,
  target_outcome_area text,
  target_current_value numeric,
  target_rag_status text,
  target_context_notes text
)
returns smallint
language plpgsql
security definer
set search_path = public
as $$
declare
  target_kpi_id uuid;
  target_definition public.kpi_definitions%rowtype;
begin
  if target_quarter not between 1 and 4 then
    raise exception 'Quarter is invalid.' using errcode = '22023';
  end if;

  select * into target_definition
  from public.kpi_definitions
  where dashboard_id = target_dashboard_id
    and active
    and lower(trim(domain)) = lower(trim(target_domain))
    and lower(trim(name)) = lower(trim(target_name))
  order by created_at asc
  limit 1
  for update;

  target_kpi_id := target_definition.id;
  if target_kpi_id is not null then
    if coalesce(target_definition.owner, '') is distinct from coalesce(target_owner, '')
       or target_definition.target_display is distinct from target_display
       or target_definition.target_number is distinct from target_number
       or target_definition.baseline_number is distinct from target_baseline_number
       or coalesce(target_definition.outcome_area, '') is distinct from coalesce(target_outcome_area, '') then
      raise exception 'An active KPI with this domain and name already exists. Use its existing definition values before adding it to Q%.', target_quarter
        using errcode = '23505';
    end if;
  else
    insert into public.kpi_definitions (
      dashboard_id, domain, name, owner, target_display, target_number,
      baseline_number, outcome_area, sort_order
    )
    values (
      target_dashboard_id, trim(target_domain), trim(target_name), coalesce(target_owner, ''),
      target_display, target_number, target_baseline_number, coalesce(target_outcome_area, ''),
      coalesce((select max(sort_order) + 1 from public.kpi_definitions where dashboard_id = target_dashboard_id), 0)
    )
    returning id into target_kpi_id;
  end if;

  if exists (
    select 1 from public.kpi_quarter_assignments
    where kpi_id = target_kpi_id and quarter = target_quarter
  ) then
    raise exception 'This KPI is already tracked in Q%. Use Edit KPI to change its result.', target_quarter
      using errcode = '23505';
  end if;

  insert into public.kpi_quarter_assignments (kpi_id, quarter)
  values (target_kpi_id, target_quarter);

  if target_current_value is not null
     or target_rag_status <> 'na'
     or coalesce(length(target_context_notes), 0) > 0 then
    insert into public.kpi_quarter_results (
      kpi_id, quarter, current_value, rag_status, context_notes
    )
    values (
      target_kpi_id, target_quarter, target_current_value,
      target_rag_status::public.kpi_rag_status, coalesce(target_context_notes, '')
    );
  end if;

  return target_quarter;
end;
$$;

revoke execute on function public.create_kpi_tracker_entry(
  uuid, smallint, text, text, text, text, numeric, numeric, text, numeric, text, text
) from public, anon, authenticated;
grant execute on function public.create_kpi_tracker_entry(
  uuid, smallint, text, text, text, text, numeric, numeric, text, numeric, text, text
) to service_role;
