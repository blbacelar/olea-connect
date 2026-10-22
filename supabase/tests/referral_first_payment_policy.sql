begin;

select plan(8);

select is(
  (select demo_attended_payout_cents from public.referral_program_settings where id),
  0,
  'the demo reward is disabled'
);

select is(
  (select retained_customer_payout_cents from public.referral_program_settings where id),
  0,
  'the retention reward is disabled'
);

select ok(
  position(
    'insert into public.referral_payouts' in lower(
      pg_get_functiondef('public.record_partner_signup_referral(uuid,uuid)'::regprocedure)
    )
  ) = 0,
  'workspace provisioning cannot create a payout'
);

select has_column(
  'public', 'referral_payouts', 'source_invoice_id',
  'first-payment payouts retain Stripe invoice evidence'
);

select has_index(
  'public', 'referral_payouts', 'referral_payouts_first_payment_organization_uidx',
  'only one first-payment commission can exist per organization'
);

insert into public.referrers (
  full_name, email, relationship_to_olea, payout_contact, terms_accepted, status
) values (
  'Policy Test Referrer', 'policy-test@example.org',
  'Works with nonprofits', 'finance@example.org', true, 'approved'
);
insert into public.referral_links (referrer_id, code)
select id, 'OLEA-POLICYTEST'
from public.referrers where email = 'policy-test@example.org';
insert into public.referrals (
  referral_link_id, referrer_id, referral_code, status
)
select link.id, link.referrer_id, link.code, 'subscription_started'
from public.referral_links link where code = 'OLEA-POLICYTEST';

select lives_ok(
  $test$
    insert into public.referral_payouts (
      referral_id, milestone, source_invoice_id, purchase_amount_cents,
      referred_organization_id, amount_cents, currency
    )
    select id, 'first_payment', 'in_policy123', 80000,
      '00000000-0000-4000-8000-000000009999'::uuid, 8000, 'CAD'
    from public.referrals where referral_code = 'OLEA-POLICYTEST'
  $test$,
  'a verified quarterly payment can create an 8000-cent commission'
);

select throws_ok(
  $test$
    insert into public.referral_payouts (
      referral_id, milestone, source_invoice_id, purchase_amount_cents,
      referred_organization_id, amount_cents, currency
    )
    select id, 'first_payment', 'in_wrongamount', 80000,
      '00000000-0000-4000-8000-000000009998'::uuid, 10000, 'CAD'
    from public.referrals where referral_code = 'OLEA-POLICYTEST'
  $test$,
  '23514',
  null,
  'the database rejects a commission that does not match 10 percent'
);

select throws_ok(
  $test$
    insert into public.referral_payouts (
      referral_id, milestone, source_invoice_id, purchase_amount_cents,
      referred_organization_id, amount_cents, currency
    )
    select id, 'first_payment', null, 80000,
      '00000000-0000-4000-8000-000000009997'::uuid, 8000, 'CAD'
    from public.referrals where referral_code = 'OLEA-POLICYTEST'
  $test$,
  '23514',
  null,
  'the database rejects a commission without Stripe invoice evidence'
);

select * from finish();
rollback;
