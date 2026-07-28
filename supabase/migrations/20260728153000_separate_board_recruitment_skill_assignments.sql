-- Keep administrator-managed skill assignments separate from member survey
-- responses. A skill assignment must not make an invitation look completed.
create table if not exists public.board_recruitment_skill_assignments (
  workspace_id uuid not null references public.board_recruitment_workspaces(id) on delete cascade,
  member_id uuid not null references public.board_recruitment_members(id) on delete cascade,
  skill_id uuid not null references public.board_recruitment_skills(id) on delete cascade,
  survey_year integer not null,
  assigned_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, member_id, skill_id, survey_year)
);

create index if not exists board_recruitment_skill_assignments_member_idx
  on public.board_recruitment_skill_assignments(workspace_id, member_id, survey_year);

insert into public.board_recruitment_skill_assignments (
  workspace_id,
  member_id,
  skill_id,
  survey_year
)
select workspace_id, member_id, skill_id, survey_year
from public.board_recruitment_responses
where has_skill
on conflict (workspace_id, member_id, skill_id, survey_year) do nothing;

alter table public.board_recruitment_skill_assignments enable row level security;

drop policy if exists board_recruitment_skill_assignments_access
  on public.board_recruitment_skill_assignments;
create policy board_recruitment_skill_assignments_access
  on public.board_recruitment_skill_assignments
  for all to authenticated
  using (exists (
    select 1
    from public.board_recruitment_workspaces w
    where w.id = workspace_id
      and (select private.has_org_role(
        w.organization_id,
        array['owner', 'admin']::public.organization_member_role[]
      ))
  ))
  with check (exists (
    select 1
    from public.board_recruitment_workspaces w
    where w.id = workspace_id
      and (select private.has_org_role(
        w.organization_id,
        array['owner', 'admin']::public.organization_member_role[]
      ))
  ));

create or replace function private.validate_board_recruitment_links()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if tg_table_name = 'board_recruitment_skills' then
    if not exists (
      select 1
      from public.board_recruitment_skill_categories categories
      where categories.id = new.category_id
        and categories.workspace_id = new.workspace_id
    ) then
      raise exception 'Skill category must belong to the same recruitment workspace';
    end if;
  elsif tg_table_name = 'board_recruitment_invitations' then
    if not exists (
      select 1
      from public.board_recruitment_members members
      where members.id = new.member_id
        and members.workspace_id = new.workspace_id
    ) then
      raise exception 'Recruitment member must belong to the same workspace';
    end if;
  elsif tg_table_name = 'board_recruitment_responses' then
    if not exists (
      select 1
      from public.board_recruitment_members members
      where members.id = new.member_id
        and members.workspace_id = new.workspace_id
    ) then
      raise exception 'Recruitment member must belong to the same workspace';
    end if;

    if not exists (
      select 1
      from public.board_recruitment_skills skills
      where skills.id = new.skill_id
        and skills.workspace_id = new.workspace_id
    ) then
      raise exception 'Recruitment skill must belong to the same workspace';
    end if;
  elsif tg_table_name = 'board_recruitment_committee_members' then
    if not exists (
      select 1
      from public.board_recruitment_committees committees
      join public.board_recruitment_members members
        on members.id = new.member_id
       and members.workspace_id = committees.workspace_id
      where committees.id = new.committee_id
    ) then
      raise exception 'Committee member must belong to the same workspace';
    end if;
  elsif tg_table_name = 'board_recruitment_skill_assignments' then
    if not exists (
      select 1
      from public.board_recruitment_members members
      where members.id = new.member_id
        and members.workspace_id = new.workspace_id
    ) then
      raise exception 'Recruitment member must belong to the same workspace';
    end if;

    if not exists (
      select 1
      from public.board_recruitment_skills skills
      where skills.id = new.skill_id
        and skills.workspace_id = new.workspace_id
    ) then
      raise exception 'Recruitment skill must belong to the same workspace';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists board_recruitment_skill_assignments_workspace_guard
  on public.board_recruitment_skill_assignments;
create trigger board_recruitment_skill_assignments_workspace_guard
  before insert or update of workspace_id, member_id, skill_id
  on public.board_recruitment_skill_assignments
  for each row execute function private.validate_board_recruitment_links();

revoke all on table public.board_recruitment_skill_assignments from anon;
