-- Every membership-gated path uses the same one-year rule for sponsor-funded
-- manual subscriptions. Stripe and other paid subscriptions retain their
-- existing status-based access policy.
create function private.subscription_grants_access(target_subscription_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions as subscription
    where subscription.id = target_subscription_id
      and subscription.status in ('trialing', 'active')
      and (
        subscription.provider <> 'manual'
        or (
          subscription.metadata->>'funding_source' is distinct from 'sponsorship'
          and not exists (
            select 1 from public.sponsored_memberships as placement
            where placement.subscription_id = subscription.id
          )
        )
        or (
          subscription.current_period_end > now()
          and exists (
            select 1 from public.sponsored_memberships as placement
            where placement.subscription_id = subscription.id
              and placement.status = 'active'
              and placement.ends_at > now()
          )
        )
      )
  );
$$;

revoke all on function private.subscription_grants_access(uuid)
  from public, anon, authenticated;
grant execute on function private.subscription_grants_access(uuid)
  to service_role;

create or replace function public.has_current_subscription()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members as membership
    join public.subscriptions as subscription
      on subscription.organization_id = membership.organization_id
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and private.subscription_grants_access(subscription.id)
  )
  or exists (
    select 1 from public.platform_user_roles as role
    where role.user_id = (select auth.uid())
  );
$$;

create or replace function private.has_active_member_subscription()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members as member
    join public.subscriptions as subscription
      on subscription.organization_id = member.organization_id
    where member.user_id = (select auth.uid())
      and member.status = 'active'
      and private.subscription_grants_access(subscription.id)
  );
$$;

create or replace function private.can_access_community_space(target_space_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select
    private.is_platform_admin(array['super_admin', 'community_admin']::public.platform_role[])
    or exists (
      select 1
      from public.community_spaces as space
      join public.communities as community
        on community.id = space.community_id
      join public.organization_members as member
        on member.user_id = (select auth.uid())
       and member.status = 'active'
      join public.subscriptions as subscription
        on subscription.organization_id = member.organization_id
       and private.subscription_grants_access(subscription.id)
      where space.id = target_space_id
        and space.status = 'active'
        and community.status = 'active'
        and (
          not exists (
            select 1 from public.community_space_access_rules as rule
            where rule.space_id = space.id
          )
          or exists (
            select 1 from public.community_space_access_rules as rule
            where rule.space_id = space.id
              and rule.plan_id = subscription.plan_id
          )
        )
    );
$$;

create or replace function private.can_access_event(
  target_event_id uuid,
  target_organization_id uuid
)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select
    private.is_platform_admin(null)
    or (
      private.is_org_member(target_organization_id)
      and exists (
        select 1
        from public.subscriptions as subscription
        join public.event_plan_access as event_access
          on event_access.plan_id = subscription.plan_id
        where subscription.organization_id = target_organization_id
          and private.subscription_grants_access(subscription.id)
          and event_access.event_id = target_event_id
          and (
            event_access.included
            or event_access.complimentary_ticket_limit is not null
            or event_access.ticket_price_cents is not null
          )
      )
    );
$$;

create or replace function private.can_register_for_event(
  target_event_id uuid,
  target_organization_id uuid
)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select
    private.is_platform_admin(null)
    or (
      private.is_org_member(target_organization_id)
      and exists (
        select 1
        from public.subscriptions as subscription
        join public.event_plan_access as event_access
          on event_access.plan_id = subscription.plan_id
        where subscription.organization_id = target_organization_id
          and private.subscription_grants_access(subscription.id)
          and event_access.event_id = target_event_id
          and event_access.included
      )
    );
$$;

revoke all on function public.has_current_subscription() from public, anon;
grant execute on function public.has_current_subscription() to authenticated, service_role;
revoke all on function private.has_active_member_subscription() from public, anon;
grant execute on function private.has_active_member_subscription() to authenticated;
revoke all on function private.can_access_community_space(uuid) from public, anon;
grant execute on function private.can_access_community_space(uuid) to authenticated;
revoke all on function private.can_access_event(uuid, uuid) from public, anon;
grant execute on function private.can_access_event(uuid, uuid) to authenticated;
revoke all on function private.can_register_for_event(uuid, uuid) from public, anon;
grant execute on function private.can_register_for_event(uuid, uuid) to authenticated;
