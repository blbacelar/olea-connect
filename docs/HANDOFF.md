# Project Handoff

This document is the first stop for a developer taking over Olea Connects. It
explains what the product does, how the code is organized, what is production
critical, and how to work safely without disturbing the demo branch.

## Product Summary

Olea Connects helps nonprofit organizations create branded governance documents
without starting from blank templates. A member signs up for a paid plan, sets
organization branding, gains tier-based access to templates, edits forms in the
browser, and exports board-ready PDF/DOCX files using their logo, colors, and
footer details.

The platform also includes:

- Plan-based membership signup and billing.
- Seedling "choose your 3 templates" onboarding.
- Brand setup and reusable organization identity.
- Dynamic template sessions with saved workbooks.
- Board Calendar & Operational Workflow editor.
- Grants, webinars, and native community entry points.
- Team seats and invitations.
- Transactional email, webhooks, and background workers.
- Native community foundation with deferred Circle SSO/provisioning scaffolding.

## Business Context

The app is built for Canadian nonprofit, society, charity, and community
organizations. Canada is bilingual, so future work includes language management
and French translations. Do not hard-code English-only copy in new domain areas
if the copy is likely to become user-facing product text.

## Main User Journeys

### Public to Paid Member

1. Visitor lands on `/`.
2. Visitor reviews plans and selects a tier.
3. Signup carries the selected plan through `/signup/account` and
   `/signup/payment`.
4. Stripe Checkout creates the paid subscription.
5. Supabase Auth sends email verification through the custom Resend hook.
6. After verification, the user logs in and reaches the member platform.

### First Login and Onboarding

1. New user lands in the authenticated app.
2. Brand profile prompt remains visible until brand setup is complete.
3. User sets organization name, logo, primary color, secondary color, and footer
   contact details.
4. Seedling users choose exactly three templates.
5. Roots, Canopy, and Harvest skip template selection and access the full
   eligible library.

### Template Editing and Export

1. User opens a template from `/templates`.
2. The app creates or loads a template instance.
3. Answers are saved against the instance.
4. The template renderer validates required fields.
5. User generates PDF or DOCX exports.
6. Export records and download records are stored for auditability.

### Board Calendar & Operational Workflow

This is the most complex template currently in the app. It behaves like a
calendar-backed workbook:

- Users can create more than one workbook/session.
- The Setup view stores workbook-level details: organization name, fiscal year,
  administrator name/email, executive director, board chair, committees, and
  operational task rules.
- Committees are added one at a time, up to 8. The UI should not prefill all 8
  committee slots.
- Operational task rules are configured in Setup with a task label, days
  before/after the related meeting, applies-to meeting type, and default
  responsible role/person.
- Entries are added, edited, and deleted through the calendar UI.
- Past dates are displayed as disabled for new entries.
- Clicking an existing event opens edit mode.
- Deleting an entry requires a custom confirmation dialog.
- Event/category colors are managed inline while adding or editing an entry.
  The separate `colour_key` template data still exists as the backing store,
  but users should not have to manage it as a separate workbook tab.
- Monthly, annual, operational workflow, staff task list, and AGM planning views
  are generated from the same normalized event/setup data.
- Staff task rows are generated from meeting dates plus Setup task rules.
  User-editable staff fields, such as responsible, status, notes, and done, are
  preserved by stable generated task keys when due dates recalculate.
- AGM planning uses a confirmed AGM date plus milestone rows with days before
  AGM. Target dates are calculated as `agm_date - days_before`.
- Rapid CRUD is protected by the dynamic-template session hook. It applies
  calendar mutations against the latest parent form data and avoids replacing
  local unsaved changes with refreshed server props for the same workbook.
- E2E coverage for this workflow lives in
  `tests/e2e/board-calendar-workflow.spec.ts` and covers validation, create,
  Setup, committees, generated task rules, staff task updates, AGM target date
  calculation, duplicate same-date/same-time events, edit, delete confirmation,
  ordering, mobile rendering, and reload persistence.

### Team Seats

1. Organization owner/admin buys paid seats from subscription management.
2. Stripe subscription item is updated.
3. Local subscription items are synced from Stripe.
4. Team page calculates seats reserved as active members plus pending invites.
5. Invites are created through Supabase RPC and queued as email events.
6. Invited user accepts the tokenized invitation.

### Billing Management

The app supports:

- Stripe Checkout for initial membership.
- Billing portal for payment method/cancellation flows.
- Direct Stripe subscription updates for pause/resume, plan upgrades, and paid
  seat add-ons.
- Local sync from Stripe webhooks and immediate sync after some billing actions.

## Important Branches

- `main`: active production-development branch.
- `staging`: internal testing branch/environment.
- `demo`: preserved demo version for CEO/customer demos.

The demo branch is intentionally separate. Do not merge production-development
work into `demo` unless the task explicitly says to update the demo.

## Setup for a New Developer

1. Clone the repository.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy env vars:

   ```bash
   cp .env.example .env.local
   ```

4. Fill local development values. Do not use production service-role keys for
   tests.
5. Start local Supabase when working on database-sensitive changes:

   ```bash
   npx supabase start
   ```

6. Start the app on port `3001`:

   ```bash
   npm run dev -- -p 3001
   ```

## How to Make Changes Safely

1. Create a feature branch.
2. Read the route/domain files before editing.
3. Keep changes scoped to the ticket.
4. Add or update tests for the changed behavior.
5. Run static checks and relevant test suites.
6. Do not revert unrelated user changes in the worktree.
7. Use migrations for database changes. Never patch remote schema manually
   without committing an equivalent migration.

## Required Review Discipline

Project agent rules require:

- After TypeScript, React, Next.js, or JavaScript changes, run the
  `typescript-react-code-reviewer` skill.
- After completing a feature/ticket, run the `bmad-code-review` skill.
- Apply meaningful findings before calling the work complete.

For human developers, mirror the same idea:

- Review for auth/tenant boundaries.
- Review for RLS assumptions.
- Review for Stripe idempotency and webhook replay safety.
- Review for test-data cleanup.
- Review mobile and accessibility behavior for UI changes.

## High-Risk Areas

- Supabase RLS policies and service-role usage.
- Stripe subscription synchronization.
- Team seat counting and invitation lifecycle.
- Dynamic template schema validation and export generation.
- Board Calendar workbook/session behavior.
- Auth middleware public-route allowlist.
- Email hook and cron worker secrets.
- Any change touching `.env`, Vercel env vars, or Supabase secrets.

## Current Known Constraints

- Hosted Supabase Auth rate limits can affect full E2E runs.
- Production deployment strategy is unusual because the demo branch may be the
  production Vercel branch while `main` continues production development.
- Attio and QuickBooks have code-level outbox workers. Circle SSO/provisioning
  code exists as deferred scaffolding, but native community is the MVP path to
  avoid Circle SSO cost. Operational credentials, Supabase Cron jobs, and
  sandbox behavior must be verified per environment. Klaviyo is intentionally out
  of scope for the MVP; Resend handles lifecycle email through the outbox.
  Zoom is manual-link only until API automation is justified.
- Language localization has a GitHub ticket but is not implemented yet.

## Where to Look First

- Signup/auth: `lib/auth.ts`, `app/signup/*`, `app/login/page.tsx`,
  `utils/supabase/middleware.ts`.
- Member session: `lib/data/member-context.ts`.
- Billing: `app/api/v1/stripe/*`, `lib/stripe/*`, `lib/billing/server.ts`.
- Team: `app/team/*`, `lib/data/team.ts`, `lib/team/seats.ts`.
- Community: `app/community/page.tsx`, `lib/data/community.ts`,
  `supabase/migrations/*native_community_foundation.sql`.
- Webinars: `app/webinars/page.tsx`, `app/webinars/[slug]/page.tsx`,
  `app/webinars/manage/page.tsx`, `app/webinars/new/page.tsx`, `app/webinars/actions.ts`,
  `lib/data/webinars.ts`. Platform event admins can create webinars and archive
  old webinars; archive is a status change, and archived webinars are excluded
  from member-facing catalog/detail queries.
- Templates: `lib/data/templates.ts`, `components/templates/*`,
  `lib/template-renderer/*`.
- Board Calendar: `components/templates/BoardCalendarWorkbench.tsx`,
  `lib/template-renderer/board-calendar-editor.ts`,
  `lib/template-renderer/calendar-view.ts`.
- Email: `lib/email/*`, `app/api/v1/email/*`, `supabase/functions/send-email/*`.
- Supabase schema: `supabase/migrations/*`, `supabase/tests/*`.
