create policy "community_comments_read_author_or_manager_hidden"
  on public.community_comments for select to authenticated
  using (
    author_user_id = (select auth.uid())
    or exists (
      select 1
      from public.community_posts posts
      where posts.id = post_id
        and (select private.can_manage_community(posts.community_id, posts.space_id))
    )
  );

create policy "community_comments_delete_author_or_manager"
  on public.community_comments for delete to authenticated
  using (
    author_user_id = (select auth.uid())
    or exists (
      select 1
      from public.community_posts posts
      where posts.id = post_id
        and (select private.can_manage_community(posts.community_id, posts.space_id))
    )
  );

grant delete on public.community_comments to authenticated;
