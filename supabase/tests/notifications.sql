begin;

select plan(11);

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
    '47000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'notify-a@example.com',
    '',
    now(),
    '{}'::jsonb,
    '{"full_name":"Notify A"}'::jsonb,
    now(),
    now()
  ),
  (
    '47000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'notify-b@example.com',
    '',
    now(),
    '{}'::jsonb,
    '{"full_name":"Notify B"}'::jsonb,
    now(),
    now()
  );

insert into public.organizations (id, name, slug, created_by)
values
  (
    '57000000-0000-0000-0000-000000000001',
    'Notify Org A',
    'notify-org-a',
    '47000000-0000-0000-0000-000000000001'
  ),
  (
    '57000000-0000-0000-0000-000000000002',
    'Notify Org B',
    'notify-org-b',
    '47000000-0000-0000-0000-000000000002'
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
    '57000000-0000-0000-0000-000000000001',
    '47000000-0000-0000-0000-000000000001',
    'owner',
    'active',
    now()
  ),
  (
    '57000000-0000-0000-0000-000000000002',
    '47000000-0000-0000-0000-000000000002',
    'owner',
    'active',
    now()
  );

delete from public.notifications;

select lives_ok(
  $$
    select private.enqueue_notification(
      '47000000-0000-0000-0000-000000000001'::uuid,
      '57000000-0000-0000-0000-000000000001'::uuid,
      'template_available',
      'New template available',
      'A new template is ready.',
      '/templates/board-self-evaluation',
      'info',
      null,
      'test-template-notification',
      '{}'::jsonb,
      null
    )
  $$,
  'notification helper creates a tenant-scoped notification'
);

select lives_ok(
  $$
    select private.enqueue_notification(
      '47000000-0000-0000-0000-000000000001'::uuid,
      '57000000-0000-0000-0000-000000000001'::uuid,
      'template_available',
      'New template available',
      'A new template is ready.',
      '/templates/board-self-evaluation',
      'info',
      null,
      'test-template-notification',
      '{}'::jsonb,
      null
    )
  $$,
  'duplicate notification domain events are ignored'
);

select is(
  (
    select count(*)::integer
    from public.notifications
    where user_id = '47000000-0000-0000-0000-000000000001'
      and idempotency_key = 'test-template-notification'
  ),
  1,
  'duplicate idempotency keys create only one notification per user'
);

select throws_ok(
  $$
    select private.enqueue_notification(
      '47000000-0000-0000-0000-000000000002'::uuid,
      '57000000-0000-0000-0000-000000000001'::uuid,
      'template_available',
      'Bad tenant notification',
      'This should not be delivered.',
      '/templates/board-self-evaluation',
      'info',
      null,
      'bad-tenant-notification',
      '{}'::jsonb,
      null
    )
  $$,
  'P0001',
  'Notification target user is not an active member of the organization.',
  'notification helper rejects cross-tenant targets'
);

select throws_ok(
  $$
    select private.enqueue_notification(
      '47000000-0000-0000-0000-000000000001'::uuid,
      '57000000-0000-0000-0000-000000000001'::uuid,
      'template_available',
      'Unsafe URL',
      'This should not be delivered.',
      'https://evil.example',
      'info',
      null,
      'unsafe-url-notification',
      '{}'::jsonb,
      null
    )
  $$,
  'P0001',
  'Notification action URL must be an internal path.',
  'notification helper rejects external deep links'
);

select throws_ok(
  $$
    select private.enqueue_notification(
      '47000000-0000-0000-0000-000000000001'::uuid,
      '57000000-0000-0000-0000-000000000001'::uuid,
      'template_available',
      'Protocol-relative URL',
      'This should not be delivered.',
      '//evil.example',
      'info',
      null,
      'protocol-relative-url-notification',
      '{}'::jsonb,
      null
    )
  $$,
  'P0001',
  'Notification action URL must be an internal path.',
  'notification helper rejects protocol-relative deep links'
);

select private.enqueue_notification(
  '47000000-0000-0000-0000-000000000002'::uuid,
  '57000000-0000-0000-0000-000000000002'::uuid,
  'template_available',
  'Other user notification',
  'This belongs to another member.',
  '/templates/board-self-evaluation',
  'info',
  null,
  'other-user-notification',
  '{}'::jsonb,
  null
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"47000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select is(
  (
    select count(*)::integer
    from public.notifications
    where read_at is null
  ),
  1,
  'a member can read only their own unread notifications'
);

select is(
  public.mark_notification_read(
    (
      select id
      from public.notifications
      where idempotency_key = 'test-template-notification'
      limit 1
    )
  ),
  true,
  'marking one notification read succeeds for the owning member'
);

select is(
  public.mark_notification_read(
    (
      select id
      from public.notifications
      where idempotency_key = 'other-user-notification'
      limit 1
    )
  ),
  false,
  'members cannot mark another user notification read'
);

select throws_ok(
  $$
    update public.notifications
    set title = 'Tampered'
    where idempotency_key = 'test-template-notification'
  $$,
  '42501',
  'permission denied for table notifications',
  'members cannot directly update notification content'
);

reset role;

select private.enqueue_notification(
  '47000000-0000-0000-0000-000000000001'::uuid,
  '57000000-0000-0000-0000-000000000001'::uuid,
  'grant_round_open',
  'Grant applications are open',
  'A grant round is ready.',
  '/grants',
  'success',
  null,
  'test-mark-all-notification',
  '{}'::jsonb,
  null
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"47000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select is(
  public.mark_all_notifications_read(),
  1,
  'mark all read only updates unread notifications for the owning member'
);

select * from finish();
rollback;
