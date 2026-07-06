# Operations Runbook

This guide covers local setup, environment variables, Supabase, Stripe, Resend,
native community, Vercel, deployment, and common troubleshooting.

## Local Development

Use port `3001` locally:

```bash
npm run dev -- -p 3001
```

Production-like local run:

```bash
npm run build
npm run start -- -p 3001
```

Local Supabase helper:

```bash
bash scripts/with-local-supabase.sh npm run test:db
```

The helper starts Supabase if needed, exports local Supabase env vars, and runs
the provided command.

## Environment Variables

Use `.env.example` as the source of truth for local variable names. Do not copy
real secrets into documentation or commits.

### Supabase

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
```

`NEXT_PUBLIC_*` values are intentionally visible to the browser. The service
role key is server-only and must never be exposed in client code.

### Stripe

```text
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_BILLING_PORTAL_CONFIGURATION_ID
STRIPE_PRICE_SEEDLING_MONTHLY
STRIPE_PRICE_SEEDLING_ANNUAL
STRIPE_PRICE_ROOTS_MONTHLY
STRIPE_PRICE_ROOTS_ANNUAL
STRIPE_PRICE_CANOPY_MONTHLY
STRIPE_PRICE_CANOPY_ANNUAL
STRIPE_PRICE_HARVEST_MONTHLY
STRIPE_PRICE_HARVEST_ANNUAL
STRIPE_PRICE_SEAT_MONTHLY
STRIPE_PRICE_SEAT_YEARLY
```

Never accept price IDs from the browser. The app resolves all price IDs from
environment variables.

### Email and Cron

```text
RESEND_API_KEY
RESEND_WEBHOOK_SECRET
SEND_EMAIL_HOOK_SECRET
EMAIL_FROM
EMAIL_REPLY_TO
EMAIL_ENVIRONMENT
EMAIL_TEST_RECIPIENT
NEXT_PUBLIC_APP_URL
CRON_SECRET
```

Outside production, set `EMAIL_ENVIRONMENT` to a non-production value and set
`EMAIL_TEST_RECIPIENT`. This prevents accidental delivery to real users.

### Native Community and Deferred Circle

```text
CIRCLE_COMMUNITY_URL
CIRCLE_SSO_SECRET
CIRCLE_API_TOKEN
CIRCLE_API_BASE_URL
CIRCLE_MEMBER_TAG_SEEDLING_ID
CIRCLE_MEMBER_TAG_ROOTS_ID
CIRCLE_MEMBER_TAG_CANOPY_ID
CIRCLE_MEMBER_TAG_HARVEST_ID
CIRCLE_SPACE_GROUP_SEEDLING_IDS
CIRCLE_SPACE_GROUP_ROOTS_IDS
CIRCLE_SPACE_GROUP_CANOPY_IDS
CIRCLE_SPACE_GROUP_HARVEST_IDS
```

Native community is the MVP path and does not require Circle environment
variables. Default communities and spaces are seeded by migration. Community
events can store manual Zoom URLs in `community_events.zoom_url`.

Member-created posts and comments use `OPENROUTER_API_KEY` with the
`z-ai/glm-5.2` model for LLM moderation when the key is configured. If the key
is absent, the app still runs the local disrespectful language guard and local
resource-link safety checks. If the key is present but the moderation request
fails, posting/commenting is blocked and the member is asked to try again so
unchecked content is not published. Local E2E runs set
`COMMUNITY_MODERATION_DISABLE_AI=true` to keep tests deterministic; do not set
that flag in staging or production unless the team intentionally wants
local-only moderation.

Circle values can be left blank in environments where deferred Circle
provisioning is not being tested. Circle routes will fail if required values are
missing, and should not be configured as the member-facing community path unless
the product later decides to pay for the required Circle SSO tier.

### Attio and QuickBooks

```text
ATTIO_API_TOKEN
ATTIO_API_BASE_URL
QUICKBOOKS_ACCESS_TOKEN
QUICKBOOKS_REALM_ID
QUICKBOOKS_API_BASE_URL
```

Attio and QuickBooks are processed asynchronously through
`integration_events`. Missing provider credentials will fail only the background
worker for that provider; signup and billing webhooks should continue queuing
events.

Operators can replay a failed or dead-letter integration event with the service
role:

```sql
select public.replay_integration_event('<event-id>'::uuid);
```

### Automated Test Data

```text
PLAYWRIGHT_TEST_DATA_ENABLED
PLAYWRIGHT_TEST_ENV
TEST_SUPABASE_URL
TEST_SUPABASE_PUBLISHABLE_KEY
TEST_SUPABASE_SERVICE_ROLE_KEY
```

Never point these at production.

## Supabase Operations

### Link and Push Migrations

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

If Supabase reports local migration files before the last remote migration, use
the CLI suggestion carefully:

```bash
npx supabase db push --include-all
```

Only do this when you understand why the migration ordering is safe.

### Create a Migration

```bash
npx supabase migration new descriptive_change_name
```

Then edit the generated SQL file. Include RLS, indexes, constraints, and tests
where appropriate.

### Local Migration Validation

```bash
npx supabase start
npx supabase db reset --local --no-seed
npx supabase db lint --local --schema public,private
npx supabase test db supabase/tests --local
```

### Auth Email Hook

Deploy the custom Supabase Auth email hook:

```bash
npx supabase functions deploy send-email --no-verify-jwt --project-ref <project-ref>
```

Set secrets:

```bash
npx supabase secrets set \
  RESEND_API_KEY="..." \
  SEND_EMAIL_HOOK_SECRET="..." \
  EMAIL_FROM="Olea Connects <notifications@olivesocialimpact.com>" \
  EMAIL_REPLY_TO="hello@olivesocialimpact.com" \
  EMAIL_ENVIRONMENT="production" \
  --project-ref <project-ref>
```

In Supabase Dashboard:

1. Enable the Send Email auth hook.
2. Point it to the deployed `send-email` function.
3. Use the same `SEND_EMAIL_HOOK_SECRET`.
4. Configure Site URL and allowed redirect URLs.

### Supabase Cron Jobs

Cron jobs use `CRON_SECRET` and call app routes over HTTP.

Use `/api/v1/...` for all new external configuration. Legacy `/api/...` routes
remain available as compatibility aliases while provider dashboards and cron
jobs are migrated.

Recommended jobs:

- Email outbox processor:
  - Method: `GET`
  - URL: `https://<domain>/api/v1/email/process`
  - Header: `Authorization: Bearer <CRON_SECRET>`
  - Schedule: every minute or every five minutes, depending on volume.

- Circle provisioning processor:
  - URL: `https://<domain>/api/v1/circle/process`
  - Same auth header.
  - Deferred while native community is the MVP path.

- Attio member/contact processor:
  - URL: `https://<domain>/api/v1/attio/process`
  - Same auth header.

- QuickBooks customer/reference processor:
  - URL: `https://<domain>/api/v1/quickbooks/process`
  - Same auth header.
  - Deferred while native community is the MVP path.

- Provisioning reconciliation:
  - URL: `https://<domain>/api/v1/provisioning/reconcile`
  - Same auth header.

If Supabase says `pg_net` is required, install the extension from the Supabase
Dashboard before creating HTTP cron jobs.

## Stripe Operations

### Products and Prices

The app expects recurring CAD prices for:

- Seedling monthly and annual.
- Roots monthly and annual.
- Canopy monthly and annual.
- Harvest monthly and annual.
- Paid seat monthly and yearly.

Paid seats are limited in the app to 1-3 seats per add-seat action.

### Webhook Endpoint

Endpoint:

```text
https://<domain>/api/v1/stripe/webhook
```

Subscribe to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- Relevant invoice events used for subscription state/payment status.

Store the signing secret in `STRIPE_WEBHOOK_SECRET`.

### Billing Portal

Set `STRIPE_BILLING_PORTAL_CONFIGURATION_ID`. The app uses portal flows for
payment method updates, cancellation, and standard management. Plan upgrades and
seat add-ons can update the subscription directly because the subscription can
contain multiple items.

## Resend Operations

### Domain Authentication

For deliverability, verify:

- DKIM record is verified.
- SPF record includes Resend.
- DMARC exists for the domain.

Review delivered email headers when diagnosing spam/quarantine issues.

### Resend Webhook

Endpoint:

```text
https://<domain>/api/v1/email/webhook
```

Subscribe to:

- delivered
- delayed
- bounced
- complained

Set `RESEND_WEBHOOK_SECRET`.

## Vercel Operations

### Branch Strategy

- Keep demo deployments isolated from production-development work.
- Use preview/staging deployments to verify production-development changes.
- Confirm before promoting anything that would replace the CEO demo.

### Env Vars

Set env vars separately for Preview and Production as needed. Preview must have
the same required keys if staging is expected to exercise billing/email flows.

### CLI

Keep the Vercel CLI current:

```bash
npm i -g vercel@latest
```

Useful commands:

```bash
vercel env ls
vercel env pull .env.preview
vercel --target=preview
vercel inspect <deployment-url>
vercel logs <deployment-url>
```

## Deployment Checklist

Before deploying:

1. Confirm branch target: demo, staging, or main.
2. Confirm env vars exist in the target Vercel environment.
3. Run:

   ```bash
   npm run typecheck
   npm run lint
   npm run test:unit
   npm run test:e2e:smoke
   npm run build
   ```

4. Push branch and wait for CI.
5. Verify preview URL manually.
6. For DB changes, apply migrations before relying on deployed code.

## Troubleshooting

### User Paid But Sees Billing Required

Check:

1. Stripe subscription status.
2. `webhook_events` contains the Stripe event.
3. `subscriptions` row has provider subscription/customer IDs.
4. `subscription_items` contains active membership and seat items.
5. `organization_members` contains active membership for the user.
6. Run provisioning retry from `/subscription` if there is a registration
   record but workspace attachment is pending.

### Team Seats Look Wrong

Seat display is:

```text
included plan seats + paid seat add-ons
```

Reserved seats are:

```text
active members + pending invitations
```

Check `subscription_items`, `organization_members`, and
`organization_invitations`.

### Emails Not Arriving

Check:

1. Resend dashboard event.
2. `integration_events` status.
3. `webhook_events` status.
4. Provider quarantine/spam.
5. SPF/DKIM/DMARC.
6. In non-production, confirm `EMAIL_TEST_RECIPIENT`.

### E2E Fails With Auth Rate Limit

Hosted Supabase Auth can throttle sign-ins and password reset emails. Prefer
local Supabase for full suites, or run focused tests. See
[Testing](./TESTING.md).

### Playwright Port Conflict

The test server uses port `3011`. Check:

```bash
lsof -nP -iTCP:3011 -sTCP:LISTEN
```

Stop the stale process or set `PLAYWRIGHT_SKIP_WEBSERVER=true` only when a
compatible server is already running.
