---
story_key: issue-18-build-integration-outbox-workers-attio-quickbooks
github_issue: https://github.com/blbacelar/olea-connect/issues/18
github_project: https://github.com/users/blbacelar/projects/3
baseline_commit:
status: in-progress
priority: high
area: integrations
---

# Issue 18: Build Integration Outbox Workers For Attio And QuickBooks

## Story

As an Olea operator, I need external integration work to run through reliable outbox workers so member-facing checkout and subscription flows are not blocked by third-party provider availability.

## Scope Adjustment

GitHub issue #18 originally lists Attio, Klaviyo, QuickBooks, and Zoom. Per product direction for this implementation pass:

- Attio: implement now.
- QuickBooks: implement now.
- Klaviyo: on hold.
- Zoom: on hold.

## Acceptance Criteria

- [x] AC1: Duplicate processing is idempotent.
- [x] AC2: Temporary failures retry without blocking the member flow.
- [x] AC3: Permanent failures reach a visible dead-letter state.
- [x] AC4: Attio and QuickBooks have contract tests or sandbox-ready verification points.
- [x] AC5: Operators can inspect and safely replay failed events.

## Tasks/Subtasks

- [x] Add provider-specific integration event claim functions for Attio and QuickBooks.
- [x] Add service-role-only replay function for failed/dead-letter integration events.
- [x] Queue Attio and QuickBooks sync events after subscription state is recorded from billing webhooks.
- [x] Implement Attio member/contact upsert worker.
- [x] Implement QuickBooks customer/reference upsert worker.
- [x] Persist provider identifiers and last sync state in `organization_integrations`.
- [x] Add focused unit/contract tests for enqueue and worker behavior.
- [x] Document required environment variables, cron routes, deferred providers, and replay procedure.

## Dev Notes

- Existing outbox pattern lives in `integration_events`.
- Existing Circle processor is the closest local implementation model.
- Do not make checkout or user login depend on Attio or QuickBooks availability.
- Keep provider secrets server-only.
- GitHub Project 3 is the source of truth for story status; this file mirrors the issue for BMAD execution only.

## Dev Agent Record

### Debug Log

- Installed BMAD for Codex with `npx bmad-method install --directory . --tools codex --user-name Bruno --communication-language English --document-output-language English --yes`.
- Created local BMAD mirror because all stories live in GitHub Project 3.
- Verified implementation with `npm run typecheck`, `npm run lint`, `npm run test:unit`, and `npm run build`.

### Completion Notes

- Attio and QuickBooks outbox workers are implemented.
- Klaviyo and Zoom remain intentionally on hold.
- Supabase migration still needs to be applied remotely before deployed workers can claim events.
- Supabase Cron jobs need to be created for `/api/v1/attio/process` and `/api/v1/quickbooks/process`.

### File List

- `.env.example`
- `app/api/attio/process/route.ts`
- `app/api/quickbooks/process/route.ts`
- `app/api/stripe/webhook/route.ts`
- `app/api/v1/attio/process/route.ts`
- `app/api/v1/quickbooks/process/route.ts`
- `app/api/v1/stripe/webhook/route.ts`
- `lib/attio/config.ts`
- `lib/attio/sync.ts`
- `lib/integrations/outbox.ts`
- `lib/integrations/subscription-sync.ts`
- `lib/quickbooks/config.ts`
- `lib/quickbooks/sync.ts`
- `supabase/migrations/20260629180114_attio_quickbooks_outbox_workers.sql`
- `tests/unit/attio-quickbooks-integrations.test.ts`
- `docs/ARCHITECTURE.md`
- `docs/HANDOFF.md`
- `docs/OPERATIONS.md`

### Change Log

- 2026-06-29: Implemented scoped Attio + QuickBooks outbox workers from GitHub Project issue #18.

## Status

in-progress
