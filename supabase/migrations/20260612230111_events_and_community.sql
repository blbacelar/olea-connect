create type public.event_type as enum (
  'webinar',
  'speaker_session',
  'funder_ama',
  'networking',
  'workshop',
  'summit'
);
create type public.event_status as enum ('draft', 'scheduled', 'live', 'completed', 'canceled');
create type public.event_registration_status as enum (
  'registered',
  'waitlisted',
  'canceled',
  'attended',
  'no_show'
);
create type public.community_membership_status as enum (
  'pending',
  'active',
  'suspended',
  'deprovisioned'
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  type public.event_type not null,
  status public.event_status not null default 'draft',
  slug text not null unique,
  title text not null,
  summary text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'America/Edmonton',
  capacity integer,
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  meeting_provider text,
  provider_event_id text,
  join_url text,
  recording_storage_path text,
  recording_url text,
  land_acknowledgement text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint events_time_window check (ends_at > starts_at),
  constraint events_capacity_positive check (capacity is null or capacity > 0),
  constraint events_registration_window check (
    registration_closes_at is null
    or registration_opens_at is null
    or registration_closes_at > registration_opens_at
  )
);

create table public.event_plan_access (
  event_id uuid not null references public.events(id) on delete cascade,
  plan_id text not null references public.membership_plans(id) on delete cascade,
  included boolean not null default true,
  complimentary_ticket_limit integer,
  ticket_price_cents integer,
  currency char(3) not null default 'CAD',
  created_at timestamptz not null default now(),
  primary key (event_id, plan_id),
  constraint event_plan_access_ticket_limit_positive check (
    complimentary_ticket_limit is null or complimentary_ticket_limit > 0
  ),
  constraint event_plan_access_price_nonnegative check (
    ticket_price_cents is null or ticket_price_cents >= 0
  )
);

create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.event_registration_status not null default 'registered',
  guest_name text,
  guest_email text,
  attended_at timestamptz,
  watch_duration_seconds integer,
  provider_registration_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id),
  constraint event_registrations_watch_duration_nonnegative check (
    watch_duration_seconds is null or watch_duration_seconds >= 0
  ),
  constraint event_registrations_guest_email_normalized check (
    guest_email is null or guest_email = lower(trim(guest_email))
  )
);

create table public.community_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'circle',
  provider_user_id text,
  status public.community_membership_status not null default 'pending',
  provisioned_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, provider),
  constraint community_memberships_provider_format check (provider ~ '^[a-z0-9_]+$')
);

create index events_scheduled_starts_at_idx
  on public.events(starts_at)
  where status in ('scheduled', 'live');
create index events_created_by_idx on public.events(created_by);
create index event_plan_access_plan_id_idx on public.event_plan_access(plan_id);
create index event_registrations_event_id_idx on public.event_registrations(event_id);
create index event_registrations_organization_id_idx
  on public.event_registrations(organization_id);
create index event_registrations_user_id_idx on public.event_registrations(user_id);
create index community_memberships_organization_id_idx
  on public.community_memberships(organization_id);
create index community_memberships_user_id_idx on public.community_memberships(user_id);

create or replace function private.can_access_event(
  target_event_id uuid,
  target_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_platform_admin(null)
    or (
      private.is_org_member(target_organization_id)
      and exists (
        select 1
        from public.subscriptions subscriptions
        join public.event_plan_access event_access
          on event_access.plan_id = subscriptions.plan_id
        where subscriptions.organization_id = target_organization_id
          and subscriptions.status in ('trialing', 'active')
          and event_access.event_id = target_event_id
          and (
            event_access.included
            or event_access.complimentary_ticket_limit is not null
            or event_access.ticket_price_cents is not null
          )
      )
    );
$$;

grant execute on function private.can_access_event(uuid, uuid) to authenticated;

create trigger events_set_updated_at
  before update on public.events
  for each row execute function private.set_updated_at();
create trigger event_registrations_set_updated_at
  before update on public.event_registrations
  for each row execute function private.set_updated_at();
create trigger community_memberships_set_updated_at
  before update on public.community_memberships
  for each row execute function private.set_updated_at();

alter table public.events enable row level security;
alter table public.event_plan_access enable row level security;
alter table public.event_registrations enable row level security;
alter table public.community_memberships enable row level security;

create policy "events_read_published"
  on public.events for select to authenticated
  using (status <> 'draft' or (select private.is_platform_admin(null)));
create policy "event_plan_access_read"
  on public.event_plan_access for select to authenticated
  using (true);

create policy "event_registrations_select"
  on public.event_registrations for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.has_org_role(
      organization_id,
      array['owner', 'admin']::public.organization_member_role[]
    ))
    or (select private.is_platform_admin(
      array['super_admin', 'community_admin']::public.platform_role[]
    ))
  );
create policy "event_registrations_insert"
  on public.event_registrations for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select private.can_access_event(event_id, organization_id))
  );
create policy "event_registrations_update_own"
  on public.event_registrations for update to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_platform_admin(
      array['super_admin', 'community_admin']::public.platform_role[]
    ))
  )
  with check (
    user_id = (select auth.uid())
    or (select private.is_platform_admin(
      array['super_admin', 'community_admin']::public.platform_role[]
    ))
  );

create policy "community_memberships_select"
  on public.community_memberships for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.has_org_role(
      organization_id,
      array['owner', 'admin']::public.organization_member_role[]
    ))
    or (select private.is_platform_admin(
      array['super_admin', 'community_admin']::public.platform_role[]
    ))
  );

grant select on public.events, public.event_plan_access to authenticated;
grant select, insert, update on public.event_registrations to authenticated;
grant select on public.community_memberships to authenticated;
