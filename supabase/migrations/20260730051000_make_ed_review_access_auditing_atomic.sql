-- Reviewer access changes are confidential lifecycle events. Keep each change
-- and its audit record in one transaction, and verify the declared actor is an
-- active Board Chair for the same review cycle.

drop function if exists public.update_ed_review_reviewer_assignment(
  uuid,
  uuid,
  public.ed_review_reviewer_role
);

drop function if exists public.revoke_ed_review_reviewer_assignment(uuid, uuid);

create function public.update_ed_review_reviewer_assignment(
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
  v_role_exists boolean;
begin
  if p_next_role not in ('board_chair', 'hr_reviewer') then
    raise exception 'Reviewer access can only be Board Chair or HR reviewer.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_cycle_id::text, 0)
  );

  if not exists (
    select 1
    from public.ed_review_reviewer_assignments
    where cycle_id = p_cycle_id
      and user_id = p_actor_user_id
      and role = 'board_chair'
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
    select count(*)
      into v_board_chair_count
      from public.ed_review_reviewer_assignments
      where cycle_id = p_cycle_id
        and role = 'board_chair';

    if v_board_chair_count <= 1 then
      raise exception 'Assign another Board Chair before changing or removing this access.';
    end if;
  end if;

  select exists (
    select 1
    from public.ed_review_reviewer_assignments
    where cycle_id = p_cycle_id
      and user_id = v_assignment.user_id
      and role = p_next_role
  )
    into v_role_exists;

  if v_role_exists then
    delete from public.ed_review_reviewer_assignments
      where id = v_assignment.id;
  else
    update public.ed_review_reviewer_assignments
      set role = p_next_role
      where id = v_assignment.id;
  end if;

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

create function public.revoke_ed_review_reviewer_assignment(
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
    from public.ed_review_reviewer_assignments
    where cycle_id = p_cycle_id
      and user_id = p_actor_user_id
      and role = 'board_chair'
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
    select count(*)
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

revoke all on function public.update_ed_review_reviewer_assignment(
  uuid,
  uuid,
  public.ed_review_reviewer_role,
  uuid
) from public, anon, authenticated;

revoke all on function public.revoke_ed_review_reviewer_assignment(uuid, uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.update_ed_review_reviewer_assignment(
  uuid,
  uuid,
  public.ed_review_reviewer_role,
  uuid
) to service_role;

grant execute on function public.revoke_ed_review_reviewer_assignment(uuid, uuid, uuid)
  to service_role;
