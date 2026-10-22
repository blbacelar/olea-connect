-- A milestone's updated_at changes when its notes or owner are edited. Keep
-- the actual completion time separately for sponsor-year impact reports.
-- Historical complete milestones stay NULL because their completion time
-- cannot be reconstructed reliably from updated_at.
alter table public.kpi_milestones
  add column completed_at timestamptz;

create function private.track_kpi_milestone_completion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'complete' then
    if tg_op = 'INSERT' or old.status <> 'complete' then
      new.completed_at := now();
    else
      new.completed_at := old.completed_at;
    end if;
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger kpi_milestones_track_completion
before insert or update on public.kpi_milestones
for each row execute function private.track_kpi_milestone_completion();

-- Closed evaluations with fewer than three responses are not completed
-- evaluations; this matches the anonymity threshold of the results screen.
create or replace function public.sponsorship_impact_summary(p_sponsorship_id uuid)
returns table (
  template_exports bigint,
  training_certificates bigint,
  attended_events bigint,
  completed_evaluations bigint,
  completed_milestones bigint
)
language sql stable
set search_path = ''
as $$
  select
    (select count(distinct export.id)
     from public.template_exports as export
     join public.sponsored_memberships as placement
       on placement.organization_id = export.organization_id
      and export.generated_at >= placement.starts_at
      and export.generated_at < placement.ends_at
     where placement.sponsorship_id = p_sponsorship_id
       and placement.status <> 'canceled'),
    (select count(distinct certificate.id)
     from public.board_training_certificates as certificate
     join public.sponsored_memberships as placement
       on placement.organization_id = certificate.organization_id
      and certificate.issued_at >= placement.starts_at
      and certificate.issued_at < placement.ends_at
     where placement.sponsorship_id = p_sponsorship_id
       and placement.status <> 'canceled'),
    (select count(distinct registration.id)
     from public.event_registrations as registration
     join public.sponsored_memberships as placement
       on placement.organization_id = registration.organization_id
      and registration.attended_at >= placement.starts_at
      and registration.attended_at < placement.ends_at
     where placement.sponsorship_id = p_sponsorship_id
       and placement.status <> 'canceled'),
    (select count(distinct cycle.id)
     from public.board_evaluation_cycles as cycle
     join public.sponsored_memberships as placement
       on placement.organization_id = cycle.organization_id
      and cycle.closed_at >= placement.starts_at
      and cycle.closed_at < placement.ends_at
     where placement.sponsorship_id = p_sponsorship_id
       and placement.status <> 'canceled'
       and cycle.status = 'closed'
       and (select count(*) from public.board_evaluation_responses as response
            where response.cycle_id = cycle.id) >= 3),
    (select count(distinct milestone.id)
     from public.kpi_milestones as milestone
     join public.kpi_dashboards as dashboard on dashboard.id = milestone.dashboard_id
     join public.sponsored_memberships as placement
       on placement.organization_id = dashboard.organization_id
      and milestone.completed_at >= placement.starts_at
      and milestone.completed_at < placement.ends_at
     where placement.sponsorship_id = p_sponsorship_id
       and placement.status <> 'canceled'
       and milestone.status = 'complete');
$$;

revoke all on function public.sponsorship_impact_summary(uuid)
  from public, anon, authenticated;
grant execute on function public.sponsorship_impact_summary(uuid)
  to service_role;
