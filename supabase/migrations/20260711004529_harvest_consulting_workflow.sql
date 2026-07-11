alter type public.platform_role add value if not exists 'consulting_admin';
alter type public.platform_role add value if not exists 'consultant';

do $$
begin
  create type public.consulting_request_urgency as enum (
    'low',
    'standard',
    'high',
    'urgent'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.consulting_requests
  add column if not exists urgency public.consulting_request_urgency not null default 'standard',
  add column if not exists scheduled_at timestamptz,
  add column if not exists internal_notes text,
  add column if not exists member_notes text;

alter table public.consulting_requests
  drop constraint if exists consulting_requests_title_length,
  add constraint consulting_requests_title_length
    check (char_length(title) between 3 and 180),
  drop constraint if exists consulting_requests_description_length,
  add constraint consulting_requests_description_length
    check (char_length(description) between 10 and 5000);

create table if not exists public.consulting_request_attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.consulting_requests(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  file_name text not null,
  file_path text not null,
  content_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  constraint consulting_request_attachments_file_name_length
    check (char_length(file_name) between 1 and 255),
  constraint consulting_request_attachments_file_path_length
    check (char_length(file_path) between 1 and 1024),
  constraint consulting_request_attachments_size_nonnegative
    check (size_bytes is null or size_bytes >= 0)
);

create table if not exists public.consulting_request_activity (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.consulting_requests(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  old_status public.consulting_request_status,
  new_status public.consulting_request_status,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint consulting_request_activity_event_type_format
    check (event_type ~ '^[a-z0-9_.]+$')
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'consulting-attachments',
  'consulting-attachments',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg',
    'text/plain'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create index if not exists consulting_requests_status_updated_idx
  on public.consulting_requests(status, updated_at desc);
create index if not exists consulting_requests_urgency_idx
  on public.consulting_requests(urgency);
create index if not exists consulting_request_attachments_request_idx
  on public.consulting_request_attachments(request_id);
create index if not exists consulting_request_attachments_org_idx
  on public.consulting_request_attachments(organization_id);
create index if not exists consulting_request_activity_request_idx
  on public.consulting_request_activity(request_id, created_at desc);
create index if not exists consulting_request_activity_org_idx
  on public.consulting_request_activity(organization_id, created_at desc);

alter table public.consulting_request_attachments enable row level security;
alter table public.consulting_request_activity enable row level security;

create or replace function private.is_consulting_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.platform_user_roles roles
    where roles.user_id = (select auth.uid())
      and roles.role::text in ('super_admin', 'consulting_admin', 'consultant')
  );
$$;

drop policy if exists "consulting_request_attachments_select_org"
  on public.consulting_request_attachments;
create policy "consulting_request_attachments_select_org"
  on public.consulting_request_attachments for select to authenticated
  using (
    (select private.is_org_member(organization_id))
    or (select private.is_consulting_staff())
  );

drop policy if exists "consulting_request_activity_select_org"
  on public.consulting_request_activity;
create policy "consulting_request_activity_select_org"
  on public.consulting_request_activity for select to authenticated
  using (
    (select private.is_org_member(organization_id))
    or (select private.is_consulting_staff())
  );

grant select on public.consulting_request_attachments to authenticated;
grant select on public.consulting_request_activity to authenticated;

create or replace function private.is_harvest_organization(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.subscriptions subscriptions
    where subscriptions.organization_id = target_organization_id
      and subscriptions.plan_id = 'harvest'
      and subscriptions.status in ('trialing', 'active')
  );
$$;

drop policy if exists "consulting_requests_insert_org"
  on public.consulting_requests;
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
        and (select private.is_harvest_organization(engagements.organization_id))
    )
  );

create or replace function private.get_active_consulting_subscription(
  target_organization_id uuid
)
returns table (
  subscription_id uuid,
  period_start date,
  period_end date
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    subscriptions.id,
    coalesce(subscriptions.current_period_start::date, current_date),
    coalesce(
      subscriptions.current_period_end::date,
      (date_trunc('month', current_date)::date + interval '1 month - 1 day')::date
    )
  from public.subscriptions subscriptions
  where subscriptions.organization_id = target_organization_id
    and subscriptions.plan_id = 'harvest'
    and subscriptions.status in ('trialing', 'active')
  order by subscriptions.created_at desc
  limit 1;
$$;

create or replace function public.create_consulting_request(
  target_type public.consulting_request_type,
  target_title text,
  target_description text,
  target_urgency public.consulting_request_urgency default 'standard'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  member_organization_id uuid;
  active_subscription record;
  engagement_id uuid;
  request_id uuid;
  staff_user_id uuid;
begin
  if current_user_id is null then
    raise exception 'Sign in before requesting consulting support.';
  end if;

  select members.organization_id
  into member_organization_id
  from public.organization_members members
  where members.user_id = current_user_id
    and members.status = 'active'
  order by members.created_at asc
  limit 1;

  if member_organization_id is null then
    raise exception 'An active organization membership is required.';
  end if;

  select * into active_subscription
  from private.get_active_consulting_subscription(member_organization_id)
  limit 1;

  if active_subscription.subscription_id is null then
    raise exception 'Only active Harvest organizations can request consulting support.';
  end if;

  if char_length(trim(target_title)) < 3 then
    raise exception 'Enter a request title.';
  end if;

  if char_length(trim(target_description)) < 10 then
    raise exception 'Describe what you need in at least 10 characters.';
  end if;

  select engagements.id
  into engagement_id
  from public.consulting_engagements engagements
  where engagements.organization_id = member_organization_id
    and engagements.subscription_id = active_subscription.subscription_id
  limit 1;

  if engagement_id is null then
    insert into public.consulting_engagements (
      organization_id,
      subscription_id,
      status,
      starts_on,
      ends_on
    )
    values (
      member_organization_id,
      active_subscription.subscription_id,
      'active',
      active_subscription.period_start,
      active_subscription.period_end
    )
    returning id into engagement_id;
  else
    update public.consulting_engagements
    set
      status = case when status = 'planned' then 'active' else status end,
      starts_on = active_subscription.period_start,
      ends_on = active_subscription.period_end
    where id = engagement_id;
  end if;

  insert into public.consulting_requests (
    engagement_id,
    requested_by,
    type,
    status,
    title,
    description,
    urgency
  )
  values (
    engagement_id,
    current_user_id,
    target_type,
    'submitted',
    trim(target_title),
    trim(target_description),
    target_urgency
  )
  returning id into request_id;

  insert into public.consulting_request_activity (
    request_id,
    organization_id,
    actor_user_id,
    event_type,
    new_status,
    message
  )
  values (
    request_id,
    member_organization_id,
    current_user_id,
    'request.created',
    'submitted',
    'Consulting request submitted.'
  );

  for staff_user_id in
    select roles.user_id
    from public.platform_user_roles roles
    where roles.role::text in ('super_admin', 'consulting_admin', 'consultant')
  loop
    perform private.enqueue_notification(
      staff_user_id,
      null,
      'consulting_request_submitted',
      'New Harvest consulting request',
      trim(target_title),
      '/consulting?tab=staff',
      'info',
      null,
      'consulting-request-submitted:' || request_id::text || ':' || staff_user_id::text,
      jsonb_build_object('request_id', request_id, 'organization_id', member_organization_id),
      null
    );
  end loop;

  return request_id;
end;
$$;

create or replace function public.update_consulting_request_operations(
  target_request_id uuid,
  target_status public.consulting_request_status,
  target_assigned_to uuid default null,
  target_due_at timestamptz default null,
  target_scheduled_at timestamptz default null,
  target_internal_notes text default null,
  target_member_notes text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  existing_request record;
begin
  if current_user_id is null then
    raise exception 'Sign in before managing consulting requests.';
  end if;

  if not (select private.is_consulting_staff()) then
    raise exception 'Only consulting staff can manage consulting requests.';
  end if;

  select
    requests.id,
    requests.status,
    engagements.organization_id,
    requests.requested_by
  into existing_request
  from public.consulting_requests requests
  join public.consulting_engagements engagements
    on engagements.id = requests.engagement_id
  where requests.id = target_request_id
  for update of requests;

  if existing_request.id is null then
    raise exception 'Consulting request not found.';
  end if;

  if target_assigned_to is not null and not exists (
    select 1
    from public.platform_user_roles roles
    where roles.user_id = target_assigned_to
      and roles.role::text in ('super_admin', 'consulting_admin', 'consultant')
  ) then
    raise exception 'Assigned user must be consulting staff.';
  end if;

  update public.consulting_requests
  set
    status = target_status,
    assigned_to = target_assigned_to,
    due_at = target_due_at,
    scheduled_at = target_scheduled_at,
    internal_notes = nullif(trim(coalesce(target_internal_notes, '')), ''),
    member_notes = nullif(trim(coalesce(target_member_notes, '')), ''),
    completed_at = case
      when target_status = 'completed' then coalesce(completed_at, now())
      else null
    end
  where id = target_request_id;

  insert into public.consulting_request_activity (
    request_id,
    organization_id,
    actor_user_id,
    event_type,
    old_status,
    new_status,
    message,
    metadata
  )
  values (
    target_request_id,
    existing_request.organization_id,
    current_user_id,
    'request.updated',
    existing_request.status,
    target_status,
    coalesce(nullif(trim(target_member_notes), ''), 'Request updated by consulting staff.'),
    jsonb_build_object(
      'assigned_to', target_assigned_to,
      'due_at', target_due_at,
      'scheduled_at', target_scheduled_at
    )
  );

  perform private.enqueue_notification(
    existing_request.requested_by,
    existing_request.organization_id,
    'consulting_request_updated',
    'Consulting request updated',
    'Your Harvest consulting request status is now ' || replace(target_status::text, '_', ' ') || '.',
    '/consulting',
    case when target_status = 'completed' then 'success'::public.notification_severity else 'info'::public.notification_severity end,
    null,
    'consulting-request-updated:' || target_request_id::text || ':' || target_status::text || ':' || extract(epoch from now())::text,
    jsonb_build_object('request_id', target_request_id, 'status', target_status),
    null
  );

  return true;
end;
$$;

create or replace function public.record_consulting_time_entry(
  target_request_id uuid,
  target_minutes integer,
  target_description text,
  target_work_date date default current_date,
  target_is_in_kind boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  request_record record;
  purchased_minutes integer := 0;
  used_minutes integer := 0;
  available_minutes integer := 0;
  remaining_minutes integer := 0;
  entry_id uuid;
begin
  if current_user_id is null then
    raise exception 'Sign in before recording consulting time.';
  end if;

  if not (select private.is_consulting_staff()) then
    raise exception 'Only consulting staff can record consulting time.';
  end if;

  if target_minutes is null or target_minutes <= 0 then
    raise exception 'Time entries must be greater than zero minutes.';
  end if;

  if char_length(trim(target_description)) < 3 then
    raise exception 'Describe the work completed.';
  end if;

  select
    requests.id as request_id,
    requests.status,
    requests.requested_by,
    engagements.id as engagement_id,
    engagements.organization_id,
    engagements.subscription_id,
    engagements.monthly_included_minutes,
    engagements.monthly_in_kind_minutes
  into request_record
  from public.consulting_requests requests
  join public.consulting_engagements engagements
    on engagements.id = requests.engagement_id
  where requests.id = target_request_id
  for update of engagements, requests;

  if request_record.request_id is null then
    raise exception 'Consulting request not found.';
  end if;

  select coalesce(sum(items.quantity * 60), 0)::integer
  into purchased_minutes
  from public.subscription_items items
  where items.subscription_id = request_record.subscription_id
    and items.item_type = 'consulting_hour'
    and items.active;

  select coalesce(sum(entries.minutes), 0)::integer
  into used_minutes
  from public.consulting_time_entries entries
  where entries.engagement_id = request_record.engagement_id
    and entries.is_in_kind = target_is_in_kind;

  available_minutes := case
    when target_is_in_kind then request_record.monthly_in_kind_minutes
    else request_record.monthly_included_minutes + purchased_minutes
  end;

  if used_minutes + target_minutes > available_minutes then
    raise exception 'This time entry exceeds the available consulting hours for the current period.';
  end if;

  remaining_minutes := greatest(available_minutes - used_minutes - target_minutes, 0);

  insert into public.consulting_time_entries (
    engagement_id,
    request_id,
    user_id,
    work_date,
    minutes,
    is_in_kind,
    description
  )
  values (
    request_record.engagement_id,
    target_request_id,
    current_user_id,
    coalesce(target_work_date, current_date),
    target_minutes,
    target_is_in_kind,
    trim(target_description)
  )
  returning id into entry_id;

  if request_record.status in ('submitted', 'accepted') then
    update public.consulting_requests
    set status = 'in_progress'
    where id = target_request_id;
  end if;

  insert into public.consulting_request_activity (
    request_id,
    organization_id,
    actor_user_id,
    event_type,
    old_status,
    new_status,
    message,
    metadata
  )
  values (
    target_request_id,
    request_record.organization_id,
    current_user_id,
    'time.recorded',
    request_record.status,
    case when request_record.status in ('submitted', 'accepted') then 'in_progress'::public.consulting_request_status else request_record.status end,
    'Consulting time recorded.',
    jsonb_build_object(
      'minutes', target_minutes,
      'is_in_kind', target_is_in_kind,
      'entry_id', entry_id
    )
  );

  perform private.enqueue_notification(
    request_record.requested_by,
    request_record.organization_id,
    'consulting_time_recorded',
    'Consulting time recorded',
    (
      target_minutes::text
      || ' minutes were added to your Harvest consulting request. '
      || remaining_minutes::text
      || ' minutes remain in this support bucket for the current period.'
    ),
    '/consulting',
    'info',
    null,
    'consulting-time-recorded:' || entry_id::text,
    jsonb_build_object(
      'request_id', target_request_id,
      'time_entry_id', entry_id,
      'remaining_minutes', remaining_minutes,
      'is_in_kind', target_is_in_kind
    ),
    null
  );

  return entry_id;
end;
$$;

revoke all on function private.is_harvest_organization(uuid) from public, anon, authenticated;
revoke all on function private.is_consulting_staff() from public, anon, authenticated;
revoke all on function private.get_active_consulting_subscription(uuid) from public, anon, authenticated;
grant execute on function private.is_harvest_organization(uuid) to authenticated;
grant execute on function private.is_consulting_staff() to authenticated;

revoke all on function public.create_consulting_request(
  public.consulting_request_type,
  text,
  text,
  public.consulting_request_urgency
) from public, anon;
grant execute on function public.create_consulting_request(
  public.consulting_request_type,
  text,
  text,
  public.consulting_request_urgency
) to authenticated;

revoke all on function public.update_consulting_request_operations(
  uuid,
  public.consulting_request_status,
  uuid,
  timestamptz,
  timestamptz,
  text,
  text
) from public, anon;
grant execute on function public.update_consulting_request_operations(
  uuid,
  public.consulting_request_status,
  uuid,
  timestamptz,
  timestamptz,
  text,
  text
) to authenticated;

revoke all on function public.record_consulting_time_entry(
  uuid,
  integer,
  text,
  date,
  boolean
) from public, anon;
grant execute on function public.record_consulting_time_entry(
  uuid,
  integer,
  text,
  date,
  boolean
) to authenticated;
