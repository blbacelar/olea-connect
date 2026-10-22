-- Planning drafts belong to the organization that created them. Existing draft
-- rounds remain private until their ownership can be verified individually.
alter table public.grant_rounds
  add column planning_organization_id uuid
    references public.organizations(id) on delete set null;

comment on column public.grant_rounds.planning_organization_id is
  'Creator organization for drafts made in the Grant Platform workspace.';

-- grant_applications has an organization-scoped SELECT policy that does not
-- reference grant_rounds, so this existence check does not recurse through RLS.
create policy grant_rounds_read_creator_planning_drafts
  on public.grant_rounds for select to authenticated
  using (
    status = 'draft'
    and planning_organization_id is not null
    and (select private.is_org_member(planning_organization_id))
    and exists (
      select 1
      from public.grant_applications application
      where application.round_id = grant_rounds.id
        and application.organization_id = grant_rounds.planning_organization_id
        and application.eligibility_snapshot ->> 'source' = 'module_create'
    )
  );
