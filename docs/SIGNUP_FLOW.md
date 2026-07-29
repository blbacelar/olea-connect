# Signup Flow

The approved signup flow is a three-step path:

1. **Plan selection** preserves the selected tier and quarterly or annual cadence.
2. **Account details** collects the organization profile, contact details, optional referral, and referral source.
3. **Review and checkout** displays the order summary, records four versioned legal consents, and starts hosted Stripe Checkout.

## Referral attribution

Referral links use `https://oleaconnects.com/signup?ref=OLEA-ABC123`. The first valid-looking code is captured in first-party local storage and a 30-day, `SameSite=Lax` cookie. A later referral does not replace it. The server validates that the code belongs to an active organization and rejects self-referrals before creating checkout.

Referral rewards are finalized only after the paid signup is provisioned. Database uniqueness and idempotency keys prevent a retry from creating duplicate rewards.

## Founding members

The first 50 paid organizations can receive the server-authoritative Year 1 discount. Configure `STRIPE_FOUNDING_COUPON_ID` with a Stripe recurring coupon configured for 15% off for the first year. The database reserves a claim under a transaction lock before checkout and marks it paid only after provisioning completes. The application never trusts a client-supplied founding-member flag or price.

If the coupon variable is absent, checkout continues at the regular price and no founding discount is applied. A Stripe coupon must be configured with the intended duration and maximum redemptions in the Stripe environment used by the deployment.

## Legal consent

Checkout requires acceptance of these versioned documents before the payment button is enabled:

- Terms of Service
- Privacy Policy
- Data Ownership Agreement
- Confidentiality Policy

Each consent is stored server-side against the provisioning request with its document path, policy version, signup context, user ID, and timestamp. The API rejects missing, false, or unexpected consent fields.

## Validation and security

The checkout route validates the complete payload on the server and rejects unexpected top-level or nested fields. It normalizes email, names, phone, and referral codes, enforces enum values and numeric/password length constraints, and avoids logging secrets or passwords. Workspace and referral records are created only by the verified payment/provisioning path.

## Verification

Run the focused checks with:

```bash
npm run typecheck
npm run lint
npm run test:unit -- tests/unit/signup-flow.test.ts
npm run test:e2e -- tests/e2e/signup-flow.spec.ts --project=chromium
```

The E2E flow does not submit a real payment or send an email. It verifies referral persistence, required account fields, legal-consent gating, legal-document links, and the checkout readiness state.
