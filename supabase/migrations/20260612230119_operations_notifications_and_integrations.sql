create type public.notification_severity as enum ('info', 'success', 'warning', 'critical');
create type public.integration_event_status as enum (
  'pending',
  'processing',
  'completed',
  'failed',
  'dead_letter'
);
create type public.consulting_engagement_status as enum ('planned', 'active', 'paused', 'completed');
create type public.consulting_request_status as enum (
  'submitted',
  'accepted',
  'in_progress',
  'blocked',
  'completed',
  'canceled'
);
create type public.consulting_request_type as enum (
  'board_package',
  'committee_minutes',
  'governance_support',
  'strategy_call',
  'other'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  severity public.notification_severity not null default 'info',
  type text not null,
  title text not null,
  body text not null,
  action_url text,
  read_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_format check (type ~ '^[a-z0-9_]+$')
);

create table public.user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  external_id text,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, provider),
  constraint user_integrations_provider_format check (provider ~ '^[a-z0-9_]+$')
);

create table public.privacy_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null,
  policy_version text not null,
  granted boolean not null,
  ip_hash text,
  user_agent text,
  recorded_at timestamptz not null default now(),
  constraint privacy_consents_type_format check (consent_type ~ '^[a-z0-9_]+$')
);

create table public.integration_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  aggregate_type text not null,
  aggregate_id text not null,
  provider text,
  payload jsonb not null,
  status public.integration_event_status not null default 'pending',
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  completed_at timestamptz,
  last_error text,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_events_event_type_format check (event_type ~ '^[a-z0-9_.]+$'),
  constraint integration_events_attempts_nonnegative check (attempts >= 0)
);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,
  unique (provider, provider_event_id),
  constraint webhook_events_provider_format check (provider ~ '^[a-z0-9_]+$')
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  changes jsonb,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint audit_logs_action_format check (action ~ '^[a-z0-9_.]+$'),
  constraint audit_logs_entity_type_format check (entity_type ~ '^[a-z0-9_]+$')
);

create table public.consulting_engagements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  status public.consulting_engagement_status not null default 'planned',
  monthly_included_minutes integer not null default 300,
  monthly_in_kind_minutes integer not null default 120,
  starts_on date not null,
  ends_on date,
  lead_user_id uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consulting_engagements_minutes_nonnegative check (
    monthly_included_minutes >= 0 and monthly_in_kind_minutes >= 0
  ),
  constraint consulting_engagements_date_window check (
    ends_on is null or ends_on >= starts_on
  )
);

create table public.consulting_requests (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.consulting_engagements(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete restrict,
  assigned_to uuid references auth.users(id) on delete set null,
  type public.consulting_request_type not null,
  status public.consulting_request_status not null default 'submitted',
  title text not null,
  description text not null,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.consulting_time_entries (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.consulting_engagements(id) on delete cascade,
  request_id uuid references public.consulting_requests(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete restrict,
  work_date date not null default current_date,
  minutes integer not null,
  is_in_kind boolean not null default false,
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consulting_time_entries_minutes_positive check (minutes > 0)
);

create index notifications_user_unread_idx
  on public.notifications(user_id, created_at desc)
  where read_at is null;
create index notifications_organization_id_idx on public.notifications(organization_id);
create index user_integrations_user_id_idx on public.user_integrations(user_id);
create index privacy_consents_user_id_idx on public.privacy_consents(user_id);
create index integration_events_pending_idx
  on public.integration_events(available_at, created_at)
  where status in ('pending', 'failed');
create index integration_events_aggregate_idx
  on public.integration_events(aggregate_type, aggregate_id);
create index webhook_events_unprocessed_idx
  on public.webhook_events(received_at)
  where processed_at is null;
create index audit_logs_actor_user_id_idx on public.audit_logs(actor_user_id);
create index audit_logs_organization_occurred_idx
  on public.audit_logs(organization_id, occurred_at desc);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);
create index consulting_engagements_organization_id_idx
  on public.consulting_engagements(organization_id);
create index consulting_engagements_subscription_id_idx
  on public.consulting_engagements(subscription_id);
create index consulting_engagements_lead_user_id_idx
  on public.consulting_engagements(lead_user_id);
create index consulting_requests_engagement_id_idx
  on public.consulting_requests(engagement_id);
create index consulting_requests_requested_by_idx
  on public.consulting_requests(requested_by);
create index consulting_requests_assigned_to_idx
  on public.consulting_requests(assigned_to);
create index consulting_time_entries_engagement_id_idx
  on public.consulting_time_entries(engagement_id);
create index consulting_time_entries_request_id_idx
  on public.consulting_time_entries(request_id);
create index consulting_time_entries_user_id_idx
  on public.consulting_time_entries(user_id);

create trigger user_integrations_set_updated_at
  before update on public.user_integrations
  for each row execute function private.set_updated_at();
create trigger integration_events_set_updated_at
  before update on public.integration_events
  for each row execute function private.set_updated_at();
create trigger consulting_engagements_set_updated_at
  before update on public.consulting_engagements
  for each row execute function private.set_updated_at();
create trigger consulting_requests_set_updated_at
  before update on public.consulting_requests
  for each row execute function private.set_updated_at();
create trigger consulting_time_entries_set_updated_at
  before update on public.consulting_time_entries
  for each row execute function private.set_updated_at();

alter table public.notifications enable row level security;
alter table public.user_integrations enable row level security;
alter table public.privacy_consents enable row level security;
alter table public.integration_events enable row level security;
alter table public.webhook_events enable row level security;
alter table public.audit_logs enable row level security;
alter table public.consulting_engagements enable row level security;
alter table public.consulting_requests enable row level security;
alter table public.consulting_time_entries enable row level security;

create policy "notifications_select_own"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "notifications_update_own"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "notifications_delete_own"
  on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "user_integrations_select_own"
  on public.user_integrations for select to authenticated
  using (user_id = (select auth.uid()));
create policy "privacy_consents_select_own"
  on public.privacy_consents for select to authenticated
  using (user_id = (select auth.uid()));
create policy "privacy_consents_insert_own"
  on public.privacy_consents for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "audit_logs_read_admin"
  on public.audit_logs for select to authenticated
  using ((select private.is_platform_admin(null)));

create policy "consulting_engagements_select_org"
  on public.consulting_engagements for select to authenticated
  using (
    (select private.is_org_member(organization_id))
    or (select private.is_platform_admin(null))
  );
create policy "consulting_requests_select_org"
  on public.consulting_requests for select to authenticated
  using (
    exists (
      select 1
      from public.consulting_engagements engagements
      where engagements.id = engagement_id
        and (
          (select private.is_org_member(engagements.organization_id))
          or (select private.is_platform_admin(null))
        )
    )
  );
create policy "consulting_requests_insert_org"
  on public.consulting_requests for insert to authenticated
  with check (
    requested_by = (select auth.uid())
    and status = 'submitted'
    and exists (
      select 1
      from public.consulting_engagements engagements
      where engagements.id = engagement_id
        and engagements.status = 'active'
        and (select private.is_org_member(engagements.organization_id))
    )
  );
create policy "consulting_time_entries_select_org"
  on public.consulting_time_entries for select to authenticated
  using (
    exists (
      select 1
      from public.consulting_engagements engagements
      where engagements.id = engagement_id
        and (
          (select private.is_org_member(engagements.organization_id))
          or (select private.is_platform_admin(null))
        )
    )
  );

grant select, update, delete on public.notifications to authenticated;
grant select on public.user_integrations to authenticated;
grant select, insert on public.privacy_consents to authenticated;
grant select on public.audit_logs to authenticated;
grant select on public.consulting_engagements, public.consulting_time_entries to authenticated;
grant select, insert on public.consulting_requests to authenticated;
