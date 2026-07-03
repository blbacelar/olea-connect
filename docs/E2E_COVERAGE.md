# E2E Coverage Contract

Issue #46 makes UI E2E coverage part of the feature definition of done. A
feature is not complete until the relevant automated coverage exists, has been
run, and any failure has been triaged before code or tests are changed.

## Platform Coverage Checklist

| Area | Required E2E coverage | Current signal |
| --- | --- | --- |
| Public landing and pricing | Landing renders, pricing CTAs carry selected tier into signup, no duplicate plan selection | `tests/e2e/public-smoke.spec.ts`, `tests/e2e/signup.spec.ts` |
| Signup and auth UX | Account creation validation, verification messaging, login, password recovery, invalid or expired auth links | `tests/e2e/signup.spec.ts`, `tests/e2e/auth-recovery.spec.ts`, `tests/e2e/security-boundaries.spec.ts` |
| Authenticated app shell | Dashboard, templates, brand profile, team, subscription, grants, webinars, community, help, and what's-new screens load for a paid member | `tests/e2e/platform-ui-coverage.spec.ts` |
| Auth boundaries | Protected routes redirect when signed out; non-admin users cannot access privileged actions | `tests/e2e/security-boundaries.spec.ts`, `tests/e2e/brand-profile.spec.ts` |
| Brand profile | Owners/admins can update brand data; non-admins see read-only messaging; logo storage is cleaned up | `tests/e2e/brand-profile.spec.ts` |
| Template library | Tier access, locked-template upgrade CTA, dynamic template open/edit/complete flows | `tests/e2e/authenticated-member.spec.ts`, `tests/e2e/dynamic-template-renderer.spec.ts` |
| Board Calendar & Operational Workflow | New workbook, setup, committees, task rules, calendar CRUD, duplicate same-date/time events, generated staff tasks, AGM timeline, delete dialog, persistence, mobile layout | `tests/e2e/board-calendar-workflow.spec.ts` |
| Team and seats | Invite, cancel invite, seat limits, member visibility, permission states | `tests/e2e/member-journeys.spec.ts`, `tests/unit/team-seats.test.ts` |
| Subscription and billing states | Active membership, billing recovery, activation sync recovery, seat confirmation, plan/seat unit behavior | `tests/e2e/billing-access.spec.ts`, `tests/unit/stripe-*.test.ts` |
| Grants, webinars, community, help | Major screens render in authenticated shell and show the correct empty/seeded states | `tests/e2e/platform-ui-coverage.spec.ts`, `tests/e2e/native-community.spec.ts`, domain/unit tests where applicable |
| Accessibility | Public and critical dynamic template screens have no serious/critical axe violations | `tests/accessibility/*.spec.ts` |

## Feature Completion Gate

For every feature or bug fix:

1. Identify the user journey, business risk, and lowest effective test layer before coding.
2. Add or update unit/API tests for pure logic and service boundaries.
3. Add or update Playwright coverage for user-visible critical flows.
4. Use Page Objects for reusable UI behavior and semantic locators for controls.
5. Create test data through fixtures/API helpers, not slow UI setup, unless the setup UI is the behavior under test.
6. Purge every mutating record in fixture teardown by exact IDs.
7. Run the smallest focused suite first, then the relevant smoke/critical suite.
8. Do not mark the feature done until the relevant tests pass.

## Failure Triage Rule

When any test fails, classify it before changing application or test code:

- Product/code defect
- Test defect
- Environment or external dependency issue
- Test data collision or cleanup failure
- Known provider/rate-limit instability

Only change application code when the evidence points to a product defect. Only
change test code when the assertion, data setup, or synchronization is wrong. Do
not weaken assertions or alter product behavior just to satisfy a flawed test.

## Required Commands

Focused platform UI smoke:

```bash
npm run test:e2e:platform
```

Focused platform UI smoke with local Supabase:

```bash
npm run test:e2e:platform:local
```

PR smoke gate:

```bash
npm run test:e2e:smoke
```

Critical Chromium journeys:

```bash
npm run test:e2e:critical
```

Full regression:

```bash
npm run test:e2e
```
