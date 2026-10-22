-- Board Recruitment is an administrative workspace. Keep both the server
-- actions and direct authenticated Supabase clients behind the same boundary.
drop policy if exists board_recruitment_workspace_access on public.board_recruitment_workspaces;
create policy board_recruitment_workspace_access
  on public.board_recruitment_workspaces
  for all to authenticated
  using (
    (select private.has_org_role(
      organization_id,
      array['owner', 'admin']::public.organization_member_role[]
    ))
  )
  with check (
    (select private.has_org_role(
      organization_id,
      array['owner', 'admin']::public.organization_member_role[]
    ))
  );

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'board_recruitment_members',
    'board_recruitment_skill_categories',
    'board_recruitment_skills',
    'board_recruitment_invitations',
    'board_recruitment_responses',
    'board_recruitment_committees'
  ] loop
    execute format('drop policy if exists board_recruitment_org_access on public.%I', table_name);
    execute format(
      'create policy board_recruitment_org_access on public.%I
       for all to authenticated
       using (exists (
         select 1 from public.board_recruitment_workspaces w
         where w.id = workspace_id
           and (select private.has_org_role(
             w.organization_id,
             array[''owner'', ''admin'']::public.organization_member_role[]
           ))
       ))
       with check (exists (
         select 1 from public.board_recruitment_workspaces w
         where w.id = workspace_id
           and (select private.has_org_role(
             w.organization_id,
             array[''owner'', ''admin'']::public.organization_member_role[]
           ))
       ))',
      table_name
    );
  end loop;
end $$;

drop policy if exists board_recruitment_committee_members_access on public.board_recruitment_committee_members;
create policy board_recruitment_committee_members_access
  on public.board_recruitment_committee_members
  for all to authenticated
  using (exists (
    select 1
    from public.board_recruitment_committees c
    join public.board_recruitment_workspaces w on w.id = c.workspace_id
    where c.id = committee_id
      and (select private.has_org_role(
        w.organization_id,
        array['owner', 'admin']::public.organization_member_role[]
      ))
  ))
  with check (exists (
    select 1
    from public.board_recruitment_committees c
    join public.board_recruitment_workspaces w on w.id = c.workspace_id
    where c.id = committee_id
      and (select private.has_org_role(
        w.organization_id,
        array['owner', 'admin']::public.organization_member_role[]
      ))
  ));

-- Foreign keys on the individual UUIDs do not prevent a valid member or
-- skill from another workspace being paired with this workspace. These
-- triggers enforce the composite relationship for every SQL client.
create or replace function private.validate_board_recruitment_links()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if tg_table_name = 'board_recruitment_skills' and not exists (
    select 1
    from public.board_recruitment_skill_categories categories
    where categories.id = new.category_id
      and categories.workspace_id = new.workspace_id
  ) then
    raise exception 'Skill category must belong to the same recruitment workspace';
  end if;

  if tg_table_name in ('board_recruitment_invitations', 'board_recruitment_responses')
    and not exists (
      select 1
      from public.board_recruitment_members members
      where members.id = new.member_id
        and members.workspace_id = new.workspace_id
    ) then
    raise exception 'Recruitment member must belong to the same workspace';
  end if;

  if tg_table_name = 'board_recruitment_responses' and not exists (
    select 1
    from public.board_recruitment_skills skills
    where skills.id = new.skill_id
      and skills.workspace_id = new.workspace_id
  ) then
    raise exception 'Recruitment skill must belong to the same workspace';
  end if;

  if tg_table_name = 'board_recruitment_committee_members' and not exists (
    select 1
    from public.board_recruitment_committees committees
    join public.board_recruitment_members members
      on members.id = new.member_id
     and members.workspace_id = committees.workspace_id
    where committees.id = new.committee_id
  ) then
    raise exception 'Committee member must belong to the same workspace';
  end if;

  return new;
end;
$$;

drop trigger if exists board_recruitment_skills_workspace_guard
  on public.board_recruitment_skills;
create trigger board_recruitment_skills_workspace_guard
  before insert or update of workspace_id, category_id
  on public.board_recruitment_skills
  for each row execute function private.validate_board_recruitment_links();

drop trigger if exists board_recruitment_invitations_workspace_guard
  on public.board_recruitment_invitations;
create trigger board_recruitment_invitations_workspace_guard
  before insert or update of workspace_id, member_id
  on public.board_recruitment_invitations
  for each row execute function private.validate_board_recruitment_links();

drop trigger if exists board_recruitment_responses_workspace_guard
  on public.board_recruitment_responses;
create trigger board_recruitment_responses_workspace_guard
  before insert or update of workspace_id, member_id, skill_id
  on public.board_recruitment_responses
  for each row execute function private.validate_board_recruitment_links();

drop trigger if exists board_recruitment_committee_members_workspace_guard
  on public.board_recruitment_committee_members;
create trigger board_recruitment_committee_members_workspace_guard
  before insert or update of committee_id, member_id
  on public.board_recruitment_committee_members
  for each row execute function private.validate_board_recruitment_links();

revoke all on function private.validate_board_recruitment_links() from public, anon, authenticated;
