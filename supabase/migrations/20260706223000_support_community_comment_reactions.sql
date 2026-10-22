alter table public.community_reactions
  add column if not exists id uuid not null default gen_random_uuid(),
  add column if not exists comment_id uuid references public.community_comments(id) on delete cascade;

alter table public.community_reactions
  drop constraint if exists community_reactions_pkey;

alter table public.community_reactions
  add constraint community_reactions_pkey primary key (id);

create unique index if not exists community_reactions_post_unique_idx
  on public.community_reactions(post_id, user_id, kind)
  where comment_id is null;

create unique index if not exists community_reactions_comment_unique_idx
  on public.community_reactions(comment_id, user_id, kind)
  where comment_id is not null;

drop policy if exists "community_reactions_read_accessible_posts"
  on public.community_reactions;
drop policy if exists "community_reactions_insert_members"
  on public.community_reactions;
drop policy if exists "community_reactions_delete_own"
  on public.community_reactions;

create policy "community_reactions_read_accessible_threads"
  on public.community_reactions for select to authenticated
  using (
    exists (
      select 1
      from public.community_posts posts
      where posts.id = post_id
        and posts.status = 'published'
        and (select private.can_access_community_space(posts.space_id))
    )
  );

create policy "community_reactions_insert_members"
  on public.community_reactions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.community_posts posts
      where posts.id = post_id
        and posts.status = 'published'
        and (select private.can_access_community_space(posts.space_id))
    )
    and (
      comment_id is null
      or exists (
        select 1
        from public.community_comments comments
        where comments.id = comment_id
          and comments.post_id = community_reactions.post_id
          and comments.hidden_at is null
      )
    )
  );

create policy "community_reactions_delete_own"
  on public.community_reactions for delete to authenticated
  using (user_id = (select auth.uid()));
