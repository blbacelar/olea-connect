# Olea Connects

Olea Connects is a branded governance document platform for Canadian nonprofit
organizations. Members subscribe to a plan, set their organization brand once,
use tier-aware templates, generate board-ready PDFs/DOCX files, manage team
seats, and access grants, webinars, and community features.

This repository is the production application, not just the original demo. It
uses Next.js App Router, Supabase Auth/Postgres/Storage/Edge Functions, Stripe
billing, Resend email, native community tables with deferred Circle
SSO/provisioning scaffolding, Attio/QuickBooks outbox workers, and
Playwright/Vitest/pgTAP tests.

## Start Here

For a developer handoff, read these in order:

1. [Project Handoff](./docs/HANDOFF.md) - product map, key flows, setup, and
   ownership rules.
2. [Architecture](./docs/ARCHITECTURE.md) - app structure, data model,
   authentication, billing, templates, and integrations.
3. [Operations](./docs/OPERATIONS.md) - environment variables, Supabase, Stripe,
   Resend, Vercel, cron jobs, deployment, and troubleshooting.
4. [Testing](./docs/TESTING.md) - unit, database, E2E, CI, test data isolation,
   and known Supabase Auth rate-limit constraints.
5. [Harvest Consulting](./docs/CONSULTING.md) - consulting requests, staff
   triage, time tracking, entitlements, and database test coverage.

## Requirements

- Node.js 22 recommended for parity with CI
- npm
- Docker, for local Supabase
- Supabase CLI
- Vercel CLI for deployments
- Stripe CLI for webhook/product setup when needed

Install dependencies:

```bash
npm install
```

Copy environment variables:

```bash
cp .env.example .env.local
```

Port `3000` is used by another local app, so run Olea Connects on `3001`:

```bash
npm run dev -- -p 3001
```

Open [http://localhost:3001](http://localhost:3001).

## Production-Like Local Run

Playwright now boots the app through the production server path. You can do the
same manually:

```bash
npm run build
npm run start -- -p 3001
```

## Common Commands

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:e2e:smoke
npm run test:e2e:critical
npm run test:e2e:security:local
npm run test:e2e:a11y
npm run test:db:local
npm run build
```

Before handing off a change, run at minimum:

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run test:e2e:smoke
npm run build
```

For database or auth-sensitive changes, also run:

```bash
npm run test:db:local
npm run test:e2e:data:local
npm run test:e2e:security:local
```

## Repository Map

```text
app/                    Next.js App Router pages, route handlers, server actions
components/             Shared UI, app shell, landing sections, template UI
hooks/                  Client-side state hooks
lib/                    Domain logic, data repositories, billing, integrations
utils/supabase/         Supabase clients for browser, server, admin, middleware
supabase/migrations/    Ordered SQL migrations
supabase/tests/         pgTAP database/security contract tests
supabase/functions/     Supabase Edge Functions, including auth email hook
tests/                  Vitest, Playwright, fixtures, factories, page objects
scripts/                Local Supabase helper scripts
.github/workflows/      CI and nightly regression workflows
docs/                   Handoff, architecture, operations, and testing guides
```

## Branches and Environments

- `main` is the active development branch.
- `demo` preserves the CEO demo experience and should not receive production
  work unless explicitly requested.
- `staging`/preview deployments are used for internal verification before
  production.
- Vercel production currently serves the demo branch by design. Do not promote
  production-development changes over the demo without confirming the release
  plan.

## Current Caveats

- Supabase Auth has hosted rate limits. Full cross-browser E2E runs can hit
  email or password sign-in limits against hosted Supabase. See
  [Testing](./docs/TESTING.md).
- Playwright intentionally uses `next build && next start` instead of
  `next dev` to avoid dev/HMR-only runtime noise.
- Vercel CLI should be kept current. If deploy commands behave oddly, upgrade:

```bash
npm i -g vercel@latest
```

## License

Private project. All rights reserved by Olive Social Impact Inc.
