-- Partner referral program: public applications, approved links, lifecycle
-- milestones, and manual payout tracking.

create table public.referral_program_settings (
  id boolean primary key default true,
  program_enabled boolean not null default true,
  demo_attended_payout_cents integer not null default 10000,
  retained_customer_payout_cents integer not null default 40000,
  retention_days integer not null default 90,
  currency text not null default 'CAD',
  contact_email text not null default 'referrals@olivesocialimpact.com',
  terms_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint referral_program_settings_singleton check (id),
  constraint referral_program_settings_demo_payout_nonnegative check (demo_attended_payout_cents >= 0),
  constraint referral_program_settings_retained_payout_nonnegative check (retained_customer_payout_cents >= 0),
  constraint referral_program_settings_retention_days_positive check (retention_days between 1 and 730),
  constraint referral_program_settings_currency_format check (currency ~ '^[A-Z]{3}$'),
  constraint referral_program_settings_contact_email_format check (
    contact_email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
  )
);

insert into public.referral_program_settings (id)
values (true)
on conflict (id) do nothing;

create table public.referrers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text not null,
  organization_name text,
  relationship_to_olea text not null,
  payout_contact text not null,
  terms_accepted boolean not null default false,
  status text not null default 'pending',
  status_reason text,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  rejected_at timestamptz,
  suspended_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint referrers_full_name_length check (char_length(btrim(full_name)) between 2 and 160),
  constraint referrers_email_format check (
    email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
  ),
  constraint referrers_organization_length check (
    organization_name is null or char_length(btrim(organization_name)) between 2 and 180
  ),
  constraint referrers_relationship_length check (char_length(btrim(relationship_to_olea)) between 3 and 500),
  constraint referrers_payout_contact_length check (char_length(btrim(payout_contact)) between 3 and 500),
  constraint referrers_status_check check (
    status in ('pending', 'approved', 'rejected', 'suspended', 'archived')
  ),
  constraint referrers_terms_required check (terms_accepted)
);

create unique index referrers_email_lower_uidx
  on public.referrers(lower(email));
create index referrers_user_id_idx on public.referrers(user_id);
create index referrers_status_created_at_idx on public.referrers(status, created_at desc);

create table public.referral_links (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.referrers(id) on delete cascade,
  code text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  deactivated_at timestamptz,
  constraint referral_links_code_format check (code ~ '^OLEA-[A-Z0-9]{6,16}$')
);

create unique index referral_links_referrer_active_uidx
  on public.referral_links(referrer_id)
  where active;

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referral_link_id uuid not null references public.referral_links(id) on delete restrict,
  referrer_id uuid not null references public.referrers(id) on delete restrict,
  referral_code text not null,
  referred_email text,
  referred_user_id uuid references auth.users(id) on delete set null,
  referred_organization_id uuid references public.organizations(id) on delete set null,
  referred_provisioning_request_id uuid references public.workspace_provisioning_requests(id) on delete set null,
  source_url text,
  status text not null default 'lead_created',
  metadata jsonb not null default '{}'::jsonb,
  last_milestone_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint referrals_code_format check (referral_code ~ '^OLEA-[A-Z0-9]{6,16}$'),
  constraint referrals_referred_email_format check (
    referred_email is null or referred_email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
  ),
  constraint referrals_status_check check (
    status in (
      'lead_created',
      'demo_booked',
      'demo_attended',
      'subscription_started',
      'retained',
      'payout_eligible',
      'paid',
      'rejected'
    )
  )
);

create unique index referrals_referred_provisioning_uidx
  on public.referrals(referred_provisioning_request_id)
  where referred_provisioning_request_id is not null;
create index referrals_referrer_status_idx on public.referrals(referrer_id, status, created_at desc);
create index referrals_code_idx on public.referrals(referral_code);

create table public.referral_milestones (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals(id) on delete cascade,
  milestone text not null,
  occurred_at timestamptz not null default now(),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint referral_milestones_milestone_check check (
    milestone in (
      'lead_created',
      'demo_booked',
      'demo_attended',
      'subscription_started',
      'retained',
      'payout_eligible',
      'paid',
      'rejected'
    )
  )
);

create unique index referral_milestones_referral_milestone_uidx
  on public.referral_milestones(referral_id, milestone);

create table public.referral_payouts (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals(id) on delete cascade,
  milestone text not null,
  amount_cents integer not null,
  currency text not null default 'CAD',
  status text not null default 'pending',
  due_at timestamptz,
  paid_at timestamptz,
  notes text,
  evidence_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint referral_payouts_milestone_check check (
    milestone in ('demo_attended', 'retained')
  ),
  constraint referral_payouts_amount_nonnegative check (amount_cents >= 0),
  constraint referral_payouts_currency_format check (currency ~ '^[A-Z]{3}$'),
  constraint referral_payouts_status_check check (
    status in ('pending', 'eligible', 'paid', 'rejected')
  )
);

create unique index referral_payouts_referral_milestone_uidx
  on public.referral_payouts(referral_id, milestone);

create table public.referral_audit_events (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid references public.referrers(id) on delete cascade,
  referral_id uuid references public.referrals(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint referral_audit_events_type_length check (char_length(btrim(event_type)) between 2 and 120)
);

create index referral_audit_referrer_created_idx
  on public.referral_audit_events(referrer_id, created_at desc);
create index referral_audit_referral_created_idx
  on public.referral_audit_events(referral_id, created_at desc);

alter table public.referral_program_settings enable row level security;
alter table public.referrers enable row level security;
alter table public.referral_links enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_milestones enable row level security;
alter table public.referral_payouts enable row level security;
alter table public.referral_audit_events enable row level security;

revoke all on public.referral_program_settings from public, anon, authenticated;
revoke all on public.referrers from public, anon, authenticated;
revoke all on public.referral_links from public, anon, authenticated;
revoke all on public.referrals from public, anon, authenticated;
revoke all on public.referral_milestones from public, anon, authenticated;
revoke all on public.referral_payouts from public, anon, authenticated;
revoke all on public.referral_audit_events from public, anon, authenticated;

grant select, insert, update, delete on public.referral_program_settings to service_role;
grant select, insert, update, delete on public.referrers to service_role;
grant select, insert, update, delete on public.referral_links to service_role;
grant select, insert, update, delete on public.referrals to service_role;
grant select, insert, update, delete on public.referral_milestones to service_role;
grant select, insert, update, delete on public.referral_payouts to service_role;
grant select, insert, update, delete on public.referral_audit_events to service_role;

create trigger referral_program_settings_set_updated_at
  before update on public.referral_program_settings
  for each row execute function private.set_updated_at();
create trigger referrers_set_updated_at
  before update on public.referrers
  for each row execute function private.set_updated_at();
create trigger referrals_set_updated_at
  before update on public.referrals
  for each row execute function private.set_updated_at();
create trigger referral_payouts_set_updated_at
  before update on public.referral_payouts
  for each row execute function private.set_updated_at();

create or replace function public.record_partner_signup_referral(
  target_request_id uuid,
  target_organization_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_record public.workspace_provisioning_requests%rowtype;
  link_record public.referral_links%rowtype;
  referrer_record public.referrers%rowtype;
  referral_record public.referrals%rowtype;
  settings_record public.referral_program_settings%rowtype;
  normalized_code text;
begin
  select * into request_record
  from public.workspace_provisioning_requests
  where id = target_request_id;

  if not found or request_record.referral_code is null or btrim(request_record.referral_code) = '' then
    return jsonb_build_object('status', 'none');
  end if;

  normalized_code := upper(btrim(request_record.referral_code));

  select * into link_record
  from public.referral_links
  where code = normalized_code and active;

  if not found then
    return jsonb_build_object('status', 'none');
  end if;

  select * into referrer_record
  from public.referrers
  where id = link_record.referrer_id and status = 'approved';

  if not found then
    return jsonb_build_object('status', 'rejected');
  end if;

  if lower(referrer_record.email) = lower(request_record.email) then
    update public.workspace_provisioning_requests
    set referral_status = 'rejected'
    where id = target_request_id;

    insert into public.referral_audit_events (
      referrer_id, event_type, message, metadata
    )
    values (
      referrer_record.id,
      'self_referral_rejected',
      'Signup used the same email as the approved referrer.',
      jsonb_build_object('request_id', target_request_id)
    );

    return jsonb_build_object('status', 'rejected', 'reason', 'self_referral');
  end if;

  select * into settings_record
  from public.referral_program_settings
  where id = true;

  insert into public.referrals (
    referral_link_id,
    referrer_id,
    referral_code,
    referred_email,
    referred_user_id,
    referred_organization_id,
    referred_provisioning_request_id,
    status,
    metadata,
    last_milestone_at
  )
  values (
    link_record.id,
    referrer_record.id,
    normalized_code,
    lower(request_record.email),
    request_record.user_id,
    target_organization_id,
    target_request_id,
    'subscription_started',
    jsonb_build_object(
      'plan_id', request_record.plan_id,
      'billing_interval', request_record.billing_interval
    ),
    now()
  )
  on conflict (referred_provisioning_request_id) do update
  set referred_organization_id = excluded.referred_organization_id,
      referred_user_id = excluded.referred_user_id,
      referred_email = excluded.referred_email,
      metadata = public.referrals.metadata || excluded.metadata,
      last_milestone_at = case
        when public.referrals.status in ('lead_created', 'demo_booked', 'subscription_started')
          then now()
        else public.referrals.last_milestone_at
      end,
      status = case
        when public.referrals.status in ('lead_created', 'demo_booked', 'subscription_started')
          then 'subscription_started'
        else public.referrals.status
      end,
      updated_at = now()
  returning * into referral_record;

  insert into public.referral_milestones (referral_id, milestone, metadata)
  values (
    referral_record.id,
    'subscription_started',
    jsonb_build_object('request_id', target_request_id, 'organization_id', target_organization_id)
  )
  on conflict (referral_id, milestone) do nothing;

  insert into public.referral_payouts (
    referral_id, milestone, amount_cents, currency, status, due_at, notes
  )
  values (
    referral_record.id,
    'retained',
    coalesce(settings_record.retained_customer_payout_cents, 40000),
    coalesce(settings_record.currency, 'CAD'),
    'pending',
    now() + make_interval(days => coalesce(settings_record.retention_days, 90)),
    'Eligible after retention window if the customer stays active.'
  )
  on conflict (referral_id, milestone) do nothing;

  update public.workspace_provisioning_requests
  set referral_status = 'qualified'
  where id = target_request_id;

  insert into public.referral_audit_events (
    referrer_id, referral_id, event_type, message, metadata
  )
  values (
    referrer_record.id,
    referral_record.id,
    'subscription_started',
    'Referral signup completed payment and workspace provisioning.',
    jsonb_build_object('request_id', target_request_id, 'organization_id', target_organization_id)
  );

  return jsonb_build_object(
    'status', 'subscription_started',
    'referral_id', referral_record.id,
    'referrer_id', referrer_record.id
  );
end;
$$;

revoke all on function public.record_partner_signup_referral(uuid, uuid) from public, anon, authenticated;
grant execute on function public.record_partner_signup_referral(uuid, uuid) to service_role;
