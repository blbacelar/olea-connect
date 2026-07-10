update public.resources
set
  status = 'archived',
  is_featured = false
where type = 'template'
  and slug in (
    'board-meeting-agenda',
    'director-onboarding-checklist',
    'conflict-of-interest-policy',
    'director-role-description',
    'governance-policy-manual'
  );

delete from public.resource_plan_access access
using public.resources resources
where access.resource_id = resources.id
  and resources.type = 'template'
  and resources.slug in (
    'board-meeting-agenda',
    'director-onboarding-checklist',
    'conflict-of-interest-policy',
    'director-role-description',
    'governance-policy-manual'
  );

delete from public.organization_resource_access access
using public.resources resources
where access.resource_id = resources.id
  and resources.type = 'template'
  and resources.slug in (
    'board-meeting-agenda',
    'director-onboarding-checklist',
    'conflict-of-interest-policy',
    'director-role-description',
    'governance-policy-manual'
  );

create or replace function private.can_access_resource(
  target_resource_id uuid,
  target_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_platform_admin(null)
    or (
      exists (
        select 1
        from public.resources resources
        where resources.id = target_resource_id
          and resources.status = 'published'
      )
      and private.is_org_member(target_organization_id)
      and (
        exists (
          select 1
          from public.organization_resource_access direct_access
          where direct_access.organization_id = target_organization_id
            and direct_access.resource_id = target_resource_id
            and direct_access.starts_at <= now()
            and (direct_access.ends_at is null or direct_access.ends_at > now())
        )
        or exists (
          select 1
          from public.subscriptions subscriptions
          join public.resource_plan_access plan_access
            on plan_access.plan_id = subscriptions.plan_id
          where subscriptions.organization_id = target_organization_id
            and subscriptions.status in ('trialing', 'active')
            and plan_access.resource_id = target_resource_id
        )
      )
    );
$$;

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
  selection_limit integer;
  published_template_count integer;
  required_selection_count integer;
begin
  select coalesce(array_agg(distinct resource_id order by resource_id), array[]::uuid[])
  into normalized_resource_ids
  from unnest(selected_resource_ids) as selected(resource_id);

  if not (
    (select private.has_org_role(
      target_organization_id,
      array['owner', 'admin']::public.organization_member_role[]
    ))
    or (select private.is_platform_admin(null))
  ) then
    raise exception 'Only organization owners and admins can select templates.';
  end if;

  select plans.template_selection_limit
  into selection_limit
  from public.subscriptions subscriptions
  join public.membership_plans plans on plans.id = subscriptions.plan_id
  where subscriptions.organization_id = target_organization_id
    and subscriptions.status in ('trialing', 'active')
    and subscriptions.plan_id = 'seedling'
  order by subscriptions.created_at desc
  limit 1;

  if selection_limit is null then
    raise exception 'Template selection only applies to Seedling memberships.';
  end if;

  select count(*)::integer
  into published_template_count
  from public.resources resources
  where resources.type = 'template'
    and resources.status = 'published';

  required_selection_count := least(selection_limit, published_template_count);

  if coalesce(array_length(normalized_resource_ids, 1), 0) <> required_selection_count then
    raise exception 'Choose exactly % templates.', required_selection_count;
  end if;

  if (
    select count(*)::integer
    from public.resources resources
    where resources.id = any(normalized_resource_ids)
      and resources.type = 'template'
      and resources.status = 'published'
  ) <> required_selection_count then
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
