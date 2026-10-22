create or replace function public.submit_board_recruitment_response(
  p_token_hash text,
  p_answers jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_row public.board_recruitment_invitations%rowtype;
  expected_count integer;
  answer_count integer;
begin
  select *
    into invitation_row
    from public.board_recruitment_invitations
   where token_hash = p_token_hash
   for update;

  if not found or invitation_row.expires_at <= now() then
    raise exception 'This survey link has expired.' using errcode = 'P0001';
  end if;

  if invitation_row.status = 'responded' then
    raise exception 'This survey has already been submitted.' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
      from public.board_recruitment_members member
     where member.id = invitation_row.member_id
       and member.workspace_id = invitation_row.workspace_id
       and member.member_type = 'director'
       and member.active
  ) then
    raise exception 'This survey is no longer available.' using errcode = 'P0001';
  end if;

  if jsonb_typeof(p_answers) <> 'object' or exists (
    select 1
      from jsonb_each(p_answers) answer(key, value)
     where answer.key !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
        or jsonb_typeof(answer.value) <> 'boolean'
  ) then
    raise exception 'The survey response is incomplete or invalid.' using errcode = 'P0001';
  end if;

  select count(*)
    into expected_count
    from public.board_recruitment_skills
   where workspace_id = invitation_row.workspace_id;

  select count(*)
    into answer_count
    from jsonb_object_keys(p_answers);

  if expected_count <> answer_count or exists (
    select 1
      from jsonb_object_keys(p_answers) answer(key)
     where not exists (
       select 1
         from public.board_recruitment_skills skill
        where skill.id = answer.key::uuid
          and skill.workspace_id = invitation_row.workspace_id
     )
  ) then
    raise exception 'The survey response is incomplete or invalid.' using errcode = 'P0001';
  end if;

  insert into public.board_recruitment_responses (
    workspace_id,
    member_id,
    skill_id,
    survey_year,
    has_skill,
    updated_at
  )
  select
    invitation_row.workspace_id,
    invitation_row.member_id,
    answer.key::uuid,
    invitation_row.survey_year,
    answer.value::boolean,
    now()
  from jsonb_each(p_answers) answer
  on conflict (workspace_id, member_id, skill_id, survey_year)
  do update set
    has_skill = excluded.has_skill,
    updated_at = excluded.updated_at;

  update public.board_recruitment_invitations
     set status = 'responded',
         responded_at = now()
   where id = invitation_row.id;
end;
$$;

revoke all on function public.submit_board_recruitment_response(text, jsonb) from public;
grant execute on function public.submit_board_recruitment_response(text, jsonb) to anon, authenticated;
