create schema if not exists team_private;
revoke all on schema team_private from public;

create or replace function team_private.organization_seat_limit(
  target_organization_id uuid
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select plans.included_seats + coalesce((
      select sum(items.quantity)::integer
      from public.subscription_items items
      where items.subscription_id = subscriptions.id
        and items.item_type = 'seat'
        and items.active
    ), 0)
    from public.subscriptions subscriptions
    join public.membership_plans plans on plans.id = subscriptions.plan_id
    where subscriptions.organization_id = target_organization_id
      and subscriptions.status in ('trialing', 'active')
    order by subscriptions.created_at desc
    limit 1
  ), 0);
$$;

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
  if not private.has_org_role(
    target_organization_id,
    array['owner', 'admin']::public.organization_member_role[]
  ) then
    raise exception 'Only organization owners and admins can view the team directory.';
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

create or replace function team_private.create_team_invitation(
  target_organization_id uuid,
  target_email text,
  target_role public.organization_member_role,
  raw_token text,
  target_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  normalized_email text := lower(trim(target_email));
  invitation_id uuid;
  seat_limit integer;
  reserved_seats integer;
begin
  if not private.has_org_role(
    target_organization_id,
    array['owner', 'admin']::public.organization_member_role[]
  ) then
    raise exception 'Only organization owners and admins can invite members.';
  end if;

  if target_role not in ('admin', 'member') then
    raise exception 'Invitations may assign the admin or member role.';
  end if;

  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid email address.';
  end if;

  if char_length(raw_token) < 32 then
    raise exception 'Invitation token is invalid.';
  end if;

  if target_expires_at <= now() or target_expires_at > now() + interval '30 days' then
    raise exception 'Invitation expiry must be within the next 30 days.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_organization_id::text, 0));

  update public.organization_invitations
  set status = 'expired'
  where organization_id = target_organization_id
    and status = 'pending'
    and expires_at <= now();

  if exists (
    select 1
    from public.organization_members members
    join auth.users users on users.id = members.user_id
    where members.organization_id = target_organization_id
      and lower(users.email) = normalized_email
      and members.status in ('active', 'suspended')
  ) then
    raise exception 'This person already belongs to the organization.';
  end if;

  if exists (
    select 1
    from public.organization_invitations invitations
    where invitations.organization_id = target_organization_id
      and invitations.email = normalized_email
      and invitations.status = 'pending'
      and invitations.expires_at > now()
  ) then
    raise exception 'A pending invitation already exists for this email.';
  end if;

  seat_limit := team_private.organization_seat_limit(target_organization_id);

  select
    (
      select count(*)
      from public.organization_members members
      where members.organization_id = target_organization_id
        and members.status = 'active'
    ) + (
      select count(*)
      from public.organization_invitations invitations
      where invitations.organization_id = target_organization_id
        and invitations.status = 'pending'
        and invitations.expires_at > now()
    )
  into reserved_seats;

  if reserved_seats >= seat_limit then
    raise exception 'Your plan has no available team seats.';
  end if;

  insert into public.organization_invitations (
    organization_id,
    email,
    role,
    token_hash,
    invited_by,
    expires_at
  )
  values (
    target_organization_id,
    normalized_email,
    target_role,
    encode(extensions.digest(raw_token, 'sha256'), 'hex'),
    actor_id,
    target_expires_at
  )
  returning id into invitation_id;

  insert into public.integration_events (
    event_type,
    aggregate_type,
    aggregate_id,
    provider,
    payload,
    idempotency_key
  )
  values (
    'organization.invitation.created',
    'organization_invitation',
    invitation_id::text,
    'email',
    jsonb_build_object(
      'invitation_id', invitation_id,
      'organization_id', target_organization_id,
      'email', normalized_email,
      'role', target_role,
      'token', raw_token,
      'expires_at', target_expires_at,
      'accept_path', '/team/invitations/accept?token=' || raw_token
    ),
    'organization_invitation.created:' || invitation_id::text
  );

  insert into public.audit_logs (
    actor_user_id,
    organization_id,
    action,
    entity_type,
    entity_id,
    changes
  )
  values (
    actor_id,
    target_organization_id,
    'organization.invitation.created',
    'organization_invitation',
    invitation_id::text,
    jsonb_build_object('email', normalized_email, 'role', target_role)
  );

  return invitation_id;
end;
$$;

create or replace function team_private.revoke_team_invitation(
  target_invitation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation_record public.organization_invitations%rowtype;
begin
  select *
  into invitation_record
  from public.organization_invitations
  where id = target_invitation_id
  for update;

  if not found then
    return false;
  end if;

  if not private.has_org_role(
    invitation_record.organization_id,
    array['owner', 'admin']::public.organization_member_role[]
  ) then
    raise exception 'Only organization owners and admins can revoke invitations.';
  end if;

  if invitation_record.status <> 'pending' then
    return false;
  end if;

  update public.organization_invitations
  set status = 'revoked'
  where id = invitation_record.id;

  insert into public.audit_logs (
    actor_user_id,
    organization_id,
    action,
    entity_type,
    entity_id,
    changes
  )
  values (
    auth.uid(),
    invitation_record.organization_id,
    'organization.invitation.revoked',
    'organization_invitation',
    invitation_record.id::text,
    jsonb_build_object('email', invitation_record.email)
  );

  return true;
end;
$$;

create or replace function team_private.accept_team_invitation(
  raw_token text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_email text;
  invitation_record public.organization_invitations%rowtype;
  seat_limit integer;
  active_seats integer;
begin
  if actor_id is null then
    raise exception 'Sign in to accept this invitation.';
  end if;

  select lower(email)
  into actor_email
  from auth.users
  where id = actor_id;

  select *
  into invitation_record
  from public.organization_invitations
  where token_hash = encode(extensions.digest(raw_token, 'sha256'), 'hex')
  for update;

  if not found then
    raise exception 'This invitation is invalid.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(invitation_record.organization_id::text, 0)
  );

  if invitation_record.status <> 'pending' then
    raise exception 'This invitation is no longer available.';
  end if;

  if invitation_record.expires_at <= now() then
    update public.organization_invitations
    set status = 'expired'
    where id = invitation_record.id;
    raise exception 'This invitation has expired.';
  end if;

  if actor_email <> invitation_record.email then
    raise exception 'This invitation belongs to a different email address.';
  end if;

  if exists (
    select 1
    from public.organization_members members
    where members.user_id = actor_id
      and members.organization_id <> invitation_record.organization_id
      and members.status = 'active'
  ) then
    raise exception 'This account already belongs to another organization.';
  end if;

  seat_limit := team_private.organization_seat_limit(
    invitation_record.organization_id
  );

  select count(*)
  into active_seats
  from public.organization_members members
  where members.organization_id = invitation_record.organization_id
    and members.status = 'active';

  if active_seats >= seat_limit then
    raise exception 'This organization has no available team seats.';
  end if;

  insert into public.organization_members (
    organization_id,
    user_id,
    role,
    status,
    invited_by,
    joined_at
  )
  values (
    invitation_record.organization_id,
    actor_id,
    invitation_record.role,
    'active',
    invitation_record.invited_by,
    now()
  )
  on conflict (organization_id, user_id) do update
  set
    role = excluded.role,
    status = 'active',
    invited_by = excluded.invited_by,
    joined_at = coalesce(public.organization_members.joined_at, now());

  update public.organization_invitations
  set
    status = 'accepted',
    accepted_by = actor_id,
    accepted_at = now()
  where id = invitation_record.id;

  update public.organization_invitations
  set status = 'revoked'
  where organization_id = invitation_record.organization_id
    and email = invitation_record.email
    and status = 'pending'
    and id <> invitation_record.id;

  insert into public.audit_logs (
    actor_user_id,
    organization_id,
    action,
    entity_type,
    entity_id,
    changes
  )
  values (
    actor_id,
    invitation_record.organization_id,
    'organization.invitation.accepted',
    'organization_member',
    actor_id::text,
    jsonb_build_object('role', invitation_record.role)
  );

  return jsonb_build_object(
    'organization_id', invitation_record.organization_id,
    'role', invitation_record.role
  );
end;
$$;

create or replace function team_private.manage_team_member(
  target_organization_id uuid,
  target_user_id uuid,
  target_role public.organization_member_role default null,
  target_status public.organization_member_status default null,
  remove_member boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_role public.organization_member_role;
  member_record public.organization_members%rowtype;
  resulting_role public.organization_member_role;
  resulting_status public.organization_member_status;
  active_owner_count integer;
  seat_limit integer;
  active_seats integer;
begin
  select role
  into actor_role
  from public.organization_members
  where organization_id = target_organization_id
    and user_id = actor_id
    and status = 'active';

  if actor_role not in ('owner', 'admin') then
    raise exception 'Only organization owners and admins can manage members.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(target_organization_id::text, 0)
  );

  select *
  into member_record
  from public.organization_members
  where organization_id = target_organization_id
    and user_id = target_user_id
  for update;

  if not found then
    raise exception 'Team member was not found.';
  end if;

  if actor_role = 'admin' and (
    member_record.role = 'owner'
    or target_role = 'owner'
  ) then
    raise exception 'Only an owner can manage organization owners.';
  end if;

  resulting_role := coalesce(target_role, member_record.role);
  resulting_status := coalesce(target_status, member_record.status);

  if remove_member
    or resulting_role <> 'owner'
    or resulting_status <> 'active'
  then
    if member_record.role = 'owner' and member_record.status = 'active' then
      select count(*)
      into active_owner_count
      from public.organization_members
      where organization_id = target_organization_id
        and role = 'owner'
        and status = 'active';

      if active_owner_count <= 1 then
        raise exception 'An organization must retain at least one active owner.';
      end if;
    end if;
  end if;

  if not remove_member
    and member_record.status <> 'active'
    and resulting_status = 'active'
  then
    seat_limit := team_private.organization_seat_limit(target_organization_id);

    select count(*)
    into active_seats
    from public.organization_members
    where organization_id = target_organization_id
      and status = 'active';

    if active_seats >= seat_limit then
      raise exception 'Your plan has no available team seats.';
    end if;
  end if;

  if remove_member then
    delete from public.organization_members
    where organization_id = target_organization_id
      and user_id = target_user_id;
  else
    update public.organization_members
    set
      role = resulting_role,
      status = resulting_status
    where organization_id = target_organization_id
      and user_id = target_user_id;
  end if;

  insert into public.audit_logs (
    actor_user_id,
    organization_id,
    action,
    entity_type,
    entity_id,
    changes
  )
  values (
    actor_id,
    target_organization_id,
    case
      when remove_member then 'organization.member.removed'
      when resulting_status = 'suspended' then 'organization.member.suspended'
      when member_record.status = 'suspended' and resulting_status = 'active'
        then 'organization.member.reactivated'
      else 'organization.member.updated'
    end,
    'organization_member',
    target_user_id::text,
    jsonb_build_object(
      'before', jsonb_build_object(
        'role', member_record.role,
        'status', member_record.status
      ),
      'after', case
        when remove_member then null
        else jsonb_build_object(
          'role', resulting_role,
          'status', resulting_status
        )
      end
    )
  );

  return true;
end;
$$;

create or replace function public.get_team_directory(
  target_organization_id uuid
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select team_private.team_directory(target_organization_id);
$$;

create or replace function public.create_team_invitation(
  target_organization_id uuid,
  target_email text,
  target_role public.organization_member_role,
  raw_token text,
  target_expires_at timestamptz
)
returns uuid
language sql
set search_path = ''
as $$
  select team_private.create_team_invitation(
    target_organization_id,
    target_email,
    target_role,
    raw_token,
    target_expires_at
  );
$$;

create or replace function public.revoke_team_invitation(
  target_invitation_id uuid
)
returns boolean
language sql
set search_path = ''
as $$
  select team_private.revoke_team_invitation(target_invitation_id);
$$;

create or replace function public.accept_team_invitation(raw_token text)
returns jsonb
language sql
set search_path = ''
as $$
  select team_private.accept_team_invitation(raw_token);
$$;

create or replace function public.manage_team_member(
  target_organization_id uuid,
  target_user_id uuid,
  target_role public.organization_member_role default null,
  target_status public.organization_member_status default null,
  remove_member boolean default false
)
returns boolean
language sql
set search_path = ''
as $$
  select team_private.manage_team_member(
    target_organization_id,
    target_user_id,
    target_role,
    target_status,
    remove_member
  );
$$;

drop policy if exists "organization_members_insert_admin"
  on public.organization_members;
drop policy if exists "organization_members_update_admin"
  on public.organization_members;
drop policy if exists "organization_members_delete_admin"
  on public.organization_members;
drop policy if exists "organization_invitations_insert_admin"
  on public.organization_invitations;
drop policy if exists "organization_invitations_update_admin"
  on public.organization_invitations;

revoke insert, update, delete on public.organization_members from authenticated;
revoke insert, update on public.organization_invitations from authenticated;

revoke all on function public.get_team_directory(uuid) from public, anon;
grant execute on function public.get_team_directory(uuid)
  to authenticated, service_role;

revoke all on function public.create_team_invitation(
  uuid,
  text,
  public.organization_member_role,
  text,
  timestamptz
) from public, anon;
grant execute on function public.create_team_invitation(
  uuid,
  text,
  public.organization_member_role,
  text,
  timestamptz
) to authenticated, service_role;

revoke all on function public.revoke_team_invitation(uuid) from public, anon;
grant execute on function public.revoke_team_invitation(uuid)
  to authenticated, service_role;

revoke all on function public.accept_team_invitation(text) from public, anon;
grant execute on function public.accept_team_invitation(text)
  to authenticated, service_role;

revoke all on function public.manage_team_member(
  uuid,
  uuid,
  public.organization_member_role,
  public.organization_member_status,
  boolean
) from public, anon;
grant execute on function public.manage_team_member(
  uuid,
  uuid,
  public.organization_member_role,
  public.organization_member_status,
  boolean
) to authenticated, service_role;

grant usage on schema team_private to authenticated, service_role;
revoke all on function team_private.organization_seat_limit(uuid) from public;
revoke all on function team_private.team_directory(uuid) from public;
revoke all on function team_private.create_team_invitation(
  uuid,
  text,
  public.organization_member_role,
  text,
  timestamptz
) from public;
revoke all on function team_private.revoke_team_invitation(uuid) from public;
revoke all on function team_private.accept_team_invitation(text) from public;
revoke all on function team_private.manage_team_member(
  uuid,
  uuid,
  public.organization_member_role,
  public.organization_member_status,
  boolean
) from public;

grant execute on function team_private.team_directory(uuid)
  to authenticated, service_role;
grant execute on function team_private.create_team_invitation(
  uuid,
  text,
  public.organization_member_role,
  text,
  timestamptz
) to authenticated, service_role;
grant execute on function team_private.revoke_team_invitation(uuid)
  to authenticated, service_role;
grant execute on function team_private.accept_team_invitation(text)
  to authenticated, service_role;
grant execute on function team_private.manage_team_member(
  uuid,
  uuid,
  public.organization_member_role,
  public.organization_member_status,
  boolean
) to authenticated, service_role;
