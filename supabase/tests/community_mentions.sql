begin;

select plan(5);

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
    '48000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'mention-author@example.com',
    '',
    now(),
    '{}'::jsonb,
    '{"full_name":"Mention Author"}'::jsonb,
    now(),
    now()
  ),
  (
    '48000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'mention-target@example.com',
    '',
    now(),
    '{}'::jsonb,
    '{"full_name":"Mention Target"}'::jsonb,
    now(),
    now()
  ),
  (
    '48000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'mention-ineligible@example.com',
    '',
    now(),
    '{}'::jsonb,
    '{"full_name":"Mention Ineligible"}'::jsonb,
    now(),
    now()
  );

insert into public.profiles (id, full_name)
values
  ('48000000-0000-0000-0000-000000000001', 'Mention Author'),
  ('48000000-0000-0000-0000-000000000002', 'Mention Target'),
  ('48000000-0000-0000-0000-000000000003', 'Mention Ineligible')
on conflict (id) do update
set full_name = excluded.full_name;

insert into public.organizations (id, name, slug, created_by)
values
  (
    '58000000-0000-0000-0000-000000000001',
    'Mention Org A',
    'mention-org-a',
    '48000000-0000-0000-0000-000000000001'
  ),
  (
    '58000000-0000-0000-0000-000000000002',
    'Mention Org B',
    'mention-org-b',
    '48000000-0000-0000-0000-000000000002'
  ),
  (
    '58000000-0000-0000-0000-000000000003',
    'Mention Org C',
    'mention-org-c',
    '48000000-0000-0000-0000-000000000003'
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
    '58000000-0000-0000-0000-000000000001',
    '48000000-0000-0000-0000-000000000001',
    'owner',
    'active',
    now()
  ),
  (
    '58000000-0000-0000-0000-000000000002',
    '48000000-0000-0000-0000-000000000002',
    'owner',
    'active',
    now()
  ),
  (
    '58000000-0000-0000-0000-000000000003',
    '48000000-0000-0000-0000-000000000003',
    'owner',
    'active',
    now()
  );

insert into public.subscriptions (
  organization_id,
  plan_id,
  billing_interval,
  status,
  current_period_start,
  current_period_end
)
values
  (
    '58000000-0000-0000-0000-000000000001',
    'roots',
    'month',
    'active',
    now(),
    now() + interval '1 month'
  ),
  (
    '58000000-0000-0000-0000-000000000002',
    'roots',
    'month',
    'active',
    now(),
    now() + interval '1 month'
  ),
  (
    '58000000-0000-0000-0000-000000000003',
    'seedling',
    'month',
    'active',
    now(),
    now() + interval '1 month'
  );

insert into public.communities (id, slug, name, status)
values (
  '68000000-0000-0000-0000-000000000001',
  'mention-community',
  'Mention Community',
  'active'
);

insert into public.community_spaces (id, community_id, slug, name, status)
values (
  '78000000-0000-0000-0000-000000000001',
  '68000000-0000-0000-0000-000000000001',
  'mention-space',
  'Mention Space',
  'active'
);

insert into public.community_space_access_rules (space_id, plan_id)
values ('78000000-0000-0000-0000-000000000001', 'roots');

insert into public.community_posts (
  id,
  community_id,
  space_id,
  author_user_id,
  kind,
  status,
  title,
  body
)
values (
  '88000000-0000-0000-0000-000000000001',
  '68000000-0000-0000-0000-000000000001',
  '78000000-0000-0000-0000-000000000001',
  '48000000-0000-0000-0000-000000000001',
  'discussion',
  'published',
  'Mention test post',
  'This is a post with a valid mention.'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"48000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select lives_ok(
  $$
    insert into public.community_mentions (
      community_id,
      space_id,
      post_id,
      mentioned_user_id,
      mentioned_by_user_id
    )
    values (
      '68000000-0000-0000-0000-000000000001',
      '78000000-0000-0000-0000-000000000001',
      '88000000-0000-0000-0000-000000000001',
      '48000000-0000-0000-0000-000000000002',
      '48000000-0000-0000-0000-000000000001'
    )
  $$,
  'an author can mention a user with access to the same community space'
);

reset role;

select is(
  (
    select count(*)::integer
    from public.notifications
    where user_id = '48000000-0000-0000-0000-000000000002'
      and type = 'community_mention'
      and action_url = '/community?post=88000000-0000-0000-0000-000000000001'
  ),
  1,
  'valid mentions enqueue one notification for the mentioned user'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"48000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select throws_ok(
  $$
    insert into public.community_mentions (
      community_id,
      space_id,
      post_id,
      mentioned_user_id,
      mentioned_by_user_id
    )
    values (
      '68000000-0000-0000-0000-000000000001',
      '78000000-0000-0000-0000-000000000001',
      '88000000-0000-0000-0000-000000000001',
      '48000000-0000-0000-0000-000000000002',
      '48000000-0000-0000-0000-000000000001'
    )
  $$,
  '23505',
  null,
  'duplicate mentions for the same post and user are rejected'
);

select throws_ok(
  $$
    insert into public.community_mentions (
      community_id,
      space_id,
      post_id,
      mentioned_user_id,
      mentioned_by_user_id
    )
    values (
      '68000000-0000-0000-0000-000000000001',
      '78000000-0000-0000-0000-000000000001',
      '88000000-0000-0000-0000-000000000001',
      '48000000-0000-0000-0000-000000000003',
      '48000000-0000-0000-0000-000000000001'
    )
  $$,
  '42501',
  null,
  'users without access to the same space cannot be mentioned'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"48000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select is(
  public.mark_notification_read(
    (
      select id
      from public.notifications
      where user_id = '48000000-0000-0000-0000-000000000002'
        and type = 'community_mention'
      limit 1
    )
  ),
  false,
  'mention author cannot mark the mentioned user notification read'
);

select * from finish();
rollback;
