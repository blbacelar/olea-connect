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
    from auth.users users
    where lower(users.email) = normalized_email
  ) then
    raise exception 'This email already has an Olea Connects account. Invite a new email address, or ask support to move the existing account.';
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
