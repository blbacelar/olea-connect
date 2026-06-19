create or replace function private.enforce_resource_selection_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selection_limit integer;
  current_selections integer;
begin
  if new.access_kind <> 'selection' then
    return new;
  end if;

  if not exists (
    select 1
    from public.resources resources
    where resources.id = new.resource_id
      and resources.type = 'template'
      and resources.status = 'published'
  ) then
    raise exception 'Only published templates can be selected';
  end if;

  select plans.template_selection_limit
  into selection_limit
  from public.subscriptions subscriptions
  join public.membership_plans plans on plans.id = subscriptions.plan_id
  where subscriptions.organization_id = new.organization_id
    and subscriptions.status in ('trialing', 'active')
  order by subscriptions.created_at desc
  limit 1;

  if selection_limit is null then
    raise exception 'The active plan does not use resource selections';
  end if;

  select count(*)
  into current_selections
  from public.organization_resource_access access
  where access.organization_id = new.organization_id
    and access.access_kind = 'selection'
    and access.id <> new.id
    and (access.ends_at is null or access.ends_at > now());

  if current_selections >= selection_limit then
    raise exception 'The organization has reached its resource selection limit';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_resource_selection_limit() from public;

grant delete on public.organization_resource_access to authenticated;

create policy "organization_resource_access_delete_admin"
  on public.organization_resource_access for delete to authenticated
  using (
    (
      access_kind = 'selection'
      and (select private.has_org_role(
        organization_id,
        array['owner', 'admin']::public.organization_member_role[]
      ))
    )
    or (select private.is_platform_admin(null))
  );

create or replace function public.replace_seedling_template_selections(
  target_organization_id uuid,
  selected_resource_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized_resource_ids uuid[];
  active_lock timestamptz;
begin
  select coalesce(array_agg(distinct resource_id order by resource_id), array[]::uuid[])
  into normalized_resource_ids
  from unnest(selected_resource_ids) as selected(resource_id);

  if coalesce(array_length(normalized_resource_ids, 1), 0) <> 3 then
    raise exception 'Choose exactly three templates.';
  end if;

  if not (
    (select private.has_org_role(
      target_organization_id,
      array['owner', 'admin']::public.organization_member_role[]
    ))
    or (select private.is_platform_admin(null))
  ) then
    raise exception 'Only organization owners and admins can select templates.';
  end if;

  if not exists (
    select 1
    from public.subscriptions subscriptions
    join public.membership_plans plans on plans.id = subscriptions.plan_id
    where subscriptions.organization_id = target_organization_id
      and subscriptions.status in ('trialing', 'active')
      and subscriptions.plan_id = 'seedling'
      and plans.template_selection_limit = 3
  ) then
    raise exception 'Template selection only applies to Seedling memberships.';
  end if;

  if (
    select count(*)::integer
    from public.resources resources
    where resources.id = any(normalized_resource_ids)
      and resources.type = 'template'
      and resources.status = 'published'
  ) <> 3 then
    raise exception 'One or more selected templates are unavailable.';
  end if;

  if exists (
    select 1
    from public.organization_resource_access access
    where access.organization_id = target_organization_id
      and access.access_kind = 'selection'
  )
    and not exists (
      select 1
      from public.organization_resource_access access
      where access.organization_id = target_organization_id
        and access.access_kind = 'selection'
        and not (access.resource_id = any(normalized_resource_ids))
    )
    and not exists (
      select 1
      from unnest(normalized_resource_ids) selected(resource_id)
      where not exists (
        select 1
        from public.organization_resource_access access
        where access.organization_id = target_organization_id
          and access.access_kind = 'selection'
          and access.resource_id = selected.resource_id
      )
    )
  then
    return;
  end if;

  select min(access.locked_until)
  into active_lock
  from public.organization_resource_access access
  where access.organization_id = target_organization_id
    and access.access_kind = 'selection'
    and access.locked_until > now();

  if active_lock is not null then
    raise exception 'Template selection is locked until %', active_lock;
  end if;

  delete from public.organization_resource_access access
  where access.organization_id = target_organization_id
    and access.access_kind = 'selection';

  insert into public.organization_resource_access (
    organization_id,
    resource_id,
    access_kind,
    granted_by
  )
  select
    target_organization_id,
    selected.resource_id,
    'selection'::public.resource_access_kind,
    (select auth.uid())
  from unnest(normalized_resource_ids) selected(resource_id);
end;
$$;

grant execute on function public.replace_seedling_template_selections(uuid, uuid[])
  to authenticated;
