# French Locale QA Review - 2026-08-31

## Scope

Senior QA pass for the current `codex/issue-66-referral-program` branch with French Canadian selected. Coverage included static translation scanning, public/auth route crawl, unit tests, public/signup E2E, accessibility, authenticated E2E attempt, lint, typecheck, and production build.

## Summary

Status: Public French localization and local authenticated browser verification are passing. Remote Supabase key access is still blocked for this machine/account.

The public landing, signup, login, password reset, referral, sponsorship, legal, and public survey surfaces render in French after selecting `fr-CA`. The authenticated platform now has a French runtime fallback for the high-traffic hardcoded labels/statuses/placeholders while the cleaner long-term module-by-module i18n refactor remains advisable. Docker is now running, so the full local Supabase migration reset completed and the authenticated member E2E suite passes against local Supabase.

## Fix Follow-Up - 2026-08-31 14:54 PDT

Docker/local Supabase verification is now unblocked:

- `bash scripts/with-local-supabase.sh npx supabase db reset --local`: passed and applied the full migration chain through `20260821173409_referral_program.sql`.
- First authenticated local E2E run reached UI verification and passed 4 of 5 tests. The remaining failure was a stale test locator expecting the old header link accessible name.
- Updated `tests/pages/app-shell.page.ts` to use the current accessible name: `Olea Connects governance platform`.
- `npm run test:e2e:authenticated:local`: 5 tests passed.
- `npm run typecheck`: passed.
- `npm run test:unit -- tests/unit/i18n.test.ts tests/unit/global-command-search.test.ts tests/unit/middleware-public-routes.test.ts`: 3 files, 22 tests passed.
- `npm run lint`: passed with the existing accreditation warnings noted below.
- `git diff --check`: passed.

Remaining caveat:

- Remote/test keys in `.env.local` still do not match the `hldrzrauokzujinemgxv` Supabase project, and `npx supabase projects api-keys --project-ref hldrzrauokzujinemgxv --output json` still returns `403`. Local authenticated verification is green, but remote/staging authenticated test execution still needs valid project keys or higher Supabase platform privileges.

## Fix Follow-Up - 2026-08-31 14:44 PDT

Fixed in this pass:

- Corrected local Supabase project URLs from the stale `tweeaxnawemykedrxsar` host to `https://hldrzrauokzujinemgxv.supabase.co`.
- Added a guarded French runtime translator for authenticated app-shell/module copy, including common labels, tabs, statuses, placeholders, validation messages, modal actions, KPI/board calendar/recruitment/ED review/grants/sponsor/consulting terms, and dynamic count/date/status fragments.
- Wrapped the authenticated app shell and public routes in the runtime translator so modal/tab content added after navigation is translated when `fr-CA` is active.
- Added unit coverage proving the runtime translator handles authenticated labels and leaves unknown user-entered text unchanged.

Verification after fixes:

- `npm run test:unit`: 66 files, 324 tests passed.
- `npm run test:unit -- tests/unit/i18n.test.ts tests/unit/global-command-search.test.ts`: 2 files, 19 tests passed.
- `npm run lint`: passed with the existing accreditation warnings noted below.
- `npm run build`: passed with the existing accreditation warnings and Supabase edge-runtime warning noted below.
- `npm run typecheck`: passed when run after build completed.
- `PLAYWRIGHT_BASE_URL=http://localhost:3001 PLAYWRIGHT_SKIP_WEBSERVER=true npx playwright test tests/e2e/public-smoke.spec.ts tests/e2e/signup-flow.spec.ts tests/accessibility/public-accessibility.spec.ts --project=chromium --workers=1`: 15 tests passed after restarting `next dev` cleanly.

Remote credential blocker at that time:

- `PLAYWRIGHT_BASE_URL=http://localhost:3001 PLAYWRIGHT_SKIP_WEBSERVER=true npx playwright test tests/e2e/authenticated-member.spec.ts --project=chromium --workers=1`: 5 tests fail before page interaction with `AuthApiError: Invalid API key` at `tests/fixtures/test-data.fixture.ts:227`.
- `.env.local` currently points `NEXT_PUBLIC_SUPABASE_URL` and `TEST_SUPABASE_URL` at `hldrzrauokzujinemgxv`, but `SUPABASE_SERVICE_ROLE_KEY` and `TEST_SUPABASE_SERVICE_ROLE_KEY` decode to project ref `tweeaxnawemykedrxsar`. Valid keys for `hldrzrauokzujinemgxv` are required before authenticated CRUD/browser tests can run.
- `npx supabase projects api-keys --project-ref hldrzrauokzujinemgxv --output json` also returns `403`, so this machine/account cannot retrieve replacement keys through the Supabase CLI.
- At that time, `npx supabase status` was blocked because Docker was not running locally. This was resolved in the 14:54 PDT follow-up above.
- The authenticated runtime translator is a controlled mitigation for hardcoded UI copy. It should be replaced over time with first-class module-level translation dictionaries so data and UI labels are separated at the source.

## Fix Follow-Up - 2026-08-31 14:25 PDT

Fixed in this pass:

- Landing page accessibility contrast on referral stat headings.
- Signup-flow strict locator failure around the `Roots` plan label.
- Legal page labels, metadata, document titles, summaries, and body content for French Canadian.
- Sponsorship page metadata for French Canadian.
- Global search trigger text, dialog labels, type labels, no-result copy, and indexed command items for French Canadian.
- Public board recruitment survey labels, instructions, dates, submit button, and Yes/No select labels for French Canadian.
- Public ED review anonymous survey instructions, rating guidance, section/question labels, comments, confirmation dialog, submit state, and unavailable page for French Canadian.

Verification after fixes:

- `npm run typecheck`: passed.
- `npm run test:unit -- tests/unit/i18n.test.ts tests/unit/locale-api.test.ts tests/unit/middleware-public-routes.test.ts tests/unit/pricing.test.ts tests/unit/stripe-checkout-errors.test.ts`: 5 files, 27 tests passed.
- `npm run test:unit`: 66 files, 323 tests passed.
- `npm run lint`: passed with the same existing accreditation warnings noted below.
- `npm run build`: passed with the same existing accreditation warnings and Supabase edge-runtime warning noted below.
- `PLAYWRIGHT_BASE_URL=http://localhost:3001 PLAYWRIGHT_SKIP_WEBSERVER=true npx playwright test tests/e2e/public-smoke.spec.ts tests/e2e/signup-flow.spec.ts tests/accessibility/public-accessibility.spec.ts --project=chromium --workers=1`: 15 tests passed.

Still open from this earlier pass:

- Full source-level authenticated module localization remains a larger module-by-module task. Static scan still shows hardcoded English in authenticated module files, although the runtime fallback now covers the common visible UI labels.
- Source-level authenticated module localization remains a follow-up, but local authenticated E2E is no longer blocked now that Docker/local Supabase is available.

## Passed Checks

- `npm run test:unit -- tests/unit/i18n.test.ts tests/unit/locale-api.test.ts tests/unit/middleware-public-routes.test.ts tests/unit/pricing.test.ts tests/unit/stripe-checkout-errors.test.ts`: 5 files, 25 tests passed.
- `npm run test:unit`: 66 files, 321 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed with existing warnings in accreditation code.
- `npm run build`: passed with existing Supabase middleware Edge-runtime warning and existing accreditation lint warnings.
- `PLAYWRIGHT_BASE_URL=http://localhost:3001 PLAYWRIGHT_SKIP_WEBSERVER=true npx playwright test tests/e2e/public-smoke.spec.ts tests/e2e/signup.spec.ts --project=chromium --workers=1`: 15 tests passed.
- French route crawl confirmed `html lang="fr-CA"` and no obvious English hits on `/`, `/signup`, `/signup/account`, `/login`, `/reset-password`, `/verify-email`, `/update-password`, `/referrals`, and `/sponsorship` body content.

## Blocking / Failed Checks

- Authenticated E2E blocked:
  - Command: `PLAYWRIGHT_BASE_URL=http://localhost:3001 PLAYWRIGHT_SKIP_WEBSERVER=true npx playwright test tests/e2e/authenticated-member.spec.ts --project=chromium --workers=1`
  - Failure: `getaddrinfo ENOTFOUND tweeaxnawemykedrxsar.supabase.co`
  - Impact: cannot honestly claim whole-platform authenticated flows are tested until `TEST_SUPABASE_URL`/linked Supabase are corrected or local Supabase is running.
- Historical local Supabase unavailability, resolved at 14:54 PDT:
  - Command: `npx supabase status`
  - Earlier failure: Docker daemon not reachable at `/Users/brunobacelar/.docker/run/docker.sock`.
- Accessibility regression:
  - Command: `PLAYWRIGHT_BASE_URL=http://localhost:3001 PLAYWRIGHT_SKIP_WEBSERVER=true npx playwright test tests/accessibility/public-accessibility.spec.ts --project=chromium --workers=1`
  - Result: landing page fails WCAG AA color contrast.
  - Evidence: `.text-olea-gold` on `#2e523f` has contrast ratio `3.56`, expected `4.5:1`.
- Signup-flow test fragility:
  - Command: `PLAYWRIGHT_BASE_URL=http://localhost:3001 PLAYWRIGHT_SKIP_WEBSERVER=true npx playwright test tests/e2e/signup-flow.spec.ts --project=chromium --workers=1`
  - Failure: strict locator violation because `"Roots"` appears both in the plan heading and summary definition.
  - Impact: product reached the payment page, but the test assertion is ambiguous and should use a role/container-specific locator.

## Missing Translation Findings

### High Priority

- Legal pages are not localized under French:
  - `/legal/terms`
  - `/legal/privacy`
  - `/legal/data-ownership`
  - `/legal/confidentiality`
  - Evidence: pages show `Return to signup`, `OLEA CONNECTS™ LEGAL DOCUMENT`, English document titles, English body copy, and English metadata while `html lang="fr-CA"`.
- Authenticated modules are largely hardcoded in English:
  - `app/modules/grant-platform`
  - `app/modules/kpi-dashboard`
  - `app/modules/board-recruitment`
  - `app/modules/ed-review`
  - `components/templates/BoardCalendarWorkbench.tsx`
  - `components/templates/BoardCalendarWorkflowPanels.tsx`
  - `components/templates/BoardCalendarPackagesPanel.tsx`
  - `app/sponsors`
  - `app/consulting`
  - `app/subscription`
  - `app/dashboard`
  - `app/onboarding`

### Medium Priority

- Global search is hardcoded in English:
  - `components/global-search/search-items.ts`
  - `components/global-search/GlobalCommandPalette.tsx`
- Public sponsorship page body is localized, but metadata is English:
  - `app/sponsorship/page.tsx`
  - Current title: `Sponsorships | Strengthen nonprofit resilience`.
- Several public survey pages are English-only:
  - `app/modules/board-recruitment/survey/[token]/page.tsx`
  - `app/modules/ed-review/survey/[token]/survey-form.tsx`
  - `app/modules/ed-review/survey/unavailable/page.tsx`

## Recommended Next Fix Order

1. Replace the authenticated runtime translation fallback with first-class module-level dictionaries over time.
2. Add valid remote/staging Supabase test keys for `hldrzrauokzujinemgxv` or grant this machine/account Supabase platform privileges so remote authenticated E2E can run outside local Docker.
3. Expand authenticated French browser coverage module by module: Subscription, Team, Brand/Profile, Sponsors, Consulting, Board Calendar, KPI Dashboard, Board Recruitment, ED Review, Grant Platform, Accreditation.

## QA Verdict

French localization is in a shippable public-flow state and local authenticated smoke coverage is passing. The platform should still move from runtime fallback translation to source-level module dictionaries before calling the authenticated app fully bilingual. Remote/staging authenticated E2E still needs valid Supabase project keys or elevated Supabase platform access.
