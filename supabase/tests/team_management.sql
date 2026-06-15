begin;

select plan(19);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '42000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'team-owner@example.com',
    '',
    now(),
    '{}'::jsonb,
    '{"full_name":"Team Owner"}'::jsonb,
    now(),
    now()
  ),
  (
    '42000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'team-invitee@example.com',
    '',
    now(),
    '{}'::jsonb,
    '{"full_name":"Team Invitee"}'::jsonb,
    now(),
    now()
  ),
  (
    '42000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'wrong-invitee@example.com',
    '',
    now(),
    '{}'::jsonb,
    '{"full_name":"Wrong Invitee"}'::jsonb,
    now(),
    now()
  ),
  (
    '42000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'team-member@example.com',
    '',
    now(),
    '{}'::jsonb,
    '{"full_name":"Team Member"}'::jsonb,
    now(),
    now()
  );

insert into public.organizations (id, name, slug, created_by)
values (
  '52000000-0000-0000-0000-000000000001',
  'Team Management Org',
  'team-management-org',
  '42000000-0000-0000-0000-000000000001'
);

insert into public.organization_members (
  organization_id,
  user_id,
  role,
  status,
  joined_at
)
values
  (
    '52000000-0000-0000-0000-000000000001',
    '42000000-0000-0000-0000-000000000001',
    'owner',
    'active',
    now()
  ),
  (
    '52000000-0000-0000-0000-000000000001',
    '42000000-0000-0000-0000-000000000004',
    'member',
    'suspended',
    now()
  );

insert into public.subscriptions (
  id,
  organization_id,
  plan_id,
  provider,
  billing_interval,
  status
)
values (
  '62000000-0000-0000-0000-000000000001',
  '52000000-0000-0000-0000-000000000001',
  'roots',
  'manual',
  'month',
  'active'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"42000000-0000-0000-0000-000000000004","role":"authenticated"}',
  true
);

select throws_ok(
  $test$
    select public.create_team_invitation(
      '52000000-0000-0000-0000-000000000001',
      'denied@example.com',
      'member',
      'denied-token-that-is-at-least-thirty-two-characters',
      now() + interval '7 days'
    )
  $test$,
  'Only organization owners and admins can invite members.',
  'ordinary members cannot create invitations'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"42000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select lives_ok(
  $test$
    select public.create_team_invitation(
      '52000000-0000-0000-0000-000000000001',
      'team-invitee@example.com',
      'member',
      'valid-team-invitation-token-that-is-long-enough',
      now() + interval '7 days'
    )
  $test$,
  'an owner can reserve an available seat with an invitation'
);

select is(
  (
    select count(*)::integer
    from public.organization_invitations
    where organization_id = '52000000-0000-0000-0000-000000000001'
      and status = 'pending'
  ),
  1,
  'the invitation is stored once'
);

select isnt(
  (
    select token_hash
    from public.organization_invitations
    where email = 'team-invitee@example.com'
  ),
  'valid-team-invitation-token-that-is-long-enough',
  'only the invitation token hash is stored'
);

select throws_ok(
  $test$
    select public.create_team_invitation(
      '52000000-0000-0000-0000-000000000001',
      'team-invitee@example.com',
      'member',
      'another-valid-invitation-token-that-is-long-enough',
      now() + interval '7 days'
    )
  $test$,
  'A pending invitation already exists for this email.',
  'duplicate pending invitations are rejected'
);

select throws_ok(
  $test$
    select public.create_team_invitation(
      '52000000-0000-0000-0000-000000000001',
      'no-seat@example.com',
      'member',
      'no-seat-invitation-token-that-is-long-enough',
      now() + interval '7 days'
    )
  $test$,
  'Your plan has no available team seats.',
  'pending invitations reserve seats transactionally'
);

reset role;

select is(
  (
    select count(*)::integer
    from public.integration_events
    where event_type = 'organization.invitation.created'
      and aggregate_type = 'organization_invitation'
  ),
  1,
  'invitation email delivery is queued in the outbox'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"42000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select throws_ok(
  $test$
    select public.accept_team_invitation(
      'valid-team-invitation-token-that-is-long-enough'
    )
  $test$,
  'This invitation belongs to a different email address.',
  'an invitation cannot be accepted by another email'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"42000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);

select lives_ok(
  $test$
    select public.accept_team_invitation(
      'valid-team-invitation-token-that-is-long-enough'
    )
  $test$,
  'the intended user can accept the invitation'
);

select is(
  (
    select role::text || ':' || status::text
    from public.organization_members
    where organization_id = '52000000-0000-0000-0000-000000000001'
      and user_id = '42000000-0000-0000-0000-000000000002'
  ),
  'member:active',
  'acceptance creates the intended active membership'
);

select throws_ok(
  $test$
    select public.accept_team_invitation(
      'valid-team-invitation-token-that-is-long-enough'
    )
  $test$,
  'This invitation is no longer available.',
  'an accepted token cannot be replayed'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"42000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select throws_ok(
  $test$
    select public.manage_team_member(
      '52000000-0000-0000-0000-000000000001',
      '42000000-0000-0000-0000-000000000001',
      null,
      null,
      true
    )
  $test$,
  'An organization must retain at least one active owner.',
  'the sole active owner cannot be removed'
);

select lives_ok(
  $test$
    select public.manage_team_member(
      '52000000-0000-0000-0000-000000000001',
      '42000000-0000-0000-0000-000000000002',
      'admin',
      'active',
      false
    )
  $test$,
  'an owner can promote a member to admin'
);

select throws_ok(
  $test$
    select public.manage_team_member(
      '52000000-0000-0000-0000-000000000001',
      '42000000-0000-0000-0000-000000000004',
      null,
      'active',
      false
    )
  $test$,
  'Your plan has no available team seats.',
  'reactivation also enforces seat limits'
);

select lives_ok(
  $test$
    select public.manage_team_member(
      '52000000-0000-0000-0000-000000000001',
      '42000000-0000-0000-0000-000000000002',
      null,
      'suspended',
      false
    )
  $test$,
  'an owner can suspend a member'
);

reset role;

select is(
  (
    select count(*)::integer
    from public.audit_logs
    where organization_id = '52000000-0000-0000-0000-000000000001'
      and action in (
        'organization.invitation.created',
        'organization.invitation.accepted',
        'organization.member.updated',
        'organization.member.suspended'
      )
  ),
  4,
  'invitations and membership changes create audit records'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'public.organization_members',
    'INSERT'
  )
  and not has_table_privilege(
    'authenticated',
    'public.organization_members',
    'UPDATE'
  )
  and not has_table_privilege(
    'authenticated',
    'public.organization_members',
    'DELETE'
  ),
  'browser roles cannot bypass membership RPC safeguards'
);

select ok(
  not has_table_privilege(
    'authenticated',
    'public.organization_invitations',
    'INSERT'
  )
  and not has_table_privilege(
    'authenticated',
    'public.organization_invitations',
    'UPDATE'
  ),
  'browser roles cannot bypass invitation RPC safeguards'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"42000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select is(
  jsonb_array_length(
    public.get_team_directory(
      '52000000-0000-0000-0000-000000000001'
    )
  ),
  3,
  'organization managers can retrieve the scoped team directory'
);

select * from finish();
rollback;
