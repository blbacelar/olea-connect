# UX/UI audit - 2026-10-11

## Scope and evidence

- Inspected the public production site without submitting forms or changing live data. The signup back path and sponsorship booking links were verified there.
- Ran an authenticated, disposable local Supabase workspace through 51 concrete route targets at 1440 x 900 and 390 x 844. These cover the repository's 44 `page.tsx` route patterns, including role-restricted pages, a Seedling-only page, and a seeded webinar detail page. Screenshots and route observations are in `/tmp/olea-ux-audit-2026-10-11/`.
- Opened all 41 tabs across Accreditation, Board Calendar, Board Recruitment, ED Review, Grant Platform, and KPI Dashboard. Completed first-time Accreditation and KPI setup in local QA organizations before checking their gated tabs.
- Opened and dismissed Add meeting, Add roster member, and Add Grant dialogs at desktop and mobile widths. All six Escape closures returned to the originating module and URL.
- The route collector is an inventory, not a visual assertion. Its passing result means pages were visited and captured, not that every page is defect-free. Local public pages emitted intermittent `Unexpected token '<'` script errors; their production relevance is unconfirmed.
- An initial Accreditation tab capture did not settle on Template Editor; a focused rerun selected all 41 tabs. Treat this as an intermittent observation, not a confirmed product defect.

## Findings

| Priority | Area | Observed behavior and impact | Recommended correction |
| --- | --- | --- | --- |
| P2 | Mobile sponsorship and referrals | At 390px, the public header is 31px wider than the viewport and clips the **Get started** CTA. The logo/tagline, fixed-width language selector, and CTA compete for one row. See `public-390--sponsorship.png` and `public-390--referrals.png`. | Use a compact mobile header: hide the tagline, reduce selector width, or move the CTA to a second row/menu. Check 320-430px and both locales. |
| P2 | Signup return path | From `/signup/account`, **Back to plan** goes to `/#plans`, not the preceding `/signup` chooser. Verified on production after advancing from `/signup`; it leaves the three-step flow and does not return to the selection screen. | Route back to `/signup`, preserving the selected plan. Put an accessible back control near the step heading as well as below the form. |
| P2 | Sponsorship booking | Production **Book a conversation** links open `mailto:sponsorship@olivesocialimpact.com`, not a booking calendar. The CTA promises an appointment but hands the user to email. The component falls back to `mailto:` when `NEXT_PUBLIC_SPONSORSHIP_CALENDLY_URL` is absent. | Configure and verify the intended live booking URL, or change the CTA label to **Email us** until scheduling works. |
| P2 | Help navigation | **Help** is a persistent menu destination, but the page promises guides, answers, and a person and then only says **Coming soon**. A user seeking support reaches a dead end. | Provide at least a working support contact and a small FAQ, or remove the menu item until available. |
| P3 | Module tabs on mobile | Board Calendar, KPI, Board Recruitment, and ED Review place later tabs outside a clipped horizontal strip without a visible scroll indicator or next-tab control. Users may not discover Settings, reports, or later quarters. | Add a visible overflow cue/scroll buttons or a compact section picker at narrow widths; keep focus and active tab visible after changes. |
| P3 | Grant Platform on mobile | Ten tabs wrap across four rows below a large hero. The actual Pipeline and **Add Grant** control are below the first viewport. | Collapse navigation into a mobile section picker or reduce the hero/navigation footprint so the primary task appears sooner. |
| P3 | Signup account step | The account form does not show the selected tier, billing cadence, or price; returning to review the choice requires scrolling to the bottom. This makes the payment handoff harder to verify. | Add a compact selected-plan summary and an early **Change plan** link. |
| P3 | What's new and Consulting | **What's new** is another permanent menu item that only says **Coming soon**. On Roots, Consulting says to upgrade to Harvest but provides no direct upgrade action. | Hide the placeholder item or publish updates; link the consulting upgrade message to Subscription. |
| P3 | Board Calendar wording | **Add meeting** opens a dialog titled **Add Entry**. It is functional, but the change in noun makes the action less predictable. | Match the dialog title to the initiating action, or label the button **Add calendar entry** if all entry types are intended. |

## Coverage and limits

| Surface | Checked | Limit |
| --- | --- | --- |
| Public landing, sponsorship, referrals, signup steps, login/recovery, legal documents | Desktop/mobile local screenshots; key public paths manually on production | No live payment, email confirmation, or account creation performed |
| Dashboard, Community, Consulting, Circle of Generosity, Sponsors, Team, Users Directory, Subscription, Help, What's new, Brand Profile, Templates, Webinars | Desktop/mobile seeded owner workspace | Empty/seeded content does not represent all populated production states; QA subscription price is fixture data, not production pricing evidence |
| Six modules and internal tabs | 41 tab selections; screenshots after activation | No populated KPI, grant, review, or board-calendar record was created solely for this visual audit |
| Restricted settings and webinar management/detail | Local super-admin role and seeded webinar | Production role-specific access not exercised |
| Seedling template selection | Local Seedling account at desktop/mobile | Annual reselection and completion were not submitted |
| Team invitation and anonymous surveys | Invalid-link/error pages opened | Valid invitation and survey-token submissions were not exercised in this audit |
| Dialog return behavior | Three primary creation dialogs at both widths; Escape returns to origin | Save, validation, delete confirmation, PDF export, and third-party handoff were not exhaustively retested |
| Locale coverage | English interface audited across routes | French layouts and translation accuracy were not swept in this pass |

## Next verification pass

The priority is to fix the four P2 items, then rerun the route sweep and a manual 320/390px check. A separate seeded-data pass should cover populated dashboards, a valid invitation, both anonymous survey types, document/PDF flows, and production authenticated roles before calling the entire platform visually signed off.

Reproduce the local inventory with:

```sh
OLEA_UX_AUDIT_OUTPUT_DIR=/tmp/olea-ux-audit-2026-10-11 bash scripts/with-local-supabase.sh npx playwright test tests/e2e/ux-route-audit.spec.ts --project=chromium --workers=1
```
