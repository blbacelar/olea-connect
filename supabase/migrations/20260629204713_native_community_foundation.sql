create type public.community_status as enum ('draft', 'active', 'archived');
create type public.community_space_status as enum ('draft', 'active', 'archived');
create type public.community_manager_role as enum ('manager', 'moderator');
create type public.community_post_kind as enum ('discussion', 'announcement', 'resource');
create type public.community_post_status as enum ('draft', 'published', 'hidden', 'archived');
create type public.community_reaction_kind as enum ('helpful', 'celebrate', 'thanks');

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  status public.community_status not null default 'active',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communities_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint communities_name_length check (char_length(name) between 1 and 160)
);

create table public.community_spaces (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  status public.community_space_status not null default 'active',
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (community_id, slug),
  unique (id, community_id),
  constraint community_spaces_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint community_spaces_name_length check (char_length(name) between 1 and 160)
);

create table public.community_space_access_rules (
  space_id uuid not null references public.community_spaces(id) on delete cascade,
  plan_id text not null references public.membership_plans(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (space_id, plan_id)
);

create table public.community_managers (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  space_id uuid,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.community_manager_role not null default 'manager',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (space_id, community_id)
    references public.community_spaces(id, community_id)
    on delete cascade
);

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  space_id uuid not null,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  kind public.community_post_kind not null default 'discussion',
  status public.community_post_status not null default 'published',
  title text not null,
  body text not null,
  resource_url text,
  pinned_at timestamptz,
  hidden_at timestamptz,
  hidden_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (space_id, community_id)
    references public.community_spaces(id, community_id)
    on delete cascade,
  constraint community_posts_title_length check (char_length(title) between 1 and 180),
  constraint community_posts_body_length check (char_length(body) between 1 and 12000)
);

create table public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  hidden_at timestamptz,
  hidden_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_comments_body_length check (char_length(body) between 1 and 6000)
);

create table public.community_reactions (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind public.community_reaction_kind not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, kind)
);

create table public.community_events (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  space_id uuid,
  title text not null,
  summary text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'America/Vancouver',
  zoom_url text,
  recording_url text,
  status public.event_status not null default 'scheduled',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (space_id, community_id)
    references public.community_spaces(id, community_id)
    on delete cascade,
  constraint community_events_title_length check (char_length(title) between 1 and 180),
  constraint community_events_time_window check (ends_at > starts_at)
);

create index community_spaces_community_id_idx on public.community_spaces(community_id);
create index community_space_access_rules_plan_id_idx on public.community_space_access_rules(plan_id);
create index community_managers_user_id_idx on public.community_managers(user_id);
create unique index community_managers_community_scope_unique_idx
  on public.community_managers(community_id, user_id)
  where space_id is null;
create unique index community_managers_space_scope_unique_idx
  on public.community_managers(community_id, space_id, user_id)
  where space_id is not null;
create index community_posts_space_id_created_at_idx on public.community_posts(space_id, created_at desc);
create index community_posts_author_user_id_idx on public.community_posts(author_user_id);
create index community_comments_post_id_created_at_idx on public.community_comments(post_id, created_at);
create index community_events_starts_at_idx on public.community_events(starts_at)
  where status in ('scheduled', 'live');

create or replace function private.has_active_member_subscription()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members members
    join public.subscriptions subscriptions
      on subscriptions.organization_id = members.organization_id
    where members.user_id = (select auth.uid())
      and members.status = 'active'
      and subscriptions.status in ('trialing', 'active')
  );
$$;

create or replace function private.can_access_community_space(target_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_platform_admin(array['super_admin', 'community_admin']::public.platform_role[])
    or exists (
      select 1
      from public.community_spaces spaces
      join public.communities communities
        on communities.id = spaces.community_id
      join public.organization_members members
        on members.user_id = (select auth.uid())
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

create or replace function private.can_manage_community(
  target_community_id uuid,
  target_space_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_platform_admin(array['super_admin', 'community_admin']::public.platform_role[])
    or exists (
      select 1
      from public.community_managers managers
      where managers.community_id = target_community_id
        and managers.user_id = (select auth.uid())
        and (
          managers.space_id is null
          or target_space_id is null
          or managers.space_id = target_space_id
        )
    );
$$;

grant execute on function private.has_active_member_subscription() to authenticated;
grant execute on function private.can_access_community_space(uuid) to authenticated;
grant execute on function private.can_manage_community(uuid, uuid) to authenticated;

create trigger communities_set_updated_at
  before update on public.communities
  for each row execute function private.set_updated_at();
create trigger community_spaces_set_updated_at
  before update on public.community_spaces
  for each row execute function private.set_updated_at();
create trigger community_posts_set_updated_at
  before update on public.community_posts
  for each row execute function private.set_updated_at();
create trigger community_comments_set_updated_at
  before update on public.community_comments
  for each row execute function private.set_updated_at();
create trigger community_events_set_updated_at
  before update on public.community_events
  for each row execute function private.set_updated_at();

alter table public.communities enable row level security;
alter table public.community_spaces enable row level security;
alter table public.community_space_access_rules enable row level security;
alter table public.community_managers enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_reactions enable row level security;
alter table public.community_events enable row level security;

create policy "communities_read_active_members"
  on public.communities for select to authenticated
  using (
    status = 'active'
    and (select private.has_active_member_subscription())
    or (select private.is_platform_admin(array['super_admin', 'community_admin']::public.platform_role[]))
  );

create policy "communities_manage_platform_admin"
  on public.communities for all to authenticated
  using ((select private.is_platform_admin(array['super_admin', 'community_admin']::public.platform_role[])))
  with check ((select private.is_platform_admin(array['super_admin', 'community_admin']::public.platform_role[])));

create policy "community_spaces_read_accessible"
  on public.community_spaces for select to authenticated
  using ((select private.can_access_community_space(id)));

create policy "community_spaces_manage_platform_admin"
  on public.community_spaces for all to authenticated
  using ((select private.is_platform_admin(array['super_admin', 'community_admin']::public.platform_role[])))
  with check ((select private.is_platform_admin(array['super_admin', 'community_admin']::public.platform_role[])));

create policy "community_space_access_rules_read_accessible"
  on public.community_space_access_rules for select to authenticated
  using ((select private.can_access_community_space(space_id)));

create policy "community_space_access_rules_manage_platform_admin"
  on public.community_space_access_rules for all to authenticated
  using ((select private.is_platform_admin(array['super_admin', 'community_admin']::public.platform_role[])))
  with check ((select private.is_platform_admin(array['super_admin', 'community_admin']::public.platform_role[])));

create policy "community_managers_read_self_or_platform"
  on public.community_managers for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_platform_admin(array['super_admin', 'community_admin']::public.platform_role[]))
  );

create policy "community_managers_manage_platform_admin"
  on public.community_managers for all to authenticated
  using ((select private.is_platform_admin(array['super_admin', 'community_admin']::public.platform_role[])))
  with check ((select private.is_platform_admin(array['super_admin', 'community_admin']::public.platform_role[])));

create policy "community_posts_read_accessible"
  on public.community_posts for select to authenticated
  using (
    (status = 'published' and (select private.can_access_community_space(space_id)))
    or author_user_id = (select auth.uid())
    or (select private.can_manage_community(community_id, space_id))
  );

create policy "community_posts_insert_members"
  on public.community_posts for insert to authenticated
  with check (
    author_user_id = (select auth.uid())
    and (select private.can_access_community_space(space_id))
  );

create policy "community_posts_update_author_or_manager"
  on public.community_posts for update to authenticated
  using (
    author_user_id = (select auth.uid())
    or (select private.can_manage_community(community_id, space_id))
  )
  with check (
    author_user_id = (select auth.uid())
    or (select private.can_manage_community(community_id, space_id))
  );

create policy "community_comments_read_accessible_posts"
  on public.community_comments for select to authenticated
  using (
    hidden_at is null
    and exists (
      select 1
      from public.community_posts posts
      where posts.id = post_id
        and (
          (posts.status = 'published' and (select private.can_access_community_space(posts.space_id)))
          or posts.author_user_id = (select auth.uid())
          or (select private.can_manage_community(posts.community_id, posts.space_id))
        )
    )
  );

create policy "community_comments_insert_members"
  on public.community_comments for insert to authenticated
  with check (
    author_user_id = (select auth.uid())
    and exists (
      select 1
      from public.community_posts posts
      where posts.id = post_id
        and posts.status = 'published'
        and (select private.can_access_community_space(posts.space_id))
    )
  );

create policy "community_comments_update_author_or_manager"
  on public.community_comments for update to authenticated
  using (
    author_user_id = (select auth.uid())
    or exists (
      select 1
      from public.community_posts posts
      where posts.id = post_id
        and (select private.can_manage_community(posts.community_id, posts.space_id))
    )
  )
  with check (
    author_user_id = (select auth.uid())
    or exists (
      select 1
      from public.community_posts posts
      where posts.id = post_id
        and (select private.can_manage_community(posts.community_id, posts.space_id))
    )
  );

create policy "community_reactions_read_accessible_posts"
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
  );

create policy "community_reactions_delete_own"
  on public.community_reactions for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "community_events_read_accessible"
  on public.community_events for select to authenticated
  using (
    status <> 'draft'
    and (
      space_id is null
      or (select private.can_access_community_space(space_id))
    )
    and (select private.has_active_member_subscription())
    or (select private.can_manage_community(community_id, space_id))
  );

create policy "community_events_manage_managers"
  on public.community_events for all to authenticated
  using ((select private.can_manage_community(community_id, space_id)))
  with check ((select private.can_manage_community(community_id, space_id)));

grant select, insert, update on public.communities to authenticated;
grant select, insert, update on public.community_spaces to authenticated;
grant select, insert, update on public.community_space_access_rules to authenticated;
grant select, insert, update on public.community_managers to authenticated;
grant select, insert, update on public.community_posts to authenticated;
grant select, insert, update on public.community_comments to authenticated;
grant select, insert, delete on public.community_reactions to authenticated;
grant select, insert, update on public.community_events to authenticated;

with community as (
  insert into public.communities (slug, name, description, status)
  values (
    'olea-connects',
    'Olea Connects Community',
    'A private peer community for nonprofit leaders using Olea Connects.',
    'active'
  )
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        status = excluded.status
  returning id
),
spaces as (
  insert into public.community_spaces (community_id, slug, name, description, sort_order, status)
  select community.id, seed.slug, seed.name, seed.description, seed.sort_order, 'active'::public.community_space_status
  from community
  cross join (
    values
      ('general', 'General', 'Introductions, questions, and member-to-member support.', 10),
      ('governance', 'Governance', 'Board governance, policies, minutes, and compliance conversations.', 20),
      ('fundraising', 'Fundraising', 'Campaign planning, donor stewardship, and revenue ideas.', 30),
      ('grant-opportunities', 'Grant Opportunities', 'Funding leads, application notes, and deadline reminders.', 40),
      ('webinars-events', 'Webinars & Events', 'Live sessions, networking calls, and replay discussion.', 50),
      ('seedling-members', 'Seedling Members', 'A focused space for Seedling members getting started.', 60),
      ('roots-members', 'Roots Members', 'A focused space for Roots members building operational rhythm.', 70),
      ('canopy-members', 'Canopy Members', 'A focused space for Canopy members scaling governance practice.', 80),
      ('harvest-members', 'Harvest Members', 'A focused space for Harvest members receiving fractional administration support.', 90)
  ) as seed(slug, name, description, sort_order)
  on conflict (community_id, slug) do update
    set name = excluded.name,
        description = excluded.description,
        sort_order = excluded.sort_order,
        status = excluded.status
  returning id, slug
)
insert into public.community_space_access_rules (space_id, plan_id)
select spaces.id, rules.plan_id
from spaces
join (
  values
    ('general', 'seedling'),
    ('general', 'roots'),
    ('general', 'canopy'),
    ('general', 'harvest'),
    ('governance', 'seedling'),
    ('governance', 'roots'),
    ('governance', 'canopy'),
    ('governance', 'harvest'),
    ('fundraising', 'seedling'),
    ('fundraising', 'roots'),
    ('fundraising', 'canopy'),
    ('fundraising', 'harvest'),
    ('grant-opportunities', 'seedling'),
    ('grant-opportunities', 'roots'),
    ('grant-opportunities', 'canopy'),
    ('grant-opportunities', 'harvest'),
    ('webinars-events', 'seedling'),
    ('webinars-events', 'roots'),
    ('webinars-events', 'canopy'),
    ('webinars-events', 'harvest'),
    ('seedling-members', 'seedling'),
    ('roots-members', 'roots'),
    ('canopy-members', 'canopy'),
    ('harvest-members', 'harvest')
) as rules(space_slug, plan_id)
  on rules.space_slug = spaces.slug
on conflict (space_id, plan_id) do nothing;
