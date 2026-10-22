# Deep French Canadian Audit - 2026-09-01

## Verdict

Status: Not ready for an external full-platform French review yet.

The public website, public auth pages, legal pages, referrals, sponsorships, and signup entry flow are in good shape in this sweep. A reviewer should be able to reach the login/signup screens in French, and local authenticated E2E confirms the app can create and use an authenticated workspace when local Supabase is running.

The authenticated product is still not clean enough for a French Canadian review. The audit found visible English strings or English seed/demo content on 13 of 30 crawled routes, including the first authenticated dashboard and several core modules. Some of this may be product names or customer/demo data, but a French reviewer will still see English immediately after login.

## Scope

- Locale forced to `fr-CA` using the app locale cookie.
- Local Supabase-backed authenticated fixture.
- 30 public and authenticated routes crawled with Playwright.
- Page text plus `placeholder`, `aria-label`, and `title` attributes scanned for common English UI patterns.
- Public/mobile smoke, signup, and public accessibility results checked from the latest Playwright run.
- Static source scan run to estimate remaining hardcoded English strings in `app`, `components`, and `lib`.

## Route Crawl Result

- Routes crawled: 30.
- Routes returning successful status and `html lang="fr-CA"`: 30.
- Routes with untranslated-string findings: 13.
- Total flagged snippets: 34.
- Output artifact: `test-results/french-full-audit.json`.

## High-Priority Findings

1. The authenticated dashboard still shows English copy in French mode.

   Evidence includes `Good afternoon, QA.`, `Set up now`, `Browse templates`, `Open module`, `Open template`, `available to you`, `new mentions`, and `Applications upcoming. Review the current round and your application history.`

   Impact: this is the first logged-in experience, so it will make the French version look unfinished even if public pages are translated.

2. Core module names and module UI remain partly English.

   Evidence includes `Board Calendar & Operational Workflow`, `KPI Dashboard and Board Reporting`, `Access & audit`, `Workspace settings`, `Team roles involved`, `Print / Save PDF`, and `Save settings`.

   Impact: reviewers testing the main platform modules will encounter mixed-language UI.

3. The app still depends on runtime translation fallback for authenticated UI.

   The fallback helps visible labels, but the source code still contains many English literals. A broad static scan returned 4,733 string hits across `app`, `components`, and `lib`; this is intentionally noisy, but it confirms localization is not yet first-class module by module.

## Medium-Priority Findings

- `/templates`: `Search templates` placeholder remains English, and `Board Calendar & Operational Workflow` appears in content.
- `/team`: `Team member email` aria label remains English.
- `/subscription`: seat-purchase copy remains English: `Add one paid seat for $15.00 CAD one-time. After payment is confirmed, invite the teammate from Team.`
- `/community`: `Olea Connects™ Community` and `Community live updates connected` remain English.
- `/consulting`: upgrade/availability copy remains English.
- `/modules/board-recruitment`: seeded values such as `Community & Networks` and `Grassroots Community Organizing` remain English.
- `/modules/grant-platform`: seeded/demo content such as `BC Community Gaming Grant - Arts`, `Team & Collaboration Updates`, and document names remain English.
- `/modules/accreditation`: organization placeholder/demo name and action labels remain English.

## Content Decision Needed

Some flagged strings are UI and should be translated. Others are seeded or user-entered data. We should decide this explicitly:

- Translate UI labels, buttons, tabs, validation messages, empty states, page descriptions, and aria/placeholder text.
- Either translate demo seed data for French review environments or document that organization-entered content remains in the language entered by the user.
- Keep brand names such as `Olea Connects™` unchanged unless marketing wants separate French naming.

## Login Readiness

Local answer: yes, the branch can support login in local authenticated E2E. `npm run test:e2e:authenticated:local` passed previously after Docker/local Supabase became available.

Staging answer: not fully verified from this machine. `.env.local` still has remote service-role keys that decode to the stale Supabase project ref `tweeaxnawemykedrxsar`, while the active project is `hldrzrauokzujinemgxv`. Supabase CLI key retrieval for `hldrzrauokzujinemgxv` returns `403`, so I cannot honestly claim remote/staging authenticated E2E is verified without valid project keys or Supabase platform privileges.

Review answer: if you send the current French experience to a reviewer, they should be able to log in only after the branch is deployed/merged with correct environment credentials. They will still see English in authenticated pages, so I would not send it as a full French review candidate yet.

## Verification Run

Passed:

- `FRENCH_AUDIT=1 bash scripts/with-local-supabase.sh npx playwright test tests/e2e/french-full-audit.spec.ts --project=chromium --workers=1 --reporter=line`: 1 passed, 30 routes crawled.
- Previous public/mobile run recorded in `test-results/junit.xml`: 30 tests, 0 failures.
- `npm run typecheck`: passed.
- `npm run test:unit -- tests/unit/i18n.test.ts tests/unit/global-command-search.test.ts tests/unit/middleware-public-routes.test.ts`: 3 files, 22 tests passed.
- `npm run lint`: passed with existing warnings.

Existing lint warnings:

- `app/modules/accreditation/_components/accreditation-workspace.tsx`: missing `response` dependency in a `useEffect`.
- `lib/accreditation/pdf-export.tsx`: image element missing `alt`.

## Recommended Fix Order

1. Localize the authenticated dashboard source-level strings first.
2. Localize subscription/team/settings strings and all aria/placeholder text.
3. Localize module tab labels and action buttons across Board Calendar, KPI Dashboard, ED Review, Board Recruitment, Grant Platform, Accreditation, Consulting, Sponsors, and Grants.
4. Decide and implement a French seed/demo data strategy.
5. Promote the opt-in French audit spec into a release checklist command for French review builds.
6. Fix remote Supabase test credentials so staging authenticated E2E can run before external review.

