# Referral Program

> Policy confirmed September 23, 2026: One commission per referred organization,
> equal to 10% of the amount actually paid on its first successful quarterly or
> annual membership invoice, capped at CAD $500. No reward for a link click,
> introduction, demo, trial, signup, or renewal. Commission records remain
> pending until a finance administrator reviews them. Refund/chargeback
> handling and disbursement operations still need launch approval.

The Olea referral program lets approved partners share a unique referral link and track qualified introductions from signup through manual payout review.

## Member-Facing Flow

1. A prospective referrer visits `/referrals` and submits the application form.
2. The form validates name, email, relationship context, payout contact details, and terms acceptance before writing to `public.referrers`.
3. Olea receives an internal email notification and the applicant receives a confirmation email through the existing email outbox.
4. A platform `super_admin` reviews the application at `/settings/referrals`.
5. Approved referrers receive a non-guessable `OLEA-...` link, for example `/ref/OLEA-ABC123XYZ`.
6. The referral redirect stores the code in `olea_referral_code` and sends the visitor to signup with `?ref=...`.
7. Checkout persists the normalized referral code on the provisioning request. Workspace provisioning records the partner referral after activation and prevents duplicate credit or self-referrals. Activation may include a trial, so this record alone is not proof of a paid purchase.
8. A positive paid Stripe membership invoice creates one pending commission. The referrer dashboard at `/referrals/dashboard` shows their active link, referred customers, milestone status, and commission records.

## Admin Operations

`/settings/referrals` is visible only to `super_admin` users. Admins can:

- Update program availability, contact email, and terms URL. The old fixed
  demo and retention reward fields are no longer editable or used.
- Approve, reject, suspend, or archive referrers.
- Manually move referrals through lifecycle milestones.
- Mark payouts pending, eligible, paid, or rejected.
- Export referral, referrer, and payout records to CSV for finance review.

Suspending, rejecting, or archiving a referrer deactivates any active referral link.

## Data Model

The migration `20260821173409_referral_program.sql` creates:

- `referral_program_settings`
- `referrers`
- `referral_links`
- `referrals`
- `referral_milestones`
- `referral_payouts`
- `referral_audit_events`

RLS is enabled on all referral tables. Direct access is revoked from `anon` and `authenticated`; server actions and route handlers use the Supabase service role after enforcing app-level authorization.

## Payout Logic

`20260924023000_referral_first_payment_commission.sql` retires the automatic
$100/$400 rewards, rejects their unpaid historical rows while retaining them
for audit, and requires a unique Stripe invoice ID and referred organization
on new first-payment commissions. The webhook and provisioning catch-up path
select the earliest positive paid subscription-creation or cycle invoice;
prorations and renewals do not create additional rewards. The commission is
`min(10% of invoice.amount_paid, CAD $500)`, rounded to cents. This includes
the amount actually paid after discounts and any applicable tax. The record is
pending, not an automatic transfer. Before approving or paying, finance must
check refund/chargeback status; the exact reversal policy is not yet approved.

## Verification

QA cases and coverage:

| Case | Expected result | Coverage |
| --- | --- | --- |
| Approved link, signup, no payment or demo only | Referral may exist; no commission | Referral E2E and commission unit test |
| First quarterly or annual paid invoice | 10% of amount paid after discount, capped at CAD $500 | Commission unit test and database constraint test |
| Renewal, proration, or duplicate webhook | No second commission | Invoice-selection and idempotency unit tests; organization unique index |
| Self-referral, revoked link, or manual financial status | Rejected or blocked | Referral E2E and provisioning rules |
| Rejected referral or missing invoice evidence | Cannot approve payout | Server action checks |
| Stripe unavailable, refund, or chargeback | Approval/paid action blocked; finance review required | Payment verification unit test; refund policy remains unapproved |

Relevant automated tests:

- `tests/unit/referral-program.test.ts`
- `tests/unit/referral-first-payment-commission.test.ts`
- `tests/unit/referral-payment-verification.test.ts`
- `supabase/tests/referral_first_payment_policy.sql`
- `tests/e2e/referral-link.spec.ts`
- `tests/unit/signup-flow.test.ts`
- `tests/unit/stripe-registration.test.ts`

For a release, also run an authenticated staging smoke test:

1. Submit a referral application.
2. Approve the referrer as a `super_admin`.
3. Open the generated `/ref/OLEA-...` link.
4. Complete signup and checkout with a separate email.
5. Confirm the referral appears in `/settings/referrals` and `/referrals/dashboard`.
