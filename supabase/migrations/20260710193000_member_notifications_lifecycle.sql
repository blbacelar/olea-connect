alter table public.notifications
  add column if not exists idempotency_key text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.notifications
  drop constraint if exists notifications_action_url_internal;

alter table public.notifications
  add constraint notifications_action_url_internal
  check (action_url is null or action_url ~ '^/(?!/)[A-Za-z0-9/_?=&.:%+#-]*$')
  not valid;

alter table public.notifications
  validate constraint notifications_action_url_internal;

revoke update, delete on public.notifications from authenticated;
grant select on public.notifications to authenticated;

create unique index if not exists notifications_user_idempotency_key_idx
  on public.notifications(user_id, idempotency_key);

create index if not exists notifications_user_active_idx
  on public.notifications(user_id, read_at, expires_at, created_at desc);

create or replace function private.enqueue_notification(
  target_user_id uuid,
  target_organization_id uuid,
  target_type text,
  target_title text,
  target_body text,
  target_action_url text default null,
  target_severity public.notification_severity default 'info',
  target_expires_at timestamptz default null,
  target_idempotency_key text default null,
  target_metadata jsonb default '{}'::jsonb,
  target_email_event_type text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  notification_id uuid;
  recipient_email text;
begin
  if target_user_id is null then
    raise exception 'Notification target user is required.';
  end if;

  if target_type is null or target_type !~ '^[a-z0-9_]+$' then
    raise exception 'Notification type must use lowercase letters, numbers, and underscores.';
  end if;

  if target_action_url is not null and target_action_url !~ '^/(?!/)[A-Za-z0-9/_?=&.:%+#-]*$' then
    raise exception 'Notification action URL must be an internal path.';
  end if;

  if target_organization_id is not null and not exists (
    select 1
    from public.organization_members members
    where members.user_id = target_user_id
      and members.organization_id = target_organization_id
      and members.status = 'active'
  ) then
    raise exception 'Notification target user is not an active member of the organization.';
  end if;

  with inserted as (
    insert into public.notifications (
      user_id,
      organization_id,
      severity,
      type,
      title,
      body,
      action_url,
      expires_at,
      idempotency_key,
      metadata
    )
    values (
      target_user_id,
      target_organization_id,
      target_severity,
      target_type,
      target_title,
      target_body,
      target_action_url,
      target_expires_at,
      target_idempotency_key,
      coalesce(target_metadata, '{}'::jsonb)
    )
    on conflict do nothing
    returning id
  )
  select id into notification_id from inserted;

  if notification_id is null and target_idempotency_key is not null then
    select id
    into notification_id
    from public.notifications
    where user_id = target_user_id
      and idempotency_key = target_idempotency_key
    limit 1;
  end if;

  if target_email_event_type is not null and notification_id is not null then
    select users.email
    into recipient_email
    from auth.users users
    where users.id = target_user_id;

    if recipient_email is not null then
      insert into public.integration_events (
        event_type,
        aggregate_type,
        aggregate_id,
        provider,
        payload,
        idempotency_key
      )
      values (
        target_email_event_type,
        'notification',
        notification_id::text,
        'email',
        jsonb_build_object(
          'notification_id', notification_id,
          'recipient_email', recipient_email,
          'recipient_user_id', target_user_id,
          'organization_id', target_organization_id,
          'type', target_type,
          'title', target_title,
          'body', target_body,
          'action_url', target_action_url,
          'metadata', coalesce(target_metadata, '{}'::jsonb)
        ),
        target_email_event_type || ':' || notification_id::text
      )
      on conflict (idempotency_key) do nothing;
    end if;
  end if;

  return notification_id;
end;
$$;

revoke all on function private.enqueue_notification(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  public.notification_severity,
  timestamptz,
  text,
  jsonb,
  text
) from public;
revoke all on function private.enqueue_notification(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  public.notification_severity,
  timestamptz,
  text,
  jsonb,
  text
) from anon;
revoke all on function private.enqueue_notification(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  public.notification_severity,
  timestamptz,
  text,
  jsonb,
  text
) from authenticated;

create or replace function public.mark_notification_read(target_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_count integer;
begin
  update public.notifications
  set read_at = coalesce(read_at, now())
  where id = target_notification_id
    and user_id = auth.uid()
    and (expires_at is null or expires_at > now());

  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

create or replace function public.mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_count integer;
begin
  update public.notifications
  set read_at = now()
  where user_id = auth.uid()
    and read_at is null
    and (expires_at is null or expires_at > now());

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;

create or replace function private.notify_org_admins(
  target_organization_id uuid,
  target_type text,
  target_title text,
  target_body text,
  target_action_url text,
  target_severity public.notification_severity,
  target_expires_at timestamptz,
  target_idempotency_prefix text,
  target_metadata jsonb default '{}'::jsonb,
  target_email_event_type text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient record;
begin
  for recipient in
    select user_id
    from public.organization_members
    where organization_id = target_organization_id
      and role in ('owner', 'admin')
      and status = 'active'
  loop
    perform private.enqueue_notification(
      recipient.user_id,
      target_organization_id,
      target_type,
      target_title,
      target_body,
      target_action_url,
      target_severity,
      target_expires_at,
      target_idempotency_prefix || ':' || recipient.user_id::text,
      target_metadata,
      target_email_event_type
    );
  end loop;
end;
$$;

revoke all on function private.notify_org_admins(
  uuid,
  text,
  text,
  text,
  text,
  public.notification_severity,
  timestamptz,
  text,
  jsonb,
  text
) from public, anon, authenticated;

create or replace function private.enqueue_template_available_notifications_for_resource(
  target_resource_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  resource_row record;
  recipient record;
begin
  select *
  into resource_row
  from public.resources
  where id = target_resource_id;

  if resource_row.id is null
    or resource_row.type::text <> 'template'
    or resource_row.status::text <> 'published' then
    return;
  end if;

  for recipient in
    select distinct members.user_id, members.organization_id
    from public.organization_members members
    join public.subscriptions subscriptions
      on subscriptions.organization_id = members.organization_id
     and subscriptions.status in ('trialing', 'active')
    left join public.resource_plan_access plan_access
      on plan_access.resource_id = resource_row.id
     and plan_access.plan_id = subscriptions.plan_id
    left join public.organization_resource_access org_access
      on org_access.resource_id = resource_row.id
     and org_access.organization_id = members.organization_id
     and org_access.starts_at <= now()
     and (org_access.ends_at is null or org_access.ends_at > now())
    where members.status = 'active'
      and (plan_access.resource_id is not null or org_access.id is not null)
  loop
    perform private.enqueue_notification(
      recipient.user_id,
      recipient.organization_id,
      'template_available',
      'New template available',
      resource_row.title || ' was added to your template library.',
      '/templates/' || resource_row.slug,
      'info',
      null,
      'template_available:' || resource_row.id::text || ':' || recipient.user_id::text,
      jsonb_build_object('resource_id', resource_row.id, 'resource_slug', resource_row.slug),
      null
    );
  end loop;
end;
$$;

create or replace function private.enqueue_template_available_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.type::text = 'template'
    and new.status::text = 'published'
    and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    perform private.enqueue_template_available_notifications_for_resource(new.id);
  end if;

  return new;
end;
$$;

create or replace function private.enqueue_template_access_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.enqueue_template_available_notifications_for_resource(new.resource_id);
  return new;
end;
$$;

drop trigger if exists resources_enqueue_template_available_notifications on public.resources;
create trigger resources_enqueue_template_available_notifications
  after insert or update of status on public.resources
  for each row execute function private.enqueue_template_available_notifications();

drop trigger if exists resource_plan_access_enqueue_template_available_notifications on public.resource_plan_access;
create trigger resource_plan_access_enqueue_template_available_notifications
  after insert or update on public.resource_plan_access
  for each row execute function private.enqueue_template_access_notifications();

drop trigger if exists organization_resource_access_enqueue_template_available_notifications on public.organization_resource_access;
create trigger organization_resource_access_enqueue_template_available_notifications
  after insert or update on public.organization_resource_access
  for each row execute function private.enqueue_template_access_notifications();

create or replace function private.enqueue_grant_round_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient record;
  notification_kind text;
  notification_title text;
  notification_body text;
begin
  if new.status::text = 'open'
    and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    notification_kind := 'grant_round_open';
    notification_title := 'Grant applications are open';
    notification_body := new.name || ' is now accepting applications.';
  elsif new.status::text = 'awarded'
    and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    notification_kind := 'grant_round_results';
    notification_title := 'Grant results are available';
    notification_body := new.name || ' results have been posted.';
  else
    return new;
  end if;

  for recipient in
    select distinct members.user_id, members.organization_id
    from public.organization_members members
    join public.subscriptions subscriptions
      on subscriptions.organization_id = members.organization_id
     and subscriptions.status in ('trialing', 'active')
    where members.status = 'active'
  loop
    perform private.enqueue_notification(
      recipient.user_id,
      recipient.organization_id,
      notification_kind,
      notification_title,
      notification_body,
      '/grants',
      case when new.status::text = 'open' then 'success'::public.notification_severity else 'info'::public.notification_severity end,
      coalesce(new.closes_at, now() + interval '90 days'),
      notification_kind || ':' || new.id::text || ':' || recipient.user_id::text,
      jsonb_build_object('grant_round_id', new.id, 'grant_round_status', new.status),
      null
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists grant_rounds_enqueue_notifications on public.grant_rounds;
create trigger grant_rounds_enqueue_notifications
  after insert or update of status on public.grant_rounds
  for each row execute function private.enqueue_grant_round_notifications();

create or replace function private.enqueue_grant_award_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  application_organization_id uuid;
  recipient record;
begin
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;

  select organization_id
  into application_organization_id
  from public.grant_applications
  where id = new.application_id;

  if application_organization_id is null then
    return new;
  end if;

  for recipient in
    select user_id
    from public.organization_members
    where organization_id = application_organization_id
      and status = 'active'
  loop
    perform private.enqueue_notification(
      recipient.user_id,
      application_organization_id,
      'grant_award_' || new.status::text,
      'Grant application update',
      'Your Olea Gives application status is now ' || replace(new.status::text, '_', ' ') || '.',
      '/grants',
      case when new.status::text = 'approved' then 'success'::public.notification_severity else 'info'::public.notification_severity end,
      now() + interval '180 days',
      'grant_award:' || new.id::text || ':' || new.status::text || ':' || recipient.user_id::text,
      jsonb_build_object('grant_award_id', new.id, 'grant_application_id', new.application_id, 'status', new.status),
      'grant.award.' || new.status::text
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists grant_awards_enqueue_notifications on public.grant_awards;
create trigger grant_awards_enqueue_notifications
  after insert or update of status on public.grant_awards
  for each row execute function private.enqueue_grant_award_notifications();

create or replace function private.enqueue_event_available_notifications(target_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_row record;
  recipient record;
begin
  select *
  into event_row
  from public.events
  where id = target_event_id;

  if event_row.id is null
    or event_row.status::text not in ('scheduled', 'live', 'rescheduled') then
    return;
  end if;

  for recipient in
    select distinct members.user_id, members.organization_id
    from public.organization_members members
    join public.subscriptions subscriptions
      on subscriptions.organization_id = members.organization_id
     and subscriptions.status in ('trialing', 'active')
    join public.event_plan_access access
      on access.event_id = event_row.id
     and access.plan_id = subscriptions.plan_id
    where members.status = 'active'
      and (
        access.included
        or access.complimentary_ticket_limit is not null
        or access.ticket_price_cents is not null
      )
  loop
    perform private.enqueue_notification(
      recipient.user_id,
      recipient.organization_id,
      'webinar_available',
      'New webinar available',
      event_row.title || ' is now available for your plan.',
      '/webinars/' || event_row.slug,
      'info',
      event_row.ends_at + interval '30 days',
      'webinar_available:' || event_row.id::text || ':' || recipient.user_id::text,
      jsonb_build_object('event_id', event_row.id, 'event_slug', event_row.slug),
      null
    );
  end loop;
end;
$$;

create or replace function private.enqueue_event_available_notifications_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_event_id uuid;
begin
  if tg_table_name = 'event_plan_access' then
    target_event_id := new.event_id;
  else
    target_event_id := new.id;
  end if;

  perform private.enqueue_event_available_notifications(target_event_id);
  return new;
end;
$$;

drop trigger if exists event_plan_access_enqueue_available_notifications on public.event_plan_access;
create trigger event_plan_access_enqueue_available_notifications
  after insert or update on public.event_plan_access
  for each row execute function private.enqueue_event_available_notifications_trigger();

drop trigger if exists events_enqueue_available_notifications on public.events;
create trigger events_enqueue_available_notifications
  after insert or update of status on public.events
  for each row execute function private.enqueue_event_available_notifications_trigger();

create or replace function private.enqueue_event_schedule_change_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  email_event_type text;
  in_app_type text;
  in_app_title text;
  in_app_body text;
  in_app_severity public.notification_severity;
  recipient record;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if old.status is distinct from new.status and new.status::text = 'canceled' then
    email_event_type := 'event.canceled';
    in_app_type := 'webinar_canceled';
    in_app_title := 'Webinar canceled';
    in_app_body := new.title || ' has been canceled.';
    in_app_severity := 'warning';
  elsif (
    old.starts_at is distinct from new.starts_at
    or old.ends_at is distinct from new.ends_at
    or old.timezone is distinct from new.timezone
    or (old.status is distinct from new.status and new.status::text = 'rescheduled')
  ) and new.status::text in ('scheduled', 'live', 'rescheduled') then
    email_event_type := 'event.rescheduled';
    in_app_type := 'webinar_rescheduled';
    in_app_title := 'Webinar schedule changed';
    in_app_body := new.title || ' has an updated schedule.';
    in_app_severity := 'info';
  else
    return new;
  end if;

  for recipient in
    select
      registrations.user_id,
      registrations.organization_id,
      users.email
    from public.event_registrations registrations
    join auth.users users on users.id = registrations.user_id
    where registrations.event_id = new.id
      and registrations.status in ('registered', 'waitlisted', 'attended')
      and users.email is not null
  loop
    perform private.enqueue_notification(
      recipient.user_id,
      recipient.organization_id,
      in_app_type,
      in_app_title,
      in_app_body,
      '/webinars/' || new.slug,
      in_app_severity,
      new.ends_at + interval '30 days',
      in_app_type || ':' || new.id::text || ':' || recipient.user_id::text || ':' || coalesce(new.starts_at::text, ''),
      jsonb_build_object('event_id', new.id, 'event_slug', new.slug, 'event_status', new.status),
      null
    );

    insert into public.integration_events (
      event_type,
      aggregate_type,
      aggregate_id,
      provider,
      payload,
      idempotency_key
    )
    values (
      email_event_type,
      'event',
      new.id::text,
      'email',
      jsonb_build_object(
        'event_id', new.id,
        'event_title', new.title,
        'event_slug', new.slug,
        'event_status', new.status,
        'starts_at', new.starts_at,
        'ends_at', new.ends_at,
        'timezone', new.timezone,
        'recipient_email', recipient.email,
        'recipient_user_id', recipient.user_id,
        'organization_id', recipient.organization_id
      ),
      email_event_type || ':' || new.id::text || ':' || recipient.user_id::text || ':' || coalesce(new.starts_at::text, '')
    )
    on conflict (idempotency_key) do nothing;
  end loop;

  return new;
end;
$$;

drop trigger if exists events_enqueue_schedule_change_notifications on public.events;
create trigger events_enqueue_schedule_change_notifications
  after update of status, starts_at, ends_at, timezone on public.events
  for each row execute function private.enqueue_event_schedule_change_notifications();

create or replace function private.enqueue_event_recording_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient record;
begin
  if new.recording_url is null
    or old.recording_url is not null
    or new.status::text not in ('completed', 'archived') then
    return new;
  end if;

  for recipient in
    select user_id, organization_id
    from public.event_registrations
    where event_id = new.id
      and status in ('registered', 'attended')
  loop
    perform private.enqueue_notification(
      recipient.user_id,
      recipient.organization_id,
      'webinar_recording_available',
      'Webinar recording available',
      'The recording for ' || new.title || ' is ready to watch.',
      '/webinars/' || new.slug,
      'success',
      now() + interval '180 days',
      'webinar_recording:' || new.id::text || ':' || recipient.user_id::text,
      jsonb_build_object('event_id', new.id, 'event_slug', new.slug),
      'event.recording_available'
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists events_enqueue_recording_notifications on public.events;
create trigger events_enqueue_recording_notifications
  after update of recording_url, status on public.events
  for each row execute function private.enqueue_event_recording_notifications();

create or replace function private.enqueue_team_invitation_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  seat_limit integer;
  reserved_seats integer;
begin
  perform private.notify_org_admins(
    new.organization_id,
    'team_invitation_sent',
    'Team invitation sent',
    'An invitation was sent to ' || new.email || '.',
    '/team',
    'info',
    new.expires_at,
    'team_invitation_sent:' || new.id::text,
    jsonb_build_object('invitation_id', new.id, 'email', new.email, 'role', new.role),
    null
  );

  select coalesce(plans.included_seats, 1)
       + coalesce(sum(case when items.item_type = 'seat' and items.active then items.quantity else 0 end), 0)
  into seat_limit
  from public.subscriptions subscriptions
  left join public.membership_plans plans on plans.id = subscriptions.plan_id
  left join public.subscription_items items on items.subscription_id = subscriptions.id
  where subscriptions.organization_id = new.organization_id
    and subscriptions.status in ('trialing', 'active')
  group by subscriptions.id, plans.included_seats, subscriptions.created_at
  order by subscriptions.created_at desc
  limit 1;

  select
    (
      select count(*)::integer
      from public.organization_members members
      where members.organization_id = new.organization_id
        and members.status = 'active'
    )
    +
    (
      select count(*)::integer
      from public.organization_invitations invitations
      where invitations.organization_id = new.organization_id
        and invitations.status = 'pending'
        and invitations.expires_at > now()
    )
  into reserved_seats;

  if coalesce(seat_limit, 1) <= coalesce(reserved_seats, 0) then
    perform private.notify_org_admins(
      new.organization_id,
      'seat_limit_reached',
      'Seat limit reached',
      'Your team has used all available seats. Add seats before inviting more members.',
      '/team',
      'warning',
      now() + interval '30 days',
      'seat_limit_reached:' || new.organization_id::text || ':' || coalesce(seat_limit, 1)::text || ':' || coalesce(reserved_seats, 0)::text,
      jsonb_build_object('seat_limit', coalesce(seat_limit, 1), 'reserved_seats', coalesce(reserved_seats, 0)),
      null
    );
  end if;

  return new;
end;
$$;

drop trigger if exists organization_invitations_enqueue_notifications on public.organization_invitations;
create trigger organization_invitations_enqueue_notifications
  after insert on public.organization_invitations
  for each row execute function private.enqueue_team_invitation_notifications();

create or replace function private.enqueue_team_member_change_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.role <> 'owner' then
    perform private.notify_org_admins(
      new.organization_id,
      'team_member_added',
      'Team member added',
      'A team member joined your workspace.',
      '/team',
      'success',
      now() + interval '30 days',
      'team_member_added:' || new.organization_id::text || ':' || new.user_id::text,
      jsonb_build_object('member_user_id', new.user_id, 'role', new.role, 'status', new.status),
      null
    );
  elsif old.status is distinct from new.status or old.role is distinct from new.role then
    perform private.notify_org_admins(
      new.organization_id,
      'team_member_updated',
      'Team member updated',
      'A team member role or status changed.',
      '/team',
      'info',
      now() + interval '30 days',
      'team_member_updated:' || new.organization_id::text || ':' || new.user_id::text || ':' || new.status::text || ':' || new.role::text,
      jsonb_build_object('member_user_id', new.user_id, 'role', new.role, 'status', new.status),
      null
    );
  end if;

  return new;
end;
$$;

drop trigger if exists organization_members_enqueue_notifications on public.organization_members;
create trigger organization_members_enqueue_notifications
  after insert or update of status, role on public.organization_members
  for each row execute function private.enqueue_team_member_change_notifications();

create or replace function private.enqueue_subscription_renewal_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op <> 'UPDATE'
    or new.status::text not in ('trialing', 'active')
    or new.current_period_end is null
    or new.current_period_end <= now()
    or new.current_period_end > now() + interval '30 days' then
    return new;
  end if;

  perform private.notify_org_admins(
    new.organization_id,
    'membership_renewal_upcoming',
    'Membership renewal coming up',
    'Your Olea Connects membership renews soon.',
    '/subscription',
    'info',
    new.current_period_end,
    'membership_renewal:' || new.id::text || ':' || new.current_period_end::date::text,
    jsonb_build_object('subscription_id', new.id, 'current_period_end', new.current_period_end, 'plan_id', new.plan_id),
    null
  );

  return new;
end;
$$;

drop trigger if exists subscriptions_enqueue_renewal_notifications on public.subscriptions;
create trigger subscriptions_enqueue_renewal_notifications
  after insert or update of status, current_period_end on public.subscriptions
  for each row execute function private.enqueue_subscription_renewal_notifications();
