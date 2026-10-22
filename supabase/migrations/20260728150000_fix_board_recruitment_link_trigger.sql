-- Keep trigger validation table-specific. A shared trigger function must not
-- dereference columns that are absent from the table firing the trigger.
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
  end if;

  return new;
end;
$$;
