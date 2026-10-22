-- A reviewer represents a person, not a role row. Normalize the short-lived
-- duplicate assignments created before this invariant was introduced, keeping
-- the role with the highest confidential authority for each person.
with ranked_assignments as (
  select
    id,
    row_number() over (
      partition by cycle_id, user_id
      order by
        case role
          when 'board_chair' then 1
          when 'hr_reviewer' then 2
          when 'privileged_auditor' then 3
        end,
        created_at,
        id
    ) as assignment_rank
  from public.ed_review_reviewer_assignments
)
delete from public.ed_review_reviewer_assignments assignments
using ranked_assignments ranked
where assignments.id = ranked.id
  and ranked.assignment_rank > 1;

alter table public.ed_review_reviewer_assignments
  drop constraint if exists ed_review_reviewer_assignments_cycle_id_user_id_role_key;

alter table public.ed_review_reviewer_assignments
  add constraint ed_review_reviewer_assignments_one_role_per_user
  unique (cycle_id, user_id);

create or replace function public.assign_ed_review_reviewer_assignment(
  p_cycle_id uuid,
  p_user_id uuid,
  p_role public.ed_review_reviewer_role,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_role not in ('board_chair', 'hr_reviewer') then
    raise exception 'Reviewer access can only be Board Chair or HR reviewer.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_cycle_id::text, 0)
  );

  if not exists (
    select 1
    from public.ed_review_cycles cycles
    join public.organization_members memberships
      on memberships.organization_id = cycles.organization_id
    join public.ed_review_reviewer_assignments assignments
      on assignments.cycle_id = cycles.id
      and assignments.user_id = p_actor_user_id
      and assignments.role = 'board_chair'
    where cycles.id = p_cycle_id
      and memberships.user_id = p_actor_user_id
      and memberships.status = 'active'
  ) then
    raise exception 'Only an explicitly assigned Board Chair can manage review access.';
  end if;

  if not exists (
    select 1
    from public.ed_review_cycles cycles
    join public.organization_members memberships
      on memberships.organization_id = cycles.organization_id
    where cycles.id = p_cycle_id
      and memberships.user_id = p_user_id
      and memberships.status = 'active'
  ) then
    raise exception 'Reviewers must be active members of this workspace.';
  end if;

  if exists (
    select 1
    from public.ed_review_reviewer_assignments
    where cycle_id = p_cycle_id
      and user_id = p_user_id
  ) then
    raise exception 'This platform user already has confidential access. Use the edit control to change their role.';
  end if;

  insert into public.ed_review_reviewer_assignments (
    cycle_id,
    user_id,
    role,
    granted_by
  ) values (
    p_cycle_id,
    p_user_id,
    p_role,
    p_actor_user_id
  );

  insert into public.ed_review_audit_events (
    cycle_id,
    actor_user_id,
    event_type,
    details
  ) values (
    p_cycle_id,
    p_actor_user_id,
    'reviewer_assigned',
    jsonb_build_object('reviewer_user_id', p_user_id, 'role', p_role)
  );

  return jsonb_build_object(
    'reviewer_user_id', p_user_id,
    'role', p_role
  );
end;
$$;

create or replace function public.update_ed_review_reviewer_assignment(
  p_cycle_id uuid,
  p_assignment_id uuid,
  p_next_role public.ed_review_reviewer_role,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_assignment public.ed_review_reviewer_assignments%rowtype;
  v_board_chair_count integer;
begin
  if p_next_role not in ('board_chair', 'hr_reviewer') then
    raise exception 'Reviewer access can only be Board Chair or HR reviewer.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_cycle_id::text, 0)
  );

  if not exists (
    select 1
    from public.ed_review_cycles cycles
    join public.organization_members memberships
      on memberships.organization_id = cycles.organization_id
    join public.ed_review_reviewer_assignments assignments
      on assignments.cycle_id = cycles.id
      and assignments.user_id = p_actor_user_id
      and assignments.role = 'board_chair'
    where cycles.id = p_cycle_id
      and memberships.user_id = p_actor_user_id
      and memberships.status = 'active'
  ) then
    raise exception 'Only an explicitly assigned Board Chair can manage review access.';
  end if;

  select *
    into v_assignment
    from public.ed_review_reviewer_assignments
    where id = p_assignment_id
      and cycle_id = p_cycle_id
    for update;

  if not found then
    raise exception 'That reviewer assignment is unavailable.';
  end if;

  if v_assignment.role = 'privileged_auditor' then
    raise exception 'Privileged auditor assignments can only be managed by a platform administrator.';
  end if;

  if v_assignment.role = p_next_role then
    return jsonb_build_object(
      'reviewer_user_id', v_assignment.user_id,
      'previous_role', v_assignment.role,
      'role', p_next_role
    );
  end if;

  if v_assignment.role = 'board_chair' then
    select count(distinct user_id)
      into v_board_chair_count
      from public.ed_review_reviewer_assignments
      where cycle_id = p_cycle_id
        and role = 'board_chair';

    if v_board_chair_count <= 1 then
      raise exception 'Assign another Board Chair before changing or removing this access.';
    end if;
  end if;

  update public.ed_review_reviewer_assignments
    set role = p_next_role
    where id = v_assignment.id;

  insert into public.ed_review_audit_events (
    cycle_id,
    actor_user_id,
    event_type,
    details
  ) values (
    p_cycle_id,
    p_actor_user_id,
    'reviewer_access_updated',
    jsonb_build_object(
      'reviewer_user_id', v_assignment.user_id,
      'previous_role', v_assignment.role,
      'role', p_next_role
    )
  );

  return jsonb_build_object(
    'reviewer_user_id', v_assignment.user_id,
    'previous_role', v_assignment.role,
    'role', p_next_role
  );
end;
$$;

create or replace function public.revoke_ed_review_reviewer_assignment(
  p_cycle_id uuid,
  p_assignment_id uuid,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_assignment public.ed_review_reviewer_assignments%rowtype;
  v_board_chair_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_cycle_id::text, 0)
  );

  if not exists (
    select 1
    from public.ed_review_cycles cycles
    join public.organization_members memberships
      on memberships.organization_id = cycles.organization_id
    join public.ed_review_reviewer_assignments assignments
      on assignments.cycle_id = cycles.id
      and assignments.user_id = p_actor_user_id
      and assignments.role = 'board_chair'
    where cycles.id = p_cycle_id
      and memberships.user_id = p_actor_user_id
      and memberships.status = 'active'
  ) then
    raise exception 'Only an explicitly assigned Board Chair can manage review access.';
  end if;

  select *
    into v_assignment
    from public.ed_review_reviewer_assignments
    where id = p_assignment_id
      and cycle_id = p_cycle_id
    for update;

  if not found then
    raise exception 'That reviewer assignment is unavailable.';
  end if;

  if v_assignment.role = 'privileged_auditor' then
    raise exception 'Privileged auditor assignments can only be managed by a platform administrator.';
  end if;

  if v_assignment.role = 'board_chair' then
    select count(distinct user_id)
      into v_board_chair_count
      from public.ed_review_reviewer_assignments
      where cycle_id = p_cycle_id
        and role = 'board_chair';

    if v_board_chair_count <= 1 then
      raise exception 'Assign another Board Chair before changing or removing this access.';
    end if;
  end if;

  delete from public.ed_review_reviewer_assignments
    where id = v_assignment.id;

  insert into public.ed_review_audit_events (
    cycle_id,
    actor_user_id,
    event_type,
    details
  ) values (
    p_cycle_id,
    p_actor_user_id,
    'reviewer_access_revoked',
    jsonb_build_object(
      'reviewer_user_id', v_assignment.user_id,
      'role', v_assignment.role
    )
  );

  return jsonb_build_object(
    'reviewer_user_id', v_assignment.user_id,
    'role', v_assignment.role
  );
end;
$$;

revoke all on function public.assign_ed_review_reviewer_assignment(
  uuid,
  uuid,
  public.ed_review_reviewer_role,
  uuid
) from public, anon, authenticated;

grant execute on function public.assign_ed_review_reviewer_assignment(
  uuid,
  uuid,
  public.ed_review_reviewer_role,
  uuid
) to service_role;

create or replace function public.appoint_ed_review_board_chair_recovery(
  p_cycle_id uuid,
  p_user_id uuid,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_assignment public.ed_review_reviewer_assignments%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_cycle_id::text, 0)
  );

  if not exists (
    select 1
    from public.ed_review_cycles cycles
    join public.organization_members memberships
      on memberships.organization_id = cycles.organization_id
    where cycles.id = p_cycle_id
      and memberships.user_id = p_actor_user_id
      and memberships.status = 'active'
      and memberships.role in ('owner', 'admin')
  ) then
    raise exception 'Only organization owners and administrators can recover Board Chair access.';
  end if;

  if exists (
    select 1
    from public.ed_review_reviewer_assignments
    where cycle_id = p_cycle_id
      and role = 'board_chair'
  ) then
    raise exception 'Board Chair access already exists for this review.';
  end if;

  if not exists (
    select 1
    from public.ed_review_cycles cycles
    join public.organization_members memberships
      on memberships.organization_id = cycles.organization_id
    where cycles.id = p_cycle_id
      and memberships.user_id = p_user_id
      and memberships.status = 'active'
  ) then
    raise exception 'Board Chairs must be active members of this workspace.';
  end if;

  select *
    into v_assignment
    from public.ed_review_reviewer_assignments
    where cycle_id = p_cycle_id
      and user_id = p_user_id
    for update;

  if found and v_assignment.role = 'privileged_auditor' then
    raise exception 'Privileged auditor assignments can only be managed by a platform administrator.';
  elsif found then
    update public.ed_review_reviewer_assignments
      set role = 'board_chair', granted_by = p_actor_user_id
      where id = v_assignment.id;
  else
    insert into public.ed_review_reviewer_assignments (
      cycle_id,
      user_id,
      role,
      granted_by
    ) values (
      p_cycle_id,
      p_user_id,
      'board_chair',
      p_actor_user_id
    );
  end if;

  insert into public.ed_review_audit_events (
    cycle_id,
    actor_user_id,
    event_type,
    details
  ) values (
    p_cycle_id,
    p_actor_user_id,
    'board_chair_recovery_assigned',
    jsonb_build_object('reviewer_user_id', p_user_id)
  );

  return jsonb_build_object('reviewer_user_id', p_user_id, 'role', 'board_chair');
end;
$$;

revoke all on function public.appoint_ed_review_board_chair_recovery(uuid, uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.appoint_ed_review_board_chair_recovery(uuid, uuid, uuid)
  to service_role;
