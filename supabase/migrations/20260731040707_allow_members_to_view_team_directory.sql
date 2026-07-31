create or replace function team_private.team_directory(
  target_organization_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_org_member(target_organization_id) then
    raise exception 'Only active organization members can view the team directory.';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'user_id', members.user_id,
        'email', users.email,
        'full_name', coalesce(profiles.full_name, split_part(users.email, '@', 1)),
        'role', members.role,
        'status', members.status,
        'joined_at', members.joined_at
      )
      order by
        case members.role when 'owner' then 1 when 'admin' then 2 else 3 end,
        coalesce(profiles.full_name, users.email)
    )
    from public.organization_members members
    join auth.users users on users.id = members.user_id
    left join public.profiles profiles on profiles.id = members.user_id
    where members.organization_id = target_organization_id
  ), '[]'::jsonb);
end;
$$;
