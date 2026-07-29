create type public.workspace_provisioning_status as enum (
  'pending_verification',
  'pending_payment',
  'ready',
  'processing',
  'completed',
  'failed'
);

create table public.workspace_provisioning_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  organization_name text not null,
  province_or_region text,
  plan_id text not null references public.membership_plans(id),
  billing_interval public.billing_interval not null,
  status public.workspace_provisioning_status not null default 'pending_verification',
  checkout_session_id text unique,
  provider_customer_id text,
  provider_subscription_id text unique,
  provider_status public.subscription_status,
  quantity integer not null default 1,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  stripe_snapshot jsonb not null default '{}'::jsonb,
  email_verified_at timestamptz,
  payment_confirmed_at timestamptz,
  organization_id uuid references public.organizations(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  attempts integer not null default 0,
  last_error text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_provisioning_email_normalized
    check (email = lower(trim(email))),
  constraint workspace_provisioning_names_present
    check (
      char_length(trim(full_name)) between 1 and 160
      and char_length(trim(organization_name)) between 1 and 180
    ),
  constraint workspace_provisioning_quantity_positive check (quantity > 0),
  constraint workspace_provisioning_period_window check (
    current_period_end is null
    or current_period_start is null
    or current_period_end >= current_period_start
  ),
  constraint workspace_provisioning_completion_consistent check (
    status <> 'completed'
    or (
      organization_id is not null
      and subscription_id is not null
      and completed_at is not null
    )
  )
);

create index workspace_provisioning_status_idx
  on public.workspace_provisioning_requests(status, updated_at);

create trigger workspace_provisioning_requests_set_updated_at
  before update on public.workspace_provisioning_requests
  for each row execute function private.set_updated_at();

alter table public.workspace_provisioning_requests enable row level security;

revoke all on public.workspace_provisioning_requests from public;
revoke all on public.workspace_provisioning_requests from anon;
revoke all on public.workspace_provisioning_requests from authenticated;
grant select, insert, update, delete
  on public.workspace_provisioning_requests to service_role;

create or replace function public.attempt_workspace_provisioning(
  target_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_record public.workspace_provisioning_requests%rowtype;
  auth_email text;
  auth_verified_at timestamptz;
  target_organization_id uuid;
  target_subscription_id uuid;
  existing_subscription_organization_id uuid;
  slug_base text;
  target_slug text;
begin
  select *
  into request_record
  from public.workspace_provisioning_requests
  where id = target_request_id
  for update;

  if not found then
    return jsonb_build_object(
      'status', 'not_found',
      'request_id', target_request_id
    );
  end if;

  if request_record.status = 'completed' then
    return jsonb_build_object(
      'status', 'completed',
      'request_id', request_record.id,
      'organization_id', request_record.organization_id,
      'subscription_id', request_record.subscription_id
    );
  end if;

  select lower(email), email_confirmed_at
  into auth_email, auth_verified_at
  from auth.users
  where id = request_record.user_id;

  update public.workspace_provisioning_requests
  set
    attempts = attempts + 1,
    email_verified_at = auth_verified_at,
    last_error = null
  where id = request_record.id;

  if auth_email is null or auth_email <> request_record.email then
    update public.workspace_provisioning_requests
    set
      status = 'failed',
      last_error = 'The authenticated account does not match this activation request.'
    where id = request_record.id;

    return jsonb_build_object(
      'status', 'failed',
      'request_id', request_record.id,
      'error', 'The authenticated account does not match this activation request.'
    );
  end if;

  if auth_verified_at is null then
    update public.workspace_provisioning_requests
    set status = 'pending_verification'
    where id = request_record.id;

    return jsonb_build_object(
      'status', 'pending_verification',
      'request_id', request_record.id
    );
  end if;

  if request_record.payment_confirmed_at is null
    or request_record.provider_subscription_id is null
    or request_record.provider_status not in ('trialing', 'active')
  then
    update public.workspace_provisioning_requests
    set status = 'pending_payment'
    where id = request_record.id;

    return jsonb_build_object(
      'status', 'pending_payment',
      'request_id', request_record.id
    );
  end if;

  update public.workspace_provisioning_requests
  set status = 'processing'
  where id = request_record.id;

  begin
    select members.organization_id
    into target_organization_id
    from public.organization_members members
    where members.user_id = request_record.user_id
      and members.role = 'owner'
    order by members.created_at
    limit 1;

    if target_organization_id is null then
      slug_base := trim(both '-' from regexp_replace(
        lower(request_record.organization_name),
        '[^a-z0-9]+',
        '-',
        'g'
      ));
      slug_base := left(coalesce(nullif(slug_base, ''), 'organization'), 48);
      target_slug := slug_base || '-' || left(request_record.user_id::text, 8);

      insert into public.organizations (
        name,
        slug,
        province_or_region,
        created_by
      )
      values (
        trim(request_record.organization_name),
        target_slug,
        request_record.province_or_region,
        request_record.user_id
      )
      on conflict (slug) do update
      set
        name = excluded.name,
        province_or_region = excluded.province_or_region
      returning id into target_organization_id;

      insert into public.organization_members (
        organization_id,
        user_id,
        role,
        status,
        joined_at
      )
      values (
        target_organization_id,
        request_record.user_id,
        'owner',
        'active',
        now()
      )
      on conflict (organization_id, user_id) do update
      set
        role = 'owner',
        status = 'active',
        joined_at = coalesce(
          public.organization_members.joined_at,
          excluded.joined_at
        );
    end if;

    insert into public.organization_brand_profiles (
      organization_id,
      display_name
    )
    values (
      target_organization_id,
      trim(request_record.organization_name)
    )
    on conflict (organization_id) do nothing;

    select subscriptions.id, subscriptions.organization_id
    into target_subscription_id, existing_subscription_organization_id
    from public.subscriptions subscriptions
    where subscriptions.provider = 'stripe'
      and subscriptions.provider_subscription_id =
        request_record.provider_subscription_id
    limit 1;

    if target_subscription_id is not null
      and existing_subscription_organization_id <> target_organization_id
    then
      raise exception
        'Stripe subscription % is already assigned to another organization.',
        request_record.provider_subscription_id;
    end if;

    if target_subscription_id is null then
      insert into public.subscriptions (
        organization_id,
        plan_id,
        provider,
        provider_customer_id,
        provider_subscription_id,
        billing_interval,
        status,
        quantity,
        current_period_start,
        current_period_end,
        cancel_at_period_end,
        canceled_at,
        metadata
      )
      values (
        target_organization_id,
        request_record.plan_id,
        'stripe',
        request_record.provider_customer_id,
        request_record.provider_subscription_id,
        request_record.billing_interval,
        request_record.provider_status,
        request_record.quantity,
        request_record.current_period_start,
        request_record.current_period_end,
        request_record.cancel_at_period_end,
        request_record.canceled_at,
        jsonb_build_object(
          'signup_user_id', request_record.user_id,
          'billing_province', request_record.province_or_region,
          'checkout_session_id', request_record.checkout_session_id,
          'provisioning_request_id', request_record.id
        )
      )
      returning id into target_subscription_id;
    end if;

    update public.workspace_provisioning_requests
    set
      status = 'completed',
      organization_id = target_organization_id,
      subscription_id = target_subscription_id,
      completed_at = coalesce(completed_at, now()),
      last_error = null
    where id = request_record.id;
  exception
    when others then
      update public.workspace_provisioning_requests
      set
        status = 'failed',
        last_error = sqlerrm
      where id = request_record.id;

      return jsonb_build_object(
        'status', 'failed',
        'request_id', request_record.id,
        'error', sqlerrm
      );
  end;

  return jsonb_build_object(
    'status', 'completed',
    'request_id', request_record.id,
    'organization_id', target_organization_id,
    'subscription_id', target_subscription_id
  );
end;
$$;

revoke all on function public.attempt_workspace_provisioning(uuid) from public;
revoke all on function public.attempt_workspace_provisioning(uuid) from anon;
revoke all on function public.attempt_workspace_provisioning(uuid) from authenticated;
grant execute on function public.attempt_workspace_provisioning(uuid)
  to service_role;
