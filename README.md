# Olea Connects

Olea Connects is a branded document and community platform for nonprofit
organizations. This repository contains the full MVP demo, including the
marketing site, membership signup flow, brand onboarding, dashboard, template
library, PDF generation, grants, webinars, team management, and subscription
screens.

The product is operated by Olive Social Impact Inc. and is designed primarily
for Canadian nonprofits, societies, charities, and community organizations.

## MVP Status

This project is transitioning from a frontend-focused product demo to a
production application backed by Supabase.

- Email/password authentication, email verification, password recovery, and
  session cookies use hosted Supabase Auth.
- Signup uses Stripe-hosted Checkout with test-mode recurring CAD prices.
- Signed Stripe webhooks synchronize subscription status and line items into
  Supabase with duplicate-event protection.
- Organization, member, template, and session data come from local mock data.
- Registration progress and uploaded onboarding logos are persisted in browser
  `localStorage`.
- PDF generation runs in the browser with `@react-pdf/renderer`.
- Supabase environment variables are required for production-backed features.

Supabase Auth, client helpers, protected routes, session refresh, and Stripe
test-mode checkout are connected. Circle, Attio, and Klaviyo are represented in
the user experience but are not connected yet. Authentication and team
invitation emails use the Resend transactional-email integration.

## Tech Stack

- Next.js 14 with the App Router
- React 18
- TypeScript
- Tailwind CSS
- shadcn-style UI components built with Radix primitives
- Lucide icons
- `@react-pdf/renderer`
- Supabase JavaScript and SSR clients
- Stripe Node SDK and hosted Checkout
- Resend transactional email and signed delivery webhooks

## Getting Started

### Requirements

- Node.js 20 or newer
- npm

### Installation

```bash
npm install
```

Create `.env.local` from `.env.example` and add the Supabase and Stripe
credentials:

```bash
cp .env.example .env.local
```

### Transactional Email

Production email is sent from
`Olea Connects <notifications@olivesocialimpact.com>`. On June 15, 2026,
Resend reported `olivesocialimpact.com` as verified with passing SPF and DKIM
records. DNS also publishes a DMARC `p=reject` policy with aggregate reporting.

Required application and Supabase Edge Function secrets:

```bash
RESEND_API_KEY=...
RESEND_WEBHOOK_SECRET=...
EMAIL_FROM="Olea Connects <notifications@olivesocialimpact.com>"
EMAIL_REPLY_TO=hello@olivesocialimpact.com
EMAIL_ENVIRONMENT=production
NEXT_PUBLIC_APP_URL=https://olea-connect.vercel.app
CRON_SECRET=...
SEND_EMAIL_HOOK_SECRET=...
```

For local, preview, and staging environments, use a non-production
`EMAIL_ENVIRONMENT` and configure `EMAIL_TEST_RECIPIENT`. Every recipient is
redirected to that safe inbox. Automated tests never call Resend.

Authentication email setup:

1. Deploy `supabase/functions/send-email` with `--no-verify-jwt`.
2. Set its email variables and a generated `SEND_EMAIL_HOOK_SECRET`.
3. Enable the Supabase Auth Send Email hook with the same hook secret.
4. Enable password-change notifications in Supabase Auth.
5. Set the Supabase Site URL to the production app and allow
   `http://localhost:3001/**` plus the approved Vercel preview URL pattern.

Application lifecycle emails are queued in `integration_events`. Configure
Supabase Cron to send an HTTP `GET` request to `/api/email/process` every minute
with `Authorization: Bearer <CRON_SECRET>`; store the secret in Supabase Vault.
The worker claims one row transactionally and records the Resend message ID.
Using Supabase Cron avoids Vercel plan-specific scheduling limits. Configure a
signed Resend webhook for `/api/email/webhook`, subscribing to delivered,
delayed, bounced, and complained events. Webhook payloads are recorded in
`webhook_events`; delivery failures update the matching outbox row for
operational visibility.

### Development

Port `3000` is reserved for another local application, so run Olea Connects on
port `3001`:

```bash
npm run dev -- -p 3001
```

Open [http://localhost:3001](http://localhost:3001).

### Production Build

```bash
npm run build
npm run start -- -p 3001
```

## Available Scripts

```bash
npm run dev        # Start the Next.js development server
npm run build      # Create an optimized production build
npm run start      # Run the production server
npm run lint       # Run Next.js ESLint checks
npm run typecheck  # Run TypeScript without emitting files
npm run test:unit  # Run domain and shared utility tests
npm run test:e2e:smoke # Run the Chromium PR smoke suite
npm run test:e2e:pr # Run all PR-gating Chromium journeys
npm run test:e2e      # Run the cross-browser regression suite
npm run test:e2e:a11y # Run public accessibility checks
npm run test:e2e:data # Verify isolated Supabase create/purge lifecycle
npm run test:e2e:data:local # Start/use local Supabase and run isolation test
npm run test:db:local # Run pgTAP security and database contract tests
npm run test:e2e:authenticated:local # Run protected routes with API auth
```

Before considering a change complete, run:

```bash
npm run typecheck
npm run lint
npm run test:e2e:smoke
npm run build
```

## Automated Testing

Playwright coverage starts with the highest-risk public journeys:

- landing-page and pricing entry points
- membership plan handoff and account validation
- password handling in browser storage
- protected-route enforcement
- Stripe webhook signature boundary
- automated WCAG 2.1 A/AA checks on public pages

Chromium smoke tests run on pull requests and pushes to `main`. A scheduled
workflow runs the full Chromium, Firefox, WebKit, and mobile regression suite.
### CI/CD

Every pull request targeting `main` runs the `CI` workflow:

- `Quality and Build`: lint, TypeScript, and production build
- `Database and Isolation`: clean migration reset, database lint, and data cleanup
- `Browser Smoke`: public journeys and API-authenticated protected routes
- `PR Gate`: one stable final check that passes only when all jobs succeed

The workflow uses an isolated local Supabase instance and does not mutate
hosted development or production data. Superseded runs are cancelled when new
commits are pushed to the same pull request. A separate nightly workflow runs
the full Playwright cross-browser suite.

Configure the `main` branch to require the `PR Gate` status check and at least
one approving review before merging. GitHub only exposes branch protection for
private repositories on supported paid plans.

### Test Data Isolation

Mutating tests must create their own users and organizations and purge them by
exact ID in fixture teardown. The test-data manager refuses to run unless a
dedicated environment is explicitly enabled:

```bash
PLAYWRIGHT_TEST_DATA_ENABLED=true
PLAYWRIGHT_TEST_ENV=local
TEST_SUPABASE_URL=http://127.0.0.1:54321
TEST_SUPABASE_PUBLISHABLE_KEY=...
TEST_SUPABASE_SERVICE_ROLE_KEY=...
npm run test:e2e:data
```

For the standard local path, run `npm run test:e2e:data:local`; it discovers the
local Supabase credentials without printing them and starts Supabase when
needed. CI runs the same command in a dedicated job.

Authenticated tests create a confirmed user and active subscription through
Supabase, sign in through the Auth API, and inject the resulting SSR cookies
into the browser context. Do not repeat login through the UI as setup for
protected-page tests. UI authentication is reserved for tests whose subject is
the login, logout, verification, or password recovery experience itself.

Never point `TEST_SUPABASE_*` variables at production. Cleanup runs in reverse
dependency order, verifies deletion, and attempts every cleanup task even when
one fails.

## Main Routes

### Public and Authentication

| Route | Purpose |
| --- | --- |
| `/` | Marketing landing page and pricing |
| `/signup` | Membership and billing-cycle selection |
| `/signup/account` | Organization and account details |
| `/signup/payment` | Stripe-hosted membership checkout |
| `/verify-email` | Email verification flow |
| `/login` | Member login |
| `/reset-password` | Password reset flow |

### Onboarding

| Route | Purpose |
| --- | --- |
| `/onboarding/brand-setup` | Organization name, logo, and brand colours |
| `/onboarding/template-selection` | Seedling template selection |

### Member Platform

| Route | Purpose |
| --- | --- |
| `/dashboard` | Member overview |
| `/templates` | Template library |
| `/templates/[slug]` | Template detail or coming-soon state |
| `/templates/board-self-evaluation` | Interactive survey and PDF workflow |
| `/grants` | Olea Gives opportunities |
| `/webinars` | Live and recorded learning |
| `/community` | Circle community entry point |
| `/team` | Seats and invitations |
| `/subscription` | Plan and billing management |
| `/settings/brand` | Brand profile management |
| `/whats-new` | Product updates |
| `/help` | Help centre placeholder |

## Project Structure

```text
app/                    Next.js routes and route-specific components
components/
  auth/                 Public authentication UI
  landing/              Modular marketing-page sections
  ui/                   Shared shadcn-style primitives
hooks/                  Registration, session, and survey state
lib/
  auth.ts               Browser authentication and checkout requests
  data/                 Typed, RLS-scoped Supabase repositories
  stripe/               Stripe configuration, registration, and synchronization
  pdf-generator.tsx     Branded PDF document generation
  plans.ts              Shared membership plan definitions
  types.ts              Domain types
utils/
  supabase/
    admin.ts            Server-only service-role and public clients
    client.ts           Browser Supabase client
    server.ts           Cookie-backed server Supabase client
    middleware.ts       Session refresh helper
middleware.ts           Applies session refresh to application requests
supabase/
  config.toml           Local Supabase configuration
  migrations/           Ordered production database migrations
public/                 Static brand assets
```

## Database Migrations

The initial production schema contains 48 RLS-enabled tables grouped into seven
ordered migrations:

1. Identity, organizations, memberships, billing, seats, and invitations
2. Resource access, branded templates, generated documents, and surveys
3. Webinars, events, registrations, recordings, and Circle provisioning
4. Sponsors, contracts, Olea Gives contributions, grants, reviews, and awards
5. Notifications, integrations, audit logs, and Harvest consulting operations
6. Storage policies and reference data for plans, categories, and packages
7. Dynamic template field types, schema validation, snapshots, and export audit
   history

### Dynamic Templates

Template ownership and access remain relational, while each template's form
definition and each organization's answers use JSONB:

- `template_definitions.field_schema` describes sections, fields, repeatable
  groups, validation settings, and the PDF renderer.
- `template_instances.form_data` stores answers keyed by field ID.
- Every instance snapshots the exact schema version and organization branding
  used when it was created, so later template or brand edits do not rewrite
  historical documents.
- Supported inputs are managed in `template_field_types`. The initial registry
  includes text, textarea, rich text, number, currency, rating, date, time,
  datetime, checkbox, select, multi-select, repeatable groups, signature,
  email, URL, file, heading, and paragraph fields.
- `template_exports` records each generated PDF or DOCX, and
  `template_export_downloads` records every download separately.

SQL smoke coverage for structurally different template definitions lives in
`supabase/tests/template_engine.sql`.

Run the schema locally with Docker:

```bash
npx supabase start
npx supabase db reset --local --no-seed
npx supabase db lint --local --schema public,private
npx supabase db advisors --local --type all --level warn
```

Create future migrations with the CLI so filenames remain correctly ordered:

```bash
npx supabase migration new descriptive_change_name
```

## Architecture Notes

- `components/AppShell.tsx` applies the authenticated sidebar and header only to
  member routes.
- `hooks/use-registration.tsx` owns signup and onboarding state.
- `lib/plans.ts` is the single source of truth for membership pricing and plan
  features.
- Shared landing sections live in `components/landing` to keep
  `app/page.tsx` focused on composition.
- Logo upload behavior is shared between onboarding and Brand Settings through
  `components/LogoUpload.tsx` and `hooks/use-logo-upload.ts`.
- Typed Supabase repositories are grouped by domain under `lib/data` and use
  the authenticated server client so RLS remains the authorization boundary.
- Supabase clients are separated by runtime under `utils/supabase`; never import
  the browser client into Server Components.

## Stripe Checkout

Stripe Checkout uses eight recurring CAD prices: monthly and annual prices for
Seedling, Roots, Canopy, and Harvest. Price IDs are configured through the
`STRIPE_PRICE_*` environment variables rather than accepted from the browser.

The signup checkout request:

1. Creates the email/password user through Supabase Auth.
2. Prepares the organization, owner membership, brand profile, and incomplete
   subscription with the server-only service-role client.
3. Redirects the browser to Stripe-hosted Checkout.
4. Returns to `/verify-email?payment=success` after payment.

Configure a Stripe test webhook endpoint at:

```text
https://YOUR_DOMAIN/api/stripe/webhook
```

Subscribe it to Checkout Session, Customer Subscription, and Invoice events,
then store its signing secret as `STRIPE_WEBHOOK_SECRET`. The webhook verifies
the raw request signature, records each Stripe event once in `webhook_events`,
and synchronizes subscription status, period dates, customer identifiers, and
subscription items.

## Membership Plans

All prices are in CAD. Annual billing charges for 10 months and provides 12.

| Plan | Monthly | Annual | Included seats |
| --- | ---: | ---: | ---: |
| Seedling | $44 | $440 | 1 |
| Roots | $99 | $990 | 2 |
| Canopy | $199 | $1,990 | 3 |
| Harvest | $1,350 | $13,500 | 3 |

Every membership tier includes access to the Olea Connects community. Resource
depth, learning access, and hands-on support vary by plan.

## Remaining Production Work

1. Store uploaded logos in Supabase Storage instead of persisting browser data
   URLs in the brand profile.
2. Connect new subscriptions to Attio, Klaviyo, Circle, and other automations.
3. Configure production SMTP or Resend for branded authentication emails.

## Brand and Accessibility

The interface uses Olea green and orange brand accents and is designed around
WCAG 2.1 AA accessibility goals. New work should preserve keyboard navigation,
visible focus states, semantic markup, sufficient contrast, and responsive
layouts.

## License

Private project. All rights reserved by Olive Social Impact Inc.
