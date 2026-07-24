-- Signup context, auditable legal consent, referral attribution, and founding-member state.

alter table public.workspace_provisioning_requests
  add column if not exists organization_kind public.organization_kind,
  add column if not exists annual_budget_range text,
  add column if not exists board_size_range text,
  add column if not exists contact_phone text,
  add column if not exists acquisition_source text,
  add column if not exists referral_code text,
  add column if not exists referral_status text not null default 'none',
  add column if not exists founding_member_eligible boolean not null default false,
  add column if not exists founding_discount_identifier text,
  add column if not exists founding_member_year integer;

alter table public.workspace_provisioning_requests
  add constraint workspace_provisioning_budget_range_check check (
    annual_budget_range is null or annual_budget_range in (
      'under-250k', '250k-500k', '500k-1m', '1m-2m', '2m-5m', 'over-5m'
    )
  ),
  add constraint workspace_provisioning_board_size_check check (
    board_size_range is null or board_size_range in ('3-5', '6-10', '11-15', '16-20', '20plus')
  ),
  add constraint workspace_provisioning_phone_format_check check (
    contact_phone is null or contact_phone ~ '^\+?[0-9 ()().-]{7,24}$'
  ),
  add constraint workspace_provisioning_referral_status_check check (
    referral_status in ('none', 'pending', 'qualified', 'rewarded', 'rejected')
  ),
  add constraint workspace_provisioning_founding_year_check check (
    founding_member_year is null or founding_member_year = 1
  );

alter table public.organizations
  add column if not exists annual_budget_range text,
  add column if not exists board_size_range text,
  add column if not exists contact_phone text,
  add column if not exists acquisition_source text;

alter table public.organizations
  add constraint organizations_budget_range_check check (
    annual_budget_range is null or annual_budget_range in (
      'under-250k', '250k-500k', '500k-1m', '1m-2m', '2m-5m', 'over-5m'
    )
  ),
  add constraint organizations_board_size_check check (
    board_size_range is null or board_size_range in ('3-5', '6-10', '11-15', '16-20', '20plus')
  ),
  add constraint organizations_phone_format_check check (
    contact_phone is null or contact_phone ~ '^\+?[0-9 ()().-]{7,24}$'
  );

alter table public.privacy_consents
  add column if not exists signup_request_id uuid references public.workspace_provisioning_requests(id) on delete set null,
  add column if not exists document_path text,
  add column if not exists context jsonb not null default '{}'::jsonb;

create index if not exists workspace_provisioning_referral_code_idx
  on public.workspace_provisioning_requests(referral_code)
  where referral_code is not null;
create index if not exists privacy_consents_signup_request_idx
  on public.privacy_consents(signup_request_id);
create unique index if not exists privacy_consents_signup_request_type_uidx
  on public.privacy_consents(signup_request_id, consent_type);

create table public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  code text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint referral_codes_format check (code ~ '^OLEA-[A-Z0-9]{6,16}$')
);

create table public.organization_referrals (
  id uuid primary key default gen_random_uuid(),
  referral_code_id uuid not null references public.referral_codes(id),
  referrer_organization_id uuid not null references public.organizations(id) on delete cascade,
  referred_organization_id uuid not null unique references public.organizations(id) on delete cascade,
  referred_provisioning_request_id uuid not null unique references public.workspace_provisioning_requests(id) on delete cascade,
  status text not null default 'qualified',
  first_successful_payment_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_referrals_not_self check (referrer_organization_id <> referred_organization_id),
  constraint organization_referrals_status_check check (status in ('qualified', 'rewarded', 'rejected'))
);

create table public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.organization_referrals(id) on delete cascade,
  reward_number integer not null,
  grant_amount_cents integer not null default 0,
  coaching_hours numeric(5,2) not null default 0,
  reward_name text not null,
  status text not null default 'pending',
  idempotency_key text not null unique,
  credited_at timestamptz,
  created_at timestamptz not null default now(),
  constraint referral_rewards_number_positive check (reward_number > 0),
  constraint referral_rewards_grant_nonnegative check (grant_amount_cents >= 0),
  constraint referral_rewards_hours_nonnegative check (coaching_hours >= 0),
  constraint referral_rewards_status_check check (status in ('pending', 'credited'))
);

alter table public.referral_codes enable row level security;
alter table public.organization_referrals enable row level security;
alter table public.referral_rewards enable row level security;

revoke all on public.referral_codes from public, anon, authenticated;
revoke all on public.organization_referrals from public, anon, authenticated;
revoke all on public.referral_rewards from public, anon, authenticated;
grant select, insert, update, delete on public.referral_codes to service_role;
grant select, insert, update, delete on public.organization_referrals to service_role;
grant select, insert, update, delete on public.referral_rewards to service_role;
grant select, insert, update on public.privacy_consents to service_role;

create table public.founding_member_claims (
  claim_number integer primary key,
  provisioning_request_id uuid not null unique references public.workspace_provisioning_requests(id) on delete cascade,
  organization_id uuid unique references public.organizations(id) on delete set null,
  discount_identifier text not null,
  status text not null default 'reserved',
  claimed_at timestamptz not null default now(),
  paid_at timestamptz,
  constraint founding_member_claim_number_check check (claim_number between 1 and 50),
  constraint founding_member_claim_status_check check (status in ('reserved', 'paid', 'released'))
);

alter table public.founding_member_claims enable row level security;
revoke all on public.founding_member_claims from public, anon, authenticated;
grant select, insert, update on public.founding_member_claims to service_role;

create or replace function public.reserve_founding_member(
  target_request_id uuid,
  target_discount_identifier text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_claim public.founding_member_claims%rowtype;
  claimed_count integer;
  next_claim_number integer;
begin
  if target_discount_identifier is null or btrim(target_discount_identifier) = '' then
    return jsonb_build_object('eligible', false);
  end if;

  perform pg_advisory_xact_lock(hashtext('olea-connects:founding-member-claims'));

  select * into existing_claim
  from public.founding_member_claims
  where provisioning_request_id = target_request_id;

  if found and existing_claim.status <> 'released' then
    return jsonb_build_object(
      'eligible', true,
      'claim_number', existing_claim.claim_number,
      'discount_identifier', existing_claim.discount_identifier
    );
  end if;

  select count(*)::integer into claimed_count
  from public.founding_member_claims
  where status in ('reserved', 'paid');

  if claimed_count >= 50 then
    update public.workspace_provisioning_requests
    set founding_member_eligible = false,
        founding_discount_identifier = null,
        founding_member_year = null
    where id = target_request_id;
    return jsonb_build_object('eligible', false);
  end if;

  select min(candidate)::integer into next_claim_number
  from generate_series(1, 50) as candidate
  where not exists (
    select 1
    from public.founding_member_claims
    where claim_number = candidate
  );

  if next_claim_number is null then
    update public.workspace_provisioning_requests
    set founding_member_eligible = false,
        founding_discount_identifier = null,
        founding_member_year = null
    where id = target_request_id;
    return jsonb_build_object('eligible', false);
  end if;

  insert into public.founding_member_claims (
    claim_number, provisioning_request_id, discount_identifier
  )
  values (next_claim_number, target_request_id, target_discount_identifier)
  on conflict (provisioning_request_id) do update
  set status = 'reserved',
      discount_identifier = excluded.discount_identifier,
      claimed_at = now(),
      paid_at = null;

  update public.workspace_provisioning_requests
  set founding_member_eligible = true,
      founding_discount_identifier = target_discount_identifier,
      founding_member_year = 1
  where id = target_request_id;

  return jsonb_build_object(
    'eligible', true,
    'discount_identifier', target_discount_identifier
  );
end;
$$;

revoke all on function public.reserve_founding_member(uuid, text) from public, anon, authenticated;
grant execute on function public.reserve_founding_member(uuid, text) to service_role;

create or replace function private.create_organization_referral_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.referral_codes (organization_id, code)
  values (
    new.id,
    'OLEA-' || upper(left(replace(new.id::text, '-', ''), 10))
  )
  on conflict (organization_id) do nothing;
  return new;
end;
$$;

drop trigger if exists organizations_create_referral_code on public.organizations;
create trigger organizations_create_referral_code
  after insert on public.organizations
  for each row execute function private.create_organization_referral_code();

insert into public.referral_codes (organization_id, code)
select organizations.id, 'OLEA-' || upper(left(replace(organizations.id::text, '-', ''), 10))
from public.organizations
on conflict (organization_id) do nothing;

create or replace function private.apply_signup_organization_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.organization_id is not null and new.status = 'completed' then
    update public.organizations
    set
      kind = coalesce(new.organization_kind, kind),
      annual_budget_range = new.annual_budget_range,
      board_size_range = new.board_size_range,
      contact_phone = new.contact_phone,
      acquisition_source = new.acquisition_source
    where id = new.organization_id;
  end if;
  return new;
end;
$$;

drop trigger if exists workspace_provisioning_apply_profile on public.workspace_provisioning_requests;
create trigger workspace_provisioning_apply_profile
  after update of status, organization_id on public.workspace_provisioning_requests
  for each row execute function private.apply_signup_organization_profile();

create or replace function public.finalize_signup_referral(
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
  code_record public.referral_codes%rowtype;
  referral_record public.organization_referrals%rowtype;
  prior_rewards integer;
  reward_number integer;
  reward_name text;
  grant_amount integer;
  coaching numeric(5,2);
begin
  select * into request_record
  from public.workspace_provisioning_requests
  where id = target_request_id;

  if not found or request_record.referral_code is null or btrim(request_record.referral_code) = '' then
    return jsonb_build_object('status', 'none');
  end if;

  select * into code_record
  from public.referral_codes
  where code = upper(btrim(request_record.referral_code)) and active;

  if not found or code_record.organization_id = target_organization_id then
    update public.workspace_provisioning_requests
    set referral_status = 'rejected'
    where id = target_request_id;
    return jsonb_build_object('status', 'rejected');
  end if;

  perform pg_advisory_xact_lock(
    hashtext('olea-connects:referral-rewards:' || code_record.organization_id::text)
  );

  insert into public.organization_referrals (
    referral_code_id,
    referrer_organization_id,
    referred_organization_id,
    referred_provisioning_request_id
  )
  values (
    code_record.id,
    code_record.organization_id,
    target_organization_id,
    target_request_id
  )
  on conflict (referred_provisioning_request_id) do nothing;

  select * into referral_record
  from public.organization_referrals
  where referred_provisioning_request_id = target_request_id;

  select count(*)::integer into prior_rewards
  from public.organization_referrals
  where referrer_organization_id = code_record.organization_id
    and status = 'rewarded'
    and id <> referral_record.id;

  reward_number := prior_rewards + 1;
  if reward_number = 1 then
    reward_name := 'Olea Gives grant and coaching';
    grant_amount := 25000;
    coaching := 2;
  elsif reward_number = 2 then
    reward_name := 'Olea Gives grant and coaching';
    grant_amount := 50000;
    coaching := 4;
  else
    reward_name := 'Olea Champion recognition';
    grant_amount := 0;
    coaching := 0;
  end if;

  insert into public.referral_rewards (
    referral_id, reward_number, grant_amount_cents, coaching_hours,
    reward_name, status, idempotency_key, credited_at
  )
  values (
    referral_record.id, reward_number, grant_amount, coaching,
    reward_name, 'credited',
    'signup-referral:' || referral_record.id::text,
    now()
  )
  on conflict (idempotency_key) do nothing;

  update public.organization_referrals
  set status = 'rewarded', updated_at = now()
  where id = referral_record.id;
  update public.workspace_provisioning_requests
  set referral_status = 'rewarded'
  where id = target_request_id;

  update public.founding_member_claims
  set status = 'paid', organization_id = target_organization_id, paid_at = now()
  where provisioning_request_id = target_request_id and status = 'reserved';

  return jsonb_build_object(
    'status', 'rewarded',
    'referral_id', referral_record.id,
    'reward_number', reward_number
  );
end;
$$;

revoke all on function public.finalize_signup_referral(uuid, uuid) from public, anon, authenticated;
grant execute on function public.finalize_signup_referral(uuid, uuid) to service_role;

create or replace function public.mark_founding_member_paid(
  target_request_id uuid,
  target_organization_id uuid
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.founding_member_claims
  set status = 'paid', organization_id = target_organization_id, paid_at = now()
  where provisioning_request_id = target_request_id and status = 'reserved';
$$;

revoke all on function public.mark_founding_member_paid(uuid, uuid) from public, anon, authenticated;
grant execute on function public.mark_founding_member_paid(uuid, uuid) to service_role;
