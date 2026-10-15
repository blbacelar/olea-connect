-- Keep historical plan rows for subscription foreign keys and billing history.
-- Only Seedling, Roots, and Canopy remain available to new members.
update public.membership_plans
set is_active = id in ('seedling', 'roots', 'canopy')
where is_active is distinct from (id in ('seedling', 'roots', 'canopy'));

-- Retired plans are hidden from the public catalogue. Members with a legacy
-- subscription can still read its plan name and included-seat count.
drop policy if exists "membership_plans_read" on public.membership_plans;
create policy "membership_plans_public_active"
  on public.membership_plans for select
  to anon
  using (is_active);

create policy "membership_plans_member_read"
  on public.membership_plans for select
  to authenticated
  using (
    is_active
    or (select private.is_platform_admin(null))
    or exists (
      select 1
      from public.subscriptions subscriptions
      where subscriptions.plan_id = membership_plans.id
        and (select private.is_org_member(subscriptions.organization_id))
    )
  );
