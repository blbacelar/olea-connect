# CRUD and data-integrity QA review - 2026-10-11

## Remediation update - 2026-10-11

The three Grant Platform findings below are fixed in the local workspace, but are **not deployed or verified against the linked Supabase environment**:

- Calendar now reads organization-scoped applications and their saved funder, rather than deriving funder from the grant program. The same edited grant details appear in Pipeline and Calendar after reload.
- Pipeline now has edit and delete actions for workspace-created planning drafts. Server actions enforce the signed-in organization and role; database RPCs restrict changes to an unshared draft and update its round/application atomically. Deletion is admin-only and requires confirmation. Submitted or shared grants are not eligible.
- Expired hard-coded 2026 B.C. grant dates were removed. Calendar links to the official B.C. program schedule and explicitly says external intake dates are not synchronized.

Verification: 142/142 critical Chromium E2E tests, 446/446 unit tests, typecheck, production build, scoped ESLint (0 errors), diff check, and new grant migration pgTAP tests (6/6) passed. The grant E2E covers create, edit, delete, persistence, tenant isolation, and restricted roles. The new migration was applied only to the disposable local database for this run. The full local database suite is still red on a pre-existing legacy referral-code fixture (1 active code where its test expects 0), and local migration history contains two versions absent from this checkout. The linked environment has all repository migrations through `20261011000000`, but **not** the new `20261012060000` migration. No linked-environment authenticated CRUD smoke was run, so these fixes must not be promoted as deployed or signed off for production yet.

## Verdict

**Do not sign off the whole platform as CRUD-complete.** The broad local critical suite is healthy after updating four stale assertions, but the new Grant Platform persistence check exposes a cross-screen data mismatch, and created grants have no edit or delete action. No customer data was changed in production.

## Findings

| Priority | Area | Reproduction and impact | Evidence / correction |
| --- | --- | --- | --- |
| P2 | Grant Platform Calendar funder | Create a grant named `QA Community Capacity` with funder `QA Community Foundation`. After reload, Pipeline shows the correct funder and amount. Calendar shows the grant name but not that funder; it uses the generic program name instead. The same grant appears to have different funder details depending on the tab. | `tests/e2e/grant-platform-persistence.spec.ts` fails at the Calendar assertion. `grant-calendar-panel.tsx:88-96` maps `funder` from `round.programName`, while `grant-pipeline-table.tsx:112-125` uses `application.funderName`. Use the saved grant's funder consistently. |
| P2 | Grant Platform CRUD | **Add Grant** creates a draft, but the Pipeline table has no row actions and no edit/delete path for the saved grant name, funder, amount, deadline, or notes. A user cannot correct a typo or remove an accidental grant. | `grant-pipeline-table.tsx:99-126` has only read-only columns; `actions.ts` exposes create/status changes but no grant-detail update/delete. Add authenticated, organization-scoped edit and delete/archive operations with read-after-write tests. |
| P2 | Grant Platform annual dates | The Calendar always merges five hard-coded 2026 B.C. Community Gaming Grant dates. As of this review, all five are past, but they still appear as the fixed annual intake schedule. | `grant-calendar-panel.tsx:25-57,100-106`. Source/refresh the current official dates, or label them as historical examples rather than active opportunities. |

## Verified paths

- The existing critical Chromium run exercised 140 tests across 23 files against disposable local Supabase organizations: 136 passed. Four failures were stale test expectations, not observed product regressions: retired Templates sidebar item, renamed Circle of Generosity/Sponsors headings, and the approved Seedling annual price. Their assertions were updated and the affected scenarios passed on focused rerun.
- Board Calendar: meeting/event create, duplicate time slot, edit of title/time/location, cancel/confirm delete, directory committee CRUD, task generation and updates, package document add/delete, and reload persistence passed. An added assertion verified that the renamed meeting appears in **Meetings** and the old exact title does not, before and after reload. Meeting agenda/minutes save, approval, export, package, and deletion with a legacy chair passed in the broad suite.
- KPI: a new local browser regression passed database-backed setup, Q1 create, Q2 isolation, exact-name edit, current-value edit, reload, and archive. Immediate post-click reload was initially flaky; the test now waits for the saved database state or row update before reloading. This was a test synchronization issue, not a confirmed KPI product defect.
- Board Recruitment roster/committee/skill CRUD, ED review confidential reviewer CRUD and access edges, Community post/comment mutations, team invitations, webinar create/archive/registration, Accreditation evidence persistence, and brand-profile persistence all passed in the broad suite.
- A second authenticated local organization did **not** see the first organization's newly created grant in its Calendar during the targeted test. The unfiltered query in application code merits review, but this run did not reproduce a tenant leak; database RLS appears to enforce the boundary.
- Focused ESLint on changed tests: 0 errors, 2 existing max-lines warnings. Typecheck passed.

## Limits

This is a broad automated CRUD review, **not a manual proof of every operation in every module**. Some tests confirm read/access rather than full create-edit-delete lifecycles. The prior page-by-page UX audit is `docs/QA_UX_UI_AUDIT_2026-10-11.md`; it covers route/tab placement but not data persistence. Production was read-only. Live Stripe payment, email delivery, real mailboxes, external Zoom, and production-authenticated edits were not exercised. The new grant test remains red until the Calendar mismatch is fixed; do not claim a clean full-suite pass or promote these changes as verified.

## Reproduce

```sh
bash scripts/with-local-supabase.sh npx playwright test tests/e2e/grant-platform-persistence.spec.ts tests/e2e/kpi-persistence.spec.ts tests/e2e/board-calendar-workflow.spec.ts --project=chromium --workers=1
```
