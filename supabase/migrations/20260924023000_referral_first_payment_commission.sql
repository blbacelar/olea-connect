-- Keep historical rewards for audit, but never pay an unverified legacy reward.
alter table public.referral_program_settings
  alter column demo_attended_payout_cents set default 0,
  alter column retained_customer_payout_cents set default 0;
update public.referral_program_settings
set demo_attended_payout_cents = 0,
    retained_customer_payout_cents = 0;

update public.referral_payouts
set status = 'rejected',
    notes = concat_ws(' ', notes, 'Superseded by first-payment commission policy.')
where milestone in ('demo_attended', 'retained')
  and status in ('pending', 'eligible');

alter table public.referral_payouts
  drop constraint referral_payouts_milestone_check;
alter table public.referral_payouts
  add constraint referral_payouts_milestone_check
  check (milestone in ('demo_attended', 'retained', 'first_payment'));
alter table public.referral_payouts
  add column source_invoice_id text,
  add column purchase_amount_cents integer,
  add column referred_organization_id uuid;
alter table public.referral_payouts
  add constraint referral_payouts_first_payment_evidence_check
  check (
    milestone <> 'first_payment' or (
      source_invoice_id is not null and source_invoice_id ~ '^in_[A-Za-z0-9]+$'
      and purchase_amount_cents > 0
      and referred_organization_id is not null
      and amount_cents = least(50000, (purchase_amount_cents + 5) / 10)
      and currency = 'CAD'
    )
  );
create unique index referral_payouts_source_invoice_uidx
  on public.referral_payouts(source_invoice_id)
  where source_invoice_id is not null;
create unique index referral_payouts_first_payment_organization_uidx
  on public.referral_payouts(referred_organization_id)
  where milestone = 'first_payment';

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
    'Referral signup linked to a workspace; commission awaits first paid invoice.',
    jsonb_build_object('request_id', target_request_id, 'organization_id', target_organization_id)
  );

  return jsonb_build_object(
    'status', 'subscription_started',
    'referral_id', referral_record.id,
    'referrer_id', referrer_record.id
  );
end;
$$;
