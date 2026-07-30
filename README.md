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

## Implemented Product Areas

### Authentication, onboarding, and billing

- Supabase email/password authentication with email confirmation, password
  recovery, session refresh, protected routes, and global auth boundaries.
- Guided account registration with plan selection, organization setup, brand
  profile configuration, and Seedling template selection.
- Stripe Checkout and billing portal support for subscriptions, plan upgrades,
  billing recovery, payment status synchronization, and paid seats.
- Paid seats are currently **$15 CAD one-time per seat**. Seat entitlements are
  recorded idempotently and team capacity reflects the organization's paid
  seats plus the primary member.
- Team invitations include expiry handling, existing-account validation, and
  transactional email delivery through Resend.

### Branded templates and document exports

- Tier-aware template library with availability messaging for templates that
  are not yet released.
- Brand profile assets and colors are applied to generated documents.
- Board Self-Evaluation supports structured survey responses and board-ready
  PDF exports.
- Export services support branded HTML, PDF, DOCX, and meeting-package output,
  including report covers, branded headers and footers, page numbers, and
  confidentiality acknowledgement where required.
- Generated export files are tracked for cleanup instead of being retained
  indefinitely in storage.

### Board Calendar & Operational Workflow

The Board Calendar is implemented as a board-portal module rather than a
single long form. Its tabs support:

- Calendar entries for meetings, events, operational tasks, notes, dates,
  times, locations, links, contacts, confirmation status, and related
  meetings.
- Current-date calendar navigation, month/annual views, disabled past dates
  for new entries, same-date/time entries, edit/delete flows, confirmation
  dialogs, and time-aware sorting.
- Meeting-only views, where the Meetings tab contains entries created as
  Meeting or Event.
- Operational task rules that generate preparation tasks from meeting dates;
  generated workflow records remain linked to their source meeting.
- Data-table views with filters and modal CRUD forms for Workflows, Directory,
  AGM Planning, and Board Packages.
- Board package uploads, confidentiality acknowledgement, branded package
  HTML/PDF generation, and export cleanup support.

### KPI Dashboard & Board Reporting

- Setup and Branding for organization name, dashboard title, reporting year,
  and financial year-end.
- Custom reporting-quarter definitions instead of fixed calendar quarters.
- Q1-Q4 tracker tabs with modal CRUD forms for KPI results, numeric validation,
  notes, RAG status, trend, variance, and progress-to-target calculations.
- Board Dashboard data table with quarterly results, full-year RAG review,
  scorecards, milestones, and risk summaries.
- Milestones & Risks data tables with modal CRUD workflows and validation.
- Annual Summary narrative sections and branded PDF reporting.

### Confidential ED/CEO Review

- Anonymous staff and partner feedback campaigns with tokenized public survey
  links that are not tied to platform-user identities.
- Explicit per-cycle Board Chair and HR reviewer access, reviewer-access audit
  events, protected Board Chair summary compilation, and an AI-assisted draft
  summary that must be reviewed before approval.
- See [ED/CEO Review](./docs/ED_REVIEW.md) for the access model, operational
  workflow, and verification coverage.

### Community, webinars, consulting, and sponsorship

- Native community spaces with posts, comments, likes, edit/delete actions,
  author and organization identity, mentions, optimistic UI updates, and
  realtime synchronization between members.
- AI-assisted community moderation and link-safety checks before content is
  published, using the configured OpenRouter moderation worker.
- Tier-aware webinar catalog with Zoom meeting links, recording links,
  member detail pages, admin-only creation, and admin archive controls.
- Harvest Consulting request intake with categories, urgency, descriptions,
  safe attachment validation, request history, staff triage, assignments, and
  auditable time tracking.
- Public sponsorship page with five sponsor tiers, benefits, Catalyst Impact
  Circle content, responsive layout, and Calendly calls to action.
- Grants, notifications, global search/command palette, brand settings, team
  management, and subscription management are available from the member app
  shell.

### Integrations and operations

- Resend transactional email delivery, signed webhook ingestion, email
  observability, retryable outbox processing, and scheduled cleanup jobs.
- Attio and QuickBooks integration boundaries are represented by versioned
  outbox/sync services so provider-specific work can be expanded safely.
- Circle SSO/provisioning remains scaffolded and is intentionally deferred
  while the native community experience is used.

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
