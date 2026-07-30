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
  actor_email_confirmed_at timestamptz;
  invitation_record public.organization_invitations%rowtype;
  seat_limit integer;
  active_seats integer;
begin
  if actor_id is null then
    raise exception 'Sign in to accept this invitation.';
  end if;

  select lower(email), email_confirmed_at
  into actor_email, actor_email_confirmed_at
  from auth.users
  where id = actor_id;

  if actor_email_confirmed_at is null then
    raise exception 'Confirm your email address before accepting this invitation.';
  end if;

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
