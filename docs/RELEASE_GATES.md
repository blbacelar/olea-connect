# Release Gates and Production Launch Checklist

This checklist is the evidence record for issue #22. Keep it updated before any
production launch or major release.

## Release Gate Status

| Gate | Required evidence | Owner | Current status |
| --- | --- | --- | --- |
| Branch protection | `main` requires PRs, one approval, stale review dismissal, conversation resolution, no force pushes/deletions, and the `PR Gate` status check. | Engineering lead | Configured on GitHub on 2026-07-14. |
| Pull request CI | `.github/workflows/ci.yml` runs lint, typecheck, unit tests, production build, clean Supabase migration reset/lint, database tests, data-isolation tests, browser smoke, security-boundary tests, and critical dependency audit. | Engineering lead | Configured. |
| Nightly regression | `.github/workflows/regression.yml` runs unit, database/data isolation, and cross-browser critical/a11y regression against `staging` by default. | Engineering lead | Configured. |
| Dependency scanning | GitHub Dependabot security updates enabled, `.github/dependabot.yml` schedules weekly npm updates, and CI blocks critical `npm audit` findings. | Engineering lead | Configured. Known high-severity Next.js major-upgrade findings remain tracked below. |
| Secret scanning | GitHub secret scanning and push protection enabled. GitGuardian check also runs on PRs when the integration is installed. | Engineering lead | Enabled in GitHub settings on 2026-07-14. |
| Preview/prod separation | Vercel Preview and Production variable scopes reviewed; preview/staging must use non-production Supabase, Stripe test mode, Resend test routing, and staging app URL. | Engineering lead | Metadata inspected on 2026-07-14; value-level evidence required before launch. |
| Migration safety | Production migration plan includes staging validation, reviewer approval, backup checkpoint, and rollback/forward-fix plan. | Engineering lead + Database owner | Process documented below. |
| Deployment rollback | Vercel rollback procedure and post-rollback validation documented. | Engineering lead | Process documented below. |
| Launch checklist | Domains, email, Stripe, Supabase, storage, analytics, accessibility, legal pages, and support readiness have owner and evidence. | Product owner + Engineering lead | Checklist documented below; evidence must be filled before launch. |

## Known Dependency Findings

`npm audit --audit-level=high` currently reports high-severity findings tied to
the Next.js 14 to Next.js 16 major upgrade path and an eslint-config-next
transitive `glob` advisory. The dedicated migration is tracked in
[issue #51](https://github.com/blbacelar/olea-connect/issues/51). CI blocks
critical vulnerabilities now; before public production launch, the team must
make one of these decisions:

1. Upgrade Next.js and eslint-config-next through a dedicated migration ticket,
   including full E2E and PDF/export verification.
2. Approve a time-boxed risk exception with documented mitigations and an owner.

Do not silently ignore high-severity dependency findings for production launch.

## Environment Separation Matrix

Never use production service-role keys, live Stripe secrets, or live customer
data in Preview/Staging.

| Variable family | Preview/Staging requirement | Production requirement | Evidence owner |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | `https://staging.oleaconnects.com` or the current preview URL. | Public production URL. | Engineering lead |
| Supabase public/service keys | Staging/non-production Supabase project. | Production Supabase project. | Database owner |
| Stripe keys/prices/webhooks | Stripe test mode keys, test prices, test webhook secret. | Stripe live mode keys, live prices, live webhook secret. | Billing owner |
| Resend/email | Non-production sender behavior with `EMAIL_TEST_RECIPIENT` or controlled test routing. | Verified production sender domain with real recipient delivery. | Operations owner |
| OpenRouter/moderation | Staging key or low-risk shared key with test data only. | Production key with AI moderation enabled. | Community owner |
| Cron secrets | Unique per environment. | Unique production value; rotate if exposed. | Engineering lead |
| Storage buckets | Staging buckets with disposable data. | Production buckets with retention policy and backup coverage. | Database owner |

Before production launch, record screenshots or CLI output showing variable
scope and project separation. Do not paste secret values into GitHub issues,
docs, pull requests, Slack, or tickets.

## Production Migration Procedure

Every production database change needs a migration review entry in the release
PR or launch checklist.

1. Create a committed migration under `supabase/migrations/`.
2. Add or update Supabase database tests in `supabase/tests/` when the migration
   changes RLS, constraints, triggers, or security-definer functions.
3. Run locally:

   ```bash
   bash scripts/with-local-supabase.sh bash -c '
     HOME="$PWD/.supabase-home" npx supabase db reset &&
     HOME="$PWD/.supabase-home" npx supabase db lint &&
     npm run test:db &&
     npm run test:e2e:data
   '
   ```

4. Apply and validate on staging first.
5. Record the production backup checkpoint.
6. Choose a rollback strategy:
   - **Forward fix** for additive migrations, data backfills, and changes that
     cannot be safely reversed.
   - **Rollback migration** only when reversing is safe and tested.
7. Document owner, expected duration, validation queries, and user-facing risk.
8. Apply production migration during an agreed release window.
9. Run post-migration validation and record evidence.

## Vercel Deployment Rollback Procedure

Use rollback when production is degraded and the previous deployment is known
good. Prefer a forward fix only when rollback would worsen database or provider
state.

1. Open Vercel Project → Deployments.
2. Select the last known good Production deployment.
3. Use **Promote to Production** / redeploy the known-good deployment.
4. Confirm assigned production domains point to the rollback deployment.
5. Validate:
   - landing page loads
   - login works
   - dashboard loads for an existing paid user
   - Stripe webhook endpoint returns expected auth rejection for unsigned calls
   - Supabase connection works for a simple authenticated page
   - email processor/cron route rejects missing `CRON_SECRET`
6. Update the incident or launch issue with deployment URL, rollback time, owner,
   and validation results.

CLI helpers:

```bash
vercel inspect <deployment-url>
vercel logs <deployment-url>
```

The local Vercel CLI should be kept current with:

```bash
npm i -g vercel@latest
```

## Production Launch Checklist

Fill the Evidence column before closing the release issue.

| Area | Required check | Owner | Evidence |
| --- | --- | --- | --- |
| Domains | Production domain resolves without Vercel protection, HTTPS is valid, canonical URL is correct. | Engineering lead | Pending |
| Demo isolation | CEO demo branch/deployment is not overwritten by production-development work. | Engineering lead | Pending |
| Email | Resend domain DKIM/SPF/DMARC verified; auth email, invite email, and notification email tested. | Operations owner | Pending |
| Stripe | Live products/prices match approved pricing; checkout, upgrade, add seats, portal, and webhook tested. | Billing owner | Pending |
| Supabase | Production project selected; auth URLs configured; RLS/data isolation tests reviewed; backups confirmed. | Database owner | Pending |
| Storage | User uploads and generated documents use correct buckets; cleanup cron verified; no public leakage of private files. | Database owner | Pending |
| Cron | Email, provisioning, moderation, reminders, generated-document cleanup jobs configured with production `CRON_SECRET`. | Engineering lead | Pending |
| Integrations | Resend, Attio, QuickBooks processors have credentials or documented launch deferral. | Operations owner | Pending |
| Community moderation | AI moderation enabled and unsafe-link/disrespectful-content tests passing. | Community owner | Pending |
| Accessibility | Critical/a11y regression passing; manual spot check on public landing and primary dashboard flows. | QA owner | Pending |
| Legal pages | Terms, privacy, cancellation/refund language, and contact/support copy approved. | Product owner | Pending |
| Analytics/observability | Production errors/logs visible; owner knows where to check Vercel, Supabase, Stripe, Resend. | Engineering lead | Pending |
| Support | Support inbox/contact path verified; escalation owner named. | Operations owner | Pending |

## Closure Rule for Issue #22

Close issue #22 only when:

1. The release-gate status table has no unknown gate.
2. Every production launch checklist row has evidence or an explicit launch
   deferral approved by the product owner.
3. The latest PR into `main` shows `PR Gate` passing.
4. Any open high-severity dependency findings have a migration ticket or an
   approved time-boxed exception.
