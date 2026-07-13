# Architecture

Olea Connects is a Next.js App Router application backed by Supabase and Stripe.
Most authorization is enforced twice: globally in middleware for route access
and in Supabase/Postgres through RLS/RPC policies for data access.

## Runtime Overview

```text
Browser
  -> Next.js App Router pages and client components
  -> Server Components / Server Actions / Route Handlers
  -> Supabase Auth + Postgres + Storage
  -> Stripe API and webhooks
  -> Resend API and webhooks
  -> Attio / QuickBooks workers
  -> Native community tables
  -> Deferred Circle API / SSO scaffolding
```

## Next.js Layers

### App Routes

`app/` contains both pages and route handlers:

- Public marketing/auth routes: `/`, `/login`, `/signup`, `/reset-password`,
  `/verify-email`, `/update-password`, `/auth/*`.
- Member routes: `/dashboard`, `/templates`, `/team`, `/subscription`,
  `/settings/brand`, `/grants`, `/webinars`, `/community`, `/help`,
  `/whats-new`.
- API routes: Stripe, email, deferred Circle, and provisioning workers.

### App Shell

The authenticated platform layout is composed with:

- `components/AppShell.tsx`
- `components/Header.tsx`
- `components/Sidebar.tsx`
- `components/navigation.ts`

The shell is route-aware and keeps the member app chrome separate from public
auth/landing pages.

### Shared UI

The project uses shadcn-style components built on Radix primitives:

- `components/ui/button.tsx`
- `components/ui/input.tsx`
- `components/ui/select.tsx`
- `components/ui/tabs.tsx`
- `components/ui/textarea.tsx`
- `components/ui/badge.tsx`
- `components/ui/card.tsx`

Prefer these before introducing raw HTML controls for product UI. Raw semantic
HTML is still fine when a custom component adds no value.

## Authentication and Authorization

### Supabase Auth

Supabase Auth handles:

- Email/password signup.
- Email confirmation.
- Login/logout.
- Password recovery.
- SSR session cookies.

Client-side auth helpers live in `lib/auth.ts`. Server-side Supabase clients
live in `utils/supabase/`.

### Global Auth Middleware

`middleware.ts` calls `utils/supabase/middleware.ts`.

The middleware:

1. Creates a cookie-aware Supabase server client.
2. Refreshes session cookies when needed.
3. Allows public marketing/auth/signup and signed webhook paths.
4. Redirects anonymous users from member routes to `/login?next=<path>`.
5. Redirects authenticated users without a current subscription to
   `/subscription?billing=required`, except while already on subscription.

The public allowlist is intentionally centralized in
`utils/supabase/middleware.ts`.

### Member Context

`lib/data/member-context.ts` is the main authenticated data boundary for app
pages. `requireMemberContext()`:

- Reads the current Supabase Auth user.
- Loads the active organization membership.
- Loads organization, tier, and brand data.
- Redirects to `/login` if no member context exists.

Use `requireMemberContext()` in Server Components and server actions that need
organization-scoped data.

### Data Authorization

Data reads/writes should usually use the cookie-backed server client from
`utils/supabase/server.ts`, so Supabase RLS remains active.

Only use `createAdminClient()` from `utils/supabase/admin.ts` when the operation
must bypass RLS, such as:

- Stripe webhook synchronization.
- Test data setup/cleanup.
- Background workers.
- Cross-user provisioning tasks.

When using the admin client, manually enforce tenant boundaries in code.

## Database Model

The schema is migration-driven under `supabase/migrations/`.

Core domains:

- Identity: profiles, organizations, memberships.
- Billing: membership plans, subscriptions, subscription items, invoices.
- Access: resource categories, template definitions, resource access.
- Templates: dynamic schemas, instances, exports, downloads.
- Brand: logo path, colors, footer contact details.
- Team: invitations, active members, seat limits.
- Notifications: user-scoped lifecycle messages, read state, internal deep
  links, idempotency, and optional email outbox emission.
- Grants: programs, rounds, applications, reviews, awards.
- Webinars/events/community: webinars, registrations, native community spaces,
  posts, comments, reactions, managers, and Zoom-linked community events.
- Integrations: webhook events, integration events, audit logs.

Database tests live in `supabase/tests/` and should be updated when migrations
change behavior.

Notification behavior is documented in `docs/NOTIFICATIONS.md`.

## Dynamic Template Engine

The template engine separates the template definition from each organization's
answers.

Important files:

- `lib/template-renderer/schema.ts`
- `lib/template-renderer/types.ts`
- `lib/template-renderer/validation.ts`
- `components/templates/DynamicTemplateEditor.tsx`
- `components/templates/TemplateFields.tsx`
- `components/templates/TemplateExportPanel.tsx`
- `lib/template-renderer/pdf-export.ts`
- `lib/template-renderer/docx-export.ts`

Template detail pages should load one template directly. Avoid calling the full
template library path from `getDynamicTemplateEditorData()` because it repeats
member-context work and slows dashboard-to-template navigation. Use the
single-resource access check in `lib/data/templates.ts` for template editor
loads, and keep `app/templates/[slug]/loading.tsx` available for immediate
navigation feedback.

Database concepts:

- `template_definitions.field_schema` stores the schema.
- `template_instances.form_data` stores answers.
- Instances snapshot the schema version and brand state.
- `template_exports` records generated files.
- `template_export_downloads` records download events.

### Board Calendar Portal

The Board Calendar is a board portal that currently uses the dynamic template
session engine for storage and exports. The CEO prototype HTML is the source of
truth for the portal behavior, while Olea Connects owns the final UI theme,
auth, persistence, branding, and platform chrome.

The portal has additional client-side logic:

- `components/templates/BoardCalendarWorkbench.tsx`
- `lib/template-renderer/board-calendar-editor.ts`
- `lib/template-renderer/calendar-view.ts`
- `lib/template-renderer/calendar-time.ts`

It maps board calendar source data into calendar events and derived annual,
monthly, operational, task, and AGM views.

The Board Calendar data model has three source areas:

- Setup fields in `form_data`, including organization name, fiscal year,
  administrator, administrator email, executive director, board chair,
  `committees`, and `operational_task_rules`.
- Meeting/calendar source rows in `meetings`, `annual_highlights`, `tasks`, and
  `agm_milestones`.
- Derived views generated in the client from the source rows.

New Board Calendar portal instances intentionally start with empty default
values. The migration
`supabase/migrations/20260708160000_empty_board_calendar_portal_defaults.sql`
clears seeded committees, task rules, AGM milestones, event categories, fiscal
year values, and sample calendar rows from the template definition. Runtime
helpers should not reintroduce implicit fallbacks like "Administrator", "Board
Meeting", "TBC", or "Not Started" when creating new records; those should remain
dropdown choices only.

`components/templates/BoardCalendarWorkflowPanels.tsx` owns the specialized
Setup, Staff Task List, and AGM Timeline panels. `BoardCalendarWorkbench` keeps
the calendar entry composer as the primary way to add calendar records, while
the workflow panels manage setup metadata and generated task editing.

Operational staff tasks are generated from `meetings` plus
`operational_task_rules`. Generated rows use stable keys based on meeting date,
meeting type, meeting title/committee, and task rule details so user-edited
fields such as responsible, status, notes, and done remain attached when due
dates recalculate.

AGM milestones use `days_before` rather than the legacy `weeks_before`. The
migration keeps backward compatibility by converting existing `weeks_before`
values to `days_before`, and runtime helpers still read legacy data as a
fallback.

Category colors are still stored in the portal data under
`event_categories`, but the product UI manages them inline from the calendar
entry form. Avoid reintroducing a separate user-facing "Colour key" workflow
unless there is a clear bulk-edit use case.

Do not add a Board Calendar Integrations tab. Integration credentials and replay
operations belong in platform-level settings. The Board Calendar portal should
only surface integration outcomes when they directly affect board work.

Calendar entry creates/updates use `updateData()` from
`hooks/use-dynamic-template-session.ts` so mutations are applied against the
latest parent `formData` in one functional state update. This matters for rapid
CRUD: a user can add multiple entries with the same date and time without a
stale render dropping the second row.

New unsaved workbooks receive their database id after the first save. The editor
updates the browser URL with `history.replaceState` instead of forcing a route
refresh, and the session hook ignores refreshed server props for the same
workbook while local edits are unsaved or saving. This prevents autosave or RSC
refreshes from overwriting newer calendar edits.

## Billing Architecture

### Signup Checkout

`app/api/v1/stripe/checkout/route.ts` is intentionally public because it creates
new users during signup. It:

1. Validates plan/account payload.
2. Creates or validates a Supabase Auth user.
3. Prepares organization/workspace records.
4. Creates a Stripe Checkout Session.
5. Attaches the checkout session ID to the registration request.

The browser never sends Stripe price IDs. Price IDs come from environment
variables via `lib/stripe/server.ts`.

### Stripe Webhook

`app/api/v1/stripe/webhook/route.ts` verifies the raw Stripe signature. It records
each event once, handles replay safety, and syncs subscription state into
Supabase.

### Subscription Management

`app/api/v1/stripe/portal/route.ts` handles:

- Billing portal sessions.
- Payment method update flow.
- Cancellation flow.
- Pause/resume subscription.
- Plan upgrades.
- Paid seat add-ons.

It uses `getBillingSummary()` for authentication and role checks.

### Seat Counting

`lib/team/seats.ts` defines remaining invite capacity. Reserved seats are active
members plus pending invitations. Plan-included seats plus paid seat add-ons form
the seat limit.

## Email Architecture

There are two email systems:

1. Supabase Auth transactional emails through `supabase/functions/send-email`.
2. Application lifecycle emails through `integration_events` and
   `/api/v1/email/process`.

### Auth Email Hook

Supabase invokes the `send-email` Edge Function for auth emails. The function
uses Resend and validates `SEND_EMAIL_HOOK_SECRET`.

### Application Email Worker

Team invitation and lifecycle emails are queued in `integration_events`.
Supabase Cron calls `/api/v1/email/process` with `Authorization: Bearer
<CRON_SECRET>`. The route claims one event transactionally and sends through
Resend.

### Board Calendar Reminder Worker

Board Calendar meetings, tasks, annual notes, and AGM milestones live inside
`template_instances.form_data`. A protected scheduled worker at
`/api/v1/notifications/board-calendar-reminders` scans Board Calendar instances
and creates idempotent in-app notifications for active organization members when
calendar items are due today or tomorrow. Realtime notification subscriptions in
the app shell surface those reminders without requiring a page refresh.

### Resend Webhook

`app/api/v1/email/webhook/route.ts` validates `RESEND_WEBHOOK_SECRET` and records
delivery events for observability.

## Native Community

Native community is the default MVP path because paid Circle SSO would add cost
and an external dependency to a core member experience. The foundation lives in:

- `app/community/page.tsx`
- `app/community/actions.ts`
- `app/community/community-post-composer.tsx`
- `app/api/v1/community/moderation/process/route.ts`
- `lib/community/moderation.ts`
- `lib/community/moderation-worker.ts`
- `lib/data/community.ts`
- `public.communities`
- `public.community_spaces`
- `public.community_space_access_rules`
- `public.community_managers`
- `public.community_posts`
- `public.community_comments`
- `public.community_reactions`
- `public.community_events`

The initial community and starter spaces are seeded by migration. Community
creation and manager assignment are script/migration-driven for MVP; a future
`/admin` portal can manage these tables directly. Members can select a space,
create posts in spaces they can access, like posts, and add comments. Post,
comment, and reaction writes go through Supabase RLS so access remains scoped to
the member's eligible spaces. Posts and comments are inserted immediately, then
queued in `integration_events` with provider `community_moderation`. The
versioned cron endpoint claims queued events, runs local language and
resource-link checks, and then uses OpenRouter chat completions with
`z-ai/glm-5.2` when `OPENROUTER_API_KEY` is configured. Rejected posts are
marked `hidden`, rejected comments receive `hidden_at`, and failed moderation
events retry through the existing outbox/dead-letter flow.

Live calls use manually attached Zoom URLs for now. Circle SSO/provisioning code
remains deferred scaffolding under `lib/circle/*` and `app/api/v1/circle*` in
case the product later justifies the higher Circle plan.

## Attio and QuickBooks Outbox Workers

Attio and QuickBooks use the same `integration_events` outbox pattern as email
and Circle/native community:

- Stripe subscription webhooks queue provider work after local subscription
  state is synced.
- `/api/v1/attio/process` claims one Attio event with
  `claim_attio_integration_event`.
- `/api/v1/quickbooks/process` claims one QuickBooks event with
  `claim_quickbooks_integration_event`.
- Workers store external IDs and last sync metadata in
  `organization_integrations`.

Failures are isolated from member signup and billing. Temporary failures become
`failed` with a future `available_at`; repeated failures become `dead_letter`
for operator review. Platform administrators can inspect recent Resend, Attio,
and QuickBooks outbox events at `/settings/integrations` and replay failed or
dead-letter events through the protected `replay_integration_event` RPC.

Klaviyo is intentionally out of scope for the MVP; lifecycle email is handled
through Resend and the email outbox. Zoom is manual-link only until API
automation is justified.

## Grants and Webinars

Grants:

- `app/grants/page.tsx`
- `app/grants/actions.ts`
- `lib/data/grants.ts`
- `lib/grants/domain.ts`

Webinars:

- `app/webinars/page.tsx`
- `app/webinars/[slug]/page.tsx`
- `app/webinars/manage/page.tsx`
- `app/webinars/new/page.tsx`
- `app/webinars/actions.ts`
- `lib/data/webinars.ts`

Both rely on member context and plan-aware access rules. Webinar creation and
archiving are limited to platform event admins (`super_admin` or
`community_admin`) and use server actions with the Supabase service role after
the role check. Archiving sets `events.status = 'archived'` for past webinars;
archived webinars are hidden from the catalog and detail pages rather than
deleted. Regular members can see webinar details and valid actions, but cannot
access the create route, manage route, or protected mutation paths
successfully.

## Testing Architecture

See [Testing](./TESTING.md) for commands and policies. At a high level:

- Vitest covers domain logic and route helpers.
- pgTAP covers database/RLS/security contracts.
- Playwright covers public flows, protected flows, dynamic templates,
  accessibility, and test-data isolation.
- CI runs lint, typecheck, unit tests, build, DB reset/lint/tests, and browser
  smoke tests.

## Design Principles for New Code

- Prefer Server Components for data loading.
- Use client components only for browser APIs, local state, or event handlers.
- Keep Supabase data access in `lib/data/*` where possible.
- Use server actions for authenticated mutations tied to pages.
- Use route handlers for external integrations and webhooks.
- Do not trust client input; validate again server-side.
- Keep Stripe operations idempotent.
- Add migration plus database tests for schema/RLS changes.
- Keep tests isolated and cleanup exact records by ID.
