# Referral Program

The Olea referral program lets approved partners share a unique referral link and track qualified introductions from signup through manual payout review.

## Member-Facing Flow

1. A prospective referrer visits `/referrals` and submits the application form.
2. The form validates name, email, relationship context, payout contact details, and terms acceptance before writing to `public.referrers`.
3. Olea receives an internal email notification and the applicant receives a confirmation email through the existing email outbox.
4. A platform `super_admin` reviews the application at `/settings/referrals`.
5. Approved referrers receive a non-guessable `OLEA-...` link, for example `/ref/OLEA-ABC123XYZ`.
6. The referral redirect stores the code in `olea_referral_code` and sends the visitor to signup with `?ref=...`.
7. Checkout persists the normalized referral code on the provisioning request. Workspace provisioning records the partner referral after payment and prevents duplicate credit or self-referrals.
8. The referrer dashboard at `/referrals/dashboard` shows their active link, referred customers, milestone status, and payout records.

## Admin Operations

`/settings/referrals` is visible only to `super_admin` users. Admins can:

- Update payout amounts, retention window, contact email, and terms URL.
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

The default settings match the first public program:

- `$100 CAD` when a referred customer attends a qualified demo.
- `$400 CAD` when the referred customer remains active after the retention window.

Payouts are not automatically paid. The app creates auditable payout records and Olea marks them as paid after external finance processing.

## Verification

Relevant tests:

- `tests/unit/referral-program.test.ts`
- `tests/unit/signup-flow.test.ts`
- `tests/unit/stripe-registration.test.ts`

For a release, also run an authenticated staging smoke test:

1. Submit a referral application.
2. Approve the referrer as a `super_admin`.
3. Open the generated `/ref/OLEA-...` link.
4. Complete signup and checkout with a separate email.
5. Confirm the referral appears in `/settings/referrals` and `/referrals/dashboard`.
