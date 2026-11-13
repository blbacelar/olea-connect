# Roots staging QA — new organization with five people

Date: 12 November 2026 (America/Vancouver)

Target: `https://staging.oleaconnects.com` and development Supabase `tweeaxnawemykedrxsar`

Scope: Roots purchase, seats, invitations, included modules, exports, access boundaries, and French navigation. Production was not used for this QA.

## Result

Roots includes **10 seats**. A company with an owner and four colleagues reserves **5 of 10** seats and does not need to buy additional seats. The staging purchase used Stripe sandbox (`cs_test_`), Roots annual **CA$3,530**, and provisioned an active Roots subscription and workspace in development Supabase. No live charge was made.

The owner opened all eight Roots workspaces. Four further members signed in and opened Board Calendar. A separate invitation flow was exercised from Team through invite acceptance. The temporary invited members were removed after the test; the paid QA organization and test subscription remain in development systems.

| Area | Path exercised | Result |
| --- | --- | --- |
| Signup and billing | Roots signup, validation/consent, sandbox checkout, return, subscription and workspace provisioning | Passed; one unpaid-state copy issue below |
| Team and seats | Owner plus four members; 5/10 reserved; invite and acceptance | Passed |
| Board Calendar | Meeting creation, reload, update, duplicate, delete, date selection, month/mobile, `.ics` export | Passed |
| Grant Platform | Grant create/edit/delete, isolation, branded board report PDF | Passed |
| Community | Member post and access | Passed |
| Webinars | Registration | Passed |
| Board Recruitment | Roster/committee actions and branded report PDF as owner | Passed; member access message needs improvement |
| KPI Dashboard | KPI create/edit/delete and branded PDF | Passed |
| Board Evaluation | Five anonymous annual responses, closed aggregates (4.00/5), branded PDF, mobile | Passed |
| Accreditation | Setup and evidence flow | Passed |
| Entitlements | ED Review, Strategic Planning, Board Training locked for Roots | Passed |
| French | Calendar, Grants, KPI, Evaluation, Accreditation headings and `fr-CA` document language | Passed |

## Findings

1. **Board Recruitment access for an ordinary member:** the Roots navigation exposes the module, but an ordinary member sees the generic “We could not load this page” error. Owner and admin actions work. This appears to be a role restriction presented as a page failure. The screen should explain the required role or offer a member view, depending on the intended product rule.
2. **Unpaid account after email confirmation:** with an admin-generated confirmation link, the user landed on `/subscription?billing=required`, which said “Membership activation is still syncing” and offered “Retry activation” before payment had started. The copy is misleading at this stage. The actual delivered email link was not opened, so this needs confirmation through that exact path before treating it as a fully reproduced email-flow defect.

Neither finding prevented the sandbox purchase or the owner from using the included modules. They should be resolved before claiming a polished five-person onboarding experience.

## Verification and limits

- Development Supabase migration history was checked through `20261112210000`. The staging health endpoint reported the database healthy. The preview was confirmed to point to the development Supabase and Stripe test mode.
- The new targeted Playwright tests passed **4/4** on published staging: five seats and access boundaries, French module navigation, branded Grant/KPI PDFs, and five anonymous Board Evaluation responses.
- Existing module E2E paths passed for Calendar, Grants, Recruitment, KPI, Accreditation, Community, and Webinars. The obsolete Board Evaluation regression test was replaced with the current anonymous-survey flow. Signup, Calendar mobile, and Recruitment PDF checks also passed.
- `npm run typecheck`, focused ESLint, and `git diff --check` passed.
- The actual confirmation email and invitation email links were not clicked in a mailbox; account confirmation for the purchase and invitation was performed through development Supabase admin tools. Only Chromium was used for this QA. This was a targeted journey, not every control or a complete accessibility audit.
