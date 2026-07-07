# Testing Guide

This project uses layered tests. Do not rely on one big E2E run as the only
signal; choose the smallest test that covers the risk, then run broader suites
before merge.

## Test Types

### Static Checks

```bash
npm run typecheck
npm run lint
```

### Unit Tests

```bash
npm run test:unit
```

Unit tests cover domain logic, route helper logic, email rendering, template
renderer functions, Stripe subscription mapping, deferred Circle
SSO/provisioning helpers, grants logic, team seats, and utility functions.

### Database Tests

```bash
npm run test:db:local
```

Database tests live in `supabase/tests/` and cover:

- Security contracts.
- Workspace provisioning.
- Email delivery.
- Event operations, registration uniqueness, attendance imports, and event change notification outbox rows.
- Stripe billing.
- Seedling template selection.
- Provisioning and entitlements.
- Team management.
- Template engine behavior.

### Playwright E2E

Platform UI smoke:

```bash
npm run test:e2e:platform
```

Local Supabase platform UI smoke:

```bash
npm run test:e2e:platform:local
```

Smoke:

```bash
npm run test:e2e:smoke
```

Critical Chromium suite:

```bash
npm run test:e2e:critical
```

Webinars and event registration:

```bash
npm run test:e2e:webinars:local
```

Full cross-browser suite:

```bash
npm run test:e2e
```

Accessibility:

```bash
npm run test:e2e:a11y
```

Data isolation:

```bash
npm run test:e2e:data:local
```

Security boundaries and tenant isolation:

```bash
npm run test:e2e:security:local
```

The security suite signs in as real Supabase users and verifies that one
organization cannot read or mutate another organization's private records,
including organizations, brand profiles, members, subscriptions, template
instances, generated exports, and export downloads. It also asserts that a
non-author cannot edit, archive, or delete another member's community content.

## Playwright Server Behavior

`playwright.config.ts` starts the app through:

```bash
npm run build && npm run start -- -p 3011
```

This is intentional. It avoids `next dev` HMR/runtime noise and tests closer to
production behavior.

If you already have a compatible server running at the configured base URL:

```bash
PLAYWRIGHT_SKIP_WEBSERVER=true npx playwright test ...
```

Only use this when you know the server matches the code under test.

## Test Data Isolation

Mutating E2E tests must:

- Create their own users.
- Create their own organizations.
- Track exact IDs.
- Purge data in teardown.
- Avoid shared global test users.

Fixtures:

- `tests/fixtures/test-data.fixture.ts`
- `tests/fixtures/authenticated.fixture.ts`
- `tests/support/test-environment.ts`

The test-data manager refuses to run unless:

```text
PLAYWRIGHT_TEST_DATA_ENABLED=true
```

and the environment is declared:

```text
PLAYWRIGHT_TEST_ENV=local|staging
```

Never point test-data variables at production.

## Feature Completion Gate

New features and bug fixes are not considered done until the relevant automated
coverage has been added or updated and the focused suite passes. Use
[E2E_COVERAGE.md](./E2E_COVERAGE.md) as the platform checklist.

Before changing application code to satisfy a failing E2E test, classify the
failure:

- Product/code defect.
- Test defect.
- Environment or external dependency issue.
- Test data collision or cleanup failure.
- Known provider/rate-limit instability.

Only update application code for a real product defect. Only update test code
for brittle setup, wrong assertions, or incorrect synchronization. Do not weaken
assertions or bend product behavior just to make a flawed test pass.

## Auth Setup in Tests

Protected-page tests should not log in through the UI. They should:

1. Create a confirmed user with fixture helpers.
2. Create active organization/subscription data.
3. Sign in through Supabase Auth API.
4. Inject SSR cookies into the browser context.

UI login tests should be reserved for testing the login/logout/recovery UI
itself.

When replacing the signed-in user inside an existing Playwright page, clear
cookies first:

```ts
await page.context().clearCookies();
await page.context().addCookies(storage.cookies);
```

This avoids stale authenticated state bleeding between users.

## Supabase Auth Rate Limits

Hosted Supabase Auth has email and sign-in rate limits. Full cross-browser E2E
runs against hosted Supabase can fail with:

- `email rate limit exceeded`
- `AuthApiError: Request rate limit reached`

Do not hide real product failures behind this excuse. First confirm whether the
failure stack is from Supabase Auth setup or password reset email sending.

Recommended approach:

- Use local Supabase for full regression where possible.
- Run focused tests when debugging one feature.
- Avoid unnecessary UI login setup.
- Keep auth-recovery tests narrow.

## Common Focused Commands

Board calendar CRUD:

```bash
npx playwright test tests/e2e/dynamic-template-renderer.spec.ts \
  --grep "creates, edits, and deletes a board calendar entry" \
  --project=chromium \
  --workers=1
```

Global auth/security boundaries:

```bash
npm run test:e2e:security:local
```

Brand profile:

```bash
npx playwright test tests/e2e/brand-profile.spec.ts \
  --project=chromium \
  --workers=1
```

Platform UI coverage:

```bash
npm run test:e2e:platform
```

Native community:

```bash
npm run test:e2e:community:local
```

This covers authenticated access boundaries, tier-scoped spaces, seeded posts,
Zoom-linked events, community manager affordances, member-created posts, selected
space filtering, likes, comments, suspicious-link background hiding, and the
disrespectful-content background hiding path. Keep post-creation tests isolated with the test-data
fixture so each run creates and purges its own organization and community data.

Member journeys in WebKit:

```bash
npx playwright test tests/e2e/member-journeys.spec.ts \
  --project=webkit \
  --workers=1
```

## CI

`.github/workflows/ci.yml` runs on PRs to `main` and pushes to `main`.

Jobs:

- `Quality and Build`: lint, typecheck, unit tests, production build.
- `Database and Isolation`: local Supabase reset, lint, database tests,
  test-data isolation.
- `Browser Smoke`: Chromium PR smoke tests plus authenticated security-boundary
  tests for tenant isolation and object-level authorization.
- `PR Gate`: fails if any required job fails.

`.github/workflows/regression.yml` runs nightly and on demand. It runs unit
tests, local Supabase database tests, and the full E2E suite.

## What to Test by Change Type

### UI-only Component Change

```bash
npm run typecheck
npm run lint
npm run test:e2e:smoke
```

Add focused Playwright coverage for interactive behavior.

### Auth or Middleware Change

```bash
npm run typecheck
npm run lint
npx playwright test tests/e2e/security-boundaries.spec.ts --project=chromium
```

Also manually verify redirect behavior if public routes changed.

### Database/RLS Change

```bash
npm run test:db:local
npm run test:e2e:data:local
```

Add or update pgTAP tests.

### Stripe/Billing Change

```bash
npm run test:unit -- stripe
npx playwright test tests/e2e/billing-access.spec.ts --project=chromium
```

Manually verify Stripe test-mode behavior in preview when changing live
subscription operations.

### Template Engine Change

```bash
npm run test:unit -- template
npx playwright test tests/e2e/dynamic-template-renderer.spec.ts --project=chromium
```

If exports change, visually inspect generated PDF/DOCX output.

### Email Change

```bash
npm run test:unit -- email
npx playwright test tests/e2e/security-boundaries.spec.ts --project=chromium
```

Send a real test email only from a safe environment and check provider events.

## Accessibility Expectations

Use semantic controls, labels, visible focus states, and shadcn/Radix primitives
where possible. Run:

```bash
npm run test:e2e:a11y
```

Any serious or critical axe violation should be fixed before merge unless there
is a documented false positive.
