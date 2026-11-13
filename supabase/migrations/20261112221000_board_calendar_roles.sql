-- Board Calendar capabilities are separate from organization-wide administration.
alter table public.organization_invitations
  add column board_calendar_role text
  check (board_calendar_role in ('administrator', 'executive', 'chair', 'member'));

alter table public.organization_members
  add column board_calendar_role text
  check (board_calendar_role in ('administrator', 'executive', 'chair', 'member'));

create or replace function private.board_calendar_role(target_organization_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when members.role in ('owner', 'admin') then 'administrator'
    else coalesce(members.board_calendar_role, 'member')
  end
  from public.organization_members members
  where members.organization_id = target_organization_id
    and members.user_id = (select auth.uid())
    and members.status = 'active'
  limit 1;
$$;

-- Keep the existing seat, email and invitation checks in the established RPC.
-- Both calls run in the same transaction, so the Calendar role cannot be lost.
create or replace function public.create_board_calendar_team_invitation(
  target_organization_id uuid,
  target_email text,
  target_role public.organization_member_role,
  target_calendar_role text,
  raw_token text,
  target_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation_id uuid;
begin
  if target_calendar_role not in ('administrator', 'executive', 'chair', 'member') then
    raise exception 'Choose a valid Board Calendar role.';
  end if;
  if target_role = 'admin' and target_calendar_role <> 'administrator' then
    raise exception 'Team administrators have full Board Calendar access.';
  end if;
  if target_role = 'member' and target_calendar_role = 'administrator' then
    raise exception 'Choose the team administrator role for full Board Calendar access.';
  end if;

  invitation_id := team_private.create_team_invitation(
    target_organization_id, target_email, target_role, raw_token, target_expires_at
  );
  update public.organization_invitations
  set board_calendar_role = target_calendar_role
  where id = invitation_id;
  return invitation_id;
end;
$$;

revoke all on function public.create_board_calendar_team_invitation(
  uuid, text, public.organization_member_role, text, text, timestamptz
) from public, anon;
grant execute on function public.create_board_calendar_team_invitation(
  uuid, text, public.organization_member_role, text, text, timestamptz
) to authenticated, service_role;

-- The existing acceptance RPC inserts the member and then marks the invitation
-- accepted. Propagate the optional role as part of that same transaction.
create or replace function team_private.apply_board_calendar_invitation_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'accepted' and old.status is distinct from new.status
    and new.accepted_by is not null then
    update public.organization_members members
    set board_calendar_role = coalesce(new.board_calendar_role,
      case when members.role = 'admin' then 'administrator' else 'member' end)
    where members.organization_id = new.organization_id
      and members.user_id = new.accepted_by;
  end if;
  return new;
end;
$$;

create trigger organization_invitations_apply_board_calendar_role
  after update of status on public.organization_invitations
  for each row execute function team_private.apply_board_calendar_invitation_role();

create or replace function team_private.sync_board_calendar_role_on_team_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role then
    if new.role in ('owner', 'admin') then
      new.board_calendar_role := 'administrator';
    elsif old.role in ('owner', 'admin') then
      new.board_calendar_role := 'member';
    end if;
  end if;
  return new;
end;
$$;

create trigger organization_members_sync_board_calendar_role
  before update of role on public.organization_members
  for each row execute function team_private.sync_board_calendar_role_on_team_role_change();

create or replace function public.set_board_calendar_member_role(
  target_organization_id uuid,
  target_user_id uuid,
  target_calendar_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_org_role(
    target_organization_id,
    array['owner', 'admin']::public.organization_member_role[]
  ) then
    raise exception 'Only team administrators can change Board Calendar roles.';
  end if;
  if target_calendar_role not in ('executive', 'chair', 'member') then
    raise exception 'Choose a valid Board Calendar role for a team member.';
  end if;
  update public.organization_members
  set board_calendar_role = target_calendar_role
  where organization_id = target_organization_id
    and user_id = target_user_id
    and role = 'member'
    and status = 'active';
  if not found then raise exception 'This person is not an active team member.'; end if;
end;
$$;

revoke all on function public.set_board_calendar_member_role(uuid, uuid, text)
  from public, anon;
grant execute on function public.set_board_calendar_member_role(uuid, uuid, text)
  to authenticated, service_role;

-- RLS allows organization members to update template instances for other
-- modules. Enforce Calendar writes at the row boundary, including direct API
-- calls that bypass the Next.js action. Chairs may edit only meeting documents.
create or replace function private.enforce_board_calendar_instance_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  calendar_resource_id uuid := '10000000-0000-4000-8000-000000000007';
  calendar_role text;
begin
  if tg_op = 'INSERT' then
    if new.resource_id <> calendar_resource_id then return new; end if;
  elsif new.resource_id <> calendar_resource_id
    and old.resource_id <> calendar_resource_id then
    return new;
  end if;

  if (select auth.role()) = 'service_role' then return new; end if;

  calendar_role := private.board_calendar_role(new.organization_id);
  if calendar_role = 'administrator' then return new; end if;

  if tg_op = 'UPDATE' and calendar_role = 'chair'
    and new.organization_id = old.organization_id
    and new.resource_id = old.resource_id
    and new.title is not distinct from old.title
    and new.status is not distinct from old.status
    and new.schema_snapshot is not distinct from old.schema_snapshot
    and new.definition_version is not distinct from old.definition_version
    and new.branding_snapshot is not distinct from old.branding_snapshot
    and new.completion_percent is not distinct from old.completion_percent
    and (new.form_data - 'meeting_documents' - 'documents') is not distinct from
      (old.form_data - 'meeting_documents' - 'documents') then
    return new;
  end if;

  raise exception 'This Board Calendar role cannot change this calendar.';
end;
$$;

create trigger template_instances_board_calendar_write_guard
  before insert or update on public.template_instances
  for each row execute function private.enforce_board_calendar_instance_write();
