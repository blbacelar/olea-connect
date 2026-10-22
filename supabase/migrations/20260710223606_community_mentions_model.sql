create table public.community_mentions (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  space_id uuid not null references public.community_spaces(id) on delete cascade,
  post_id uuid references public.community_posts(id) on delete cascade,
  comment_id uuid references public.community_comments(id) on delete cascade,
  mentioned_user_id uuid not null references auth.users(id) on delete cascade,
  mentioned_by_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint community_mentions_single_target check (
    (post_id is not null and comment_id is null)
    or (post_id is null and comment_id is not null)
  ),
  constraint community_mentions_no_self_mention check (mentioned_user_id <> mentioned_by_user_id)
);

create unique index community_mentions_post_target_idx
  on public.community_mentions(post_id, mentioned_user_id)
  where post_id is not null;

create unique index community_mentions_comment_target_idx
  on public.community_mentions(comment_id, mentioned_user_id)
  where comment_id is not null;

create index community_mentions_mentioned_user_idx
  on public.community_mentions(mentioned_user_id, created_at desc);

create index community_mentions_space_idx
  on public.community_mentions(space_id, created_at desc);

alter table public.community_mentions enable row level security;

create or replace function private.can_user_access_community_space(
  target_user_id uuid,
  target_space_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
      select 1
      from public.community_spaces spaces
      join public.communities communities
        on communities.id = spaces.community_id
      join public.organization_members members
        on members.user_id = target_user_id
       and members.status = 'active'
      join public.subscriptions subscriptions
        on subscriptions.organization_id = members.organization_id
       and subscriptions.status in ('trialing', 'active')
      where spaces.id = target_space_id
        and spaces.status = 'active'
        and communities.status = 'active'
        and (
          not exists (
            select 1
            from public.community_space_access_rules rules
            where rules.space_id = spaces.id
          )
          or exists (
            select 1
            from public.community_space_access_rules rules
            where rules.space_id = spaces.id
              and rules.plan_id = subscriptions.plan_id
          )
        )
    );
$$;

revoke all on function private.can_user_access_community_space(uuid, uuid)
  from public, anon, authenticated;

grant execute on function private.can_user_access_community_space(uuid, uuid)
  to authenticated;

create policy "community_mentions_read_related"
  on public.community_mentions for select to authenticated
  using (
    mentioned_user_id = (select auth.uid())
    or mentioned_by_user_id = (select auth.uid())
    or (select private.can_manage_community(community_id, space_id))
  );

create policy "community_mentions_insert_valid_targets"
  on public.community_mentions for insert to authenticated
  with check (
    mentioned_by_user_id = (select auth.uid())
    and mentioned_user_id <> (select auth.uid())
    and (select private.can_user_access_community_space(mentioned_user_id, space_id))
    and (
      (
        post_id is not null
        and comment_id is null
        and exists (
          select 1
          from public.community_posts posts
          where posts.id = post_id
            and posts.community_id = community_id
            and posts.space_id = space_id
            and (
              posts.author_user_id = (select auth.uid())
              or (select private.can_manage_community(posts.community_id, posts.space_id))
            )
        )
      )
      or (
        comment_id is not null
        and post_id is null
        and exists (
          select 1
          from public.community_comments comments
          join public.community_posts posts on posts.id = comments.post_id
          where comments.id = comment_id
            and comments.author_user_id = (select auth.uid())
            and posts.community_id = community_id
            and posts.space_id = space_id
        )
      )
    )
  );

create policy "community_mentions_delete_author_or_manager"
  on public.community_mentions for delete to authenticated
  using (
    mentioned_by_user_id = (select auth.uid())
    or (select private.can_manage_community(community_id, space_id))
    or (
      post_id is not null
      and exists (
        select 1
        from public.community_posts posts
        where posts.id = post_id
          and posts.author_user_id = (select auth.uid())
      )
    )
    or (
      comment_id is not null
      and exists (
        select 1
        from public.community_comments comments
        where comments.id = comment_id
          and comments.author_user_id = (select auth.uid())
      )
    )
  );

grant select, insert, delete on public.community_mentions to authenticated;

create or replace function private.enqueue_community_mention_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  mentioner_name text;
  mentioner_org text;
  post_row record;
  post_title text;
  link_url text;
begin
  select coalesce(nullif(trim(profiles.full_name), ''), 'A member')
  into mentioner_name
  from public.profiles profiles
  where profiles.id = new.mentioned_by_user_id;

  select organizations.name
  into mentioner_org
  from public.organization_members members
  join public.organizations organizations on organizations.id = members.organization_id
  where members.user_id = new.mentioned_by_user_id
    and members.status = 'active'
  order by members.created_at asc
  limit 1;

  if new.post_id is not null then
    select id, title
    into post_row
    from public.community_posts
    where id = new.post_id;
  else
    select posts.id, posts.title
    into post_row
    from public.community_comments comments
    join public.community_posts posts on posts.id = comments.post_id
    where comments.id = new.comment_id;
  end if;

  post_title := coalesce(post_row.title, 'a community conversation');
  link_url := '/community?post=' || coalesce(post_row.id::text, new.post_id::text, '');

  perform private.enqueue_notification(
    new.mentioned_user_id,
    null,
    'community_mention',
    'You were mentioned',
    mentioner_name || coalesce(' from ' || mentioner_org, '') || ' mentioned you in "' || post_title || '".',
    link_url,
    'info',
    null,
    'community_mention:' || coalesce(new.post_id::text, new.comment_id::text) || ':' || new.mentioned_user_id::text,
    jsonb_build_object(
      'community_id', new.community_id,
      'space_id', new.space_id,
      'post_id', new.post_id,
      'comment_id', new.comment_id,
      'mentioned_by_user_id', new.mentioned_by_user_id
    ),
    null
  );

  return new;
end;
$$;

revoke all on function private.enqueue_community_mention_notification()
  from public, anon, authenticated;

drop trigger if exists community_mentions_enqueue_notification on public.community_mentions;
create trigger community_mentions_enqueue_notification
  after insert on public.community_mentions
  for each row execute function private.enqueue_community_mention_notification();
