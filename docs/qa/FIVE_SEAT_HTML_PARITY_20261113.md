# Five-user onboarding and HTML parity QA — 13 November 2026

## Scope and test environment

- Base revision: `origin/staging` at `3991fb8`; work branch `codex/five-seat-full-parity-qa-20261113`.
- Application: published `https://staging.oleaconnects.com` for the baseline journeys; local build of this branch for fixes before deployment.
- Database: Supabase development project `tweeaxnawemykedrxsar`. The migration ledger matched 131 local and 131 remote migrations, with no missing entries, before the tests. No Docker or production data was used.
- Reference HTMLs: the eight module files in `/Users/brunobacelar/Downloads` and the four Board Evaluation files in `Board Toolkit Deliverables`. These files were treated as reference data.

## New-organization journey

The authenticated Playwright scenario in `tests/e2e/five-seat-html-parity.spec.ts` provisioned a fresh Canopy organization in the development Supabase, completed its brand setup in the published staging UI, and invited and activated five additional accounts through the staging invitation workflow. It checked six active people out of 15 Canopy seats, owner/Chair/Executive/member roles, the brand values saved in Supabase, navigation to the six audited modules, and brand settings after reload. The owner uploaded a distinct blue-and-orange SVG logo and entered a custom organization name, two colors, address, phone, email and website. The scenario passed once before the broader regression run, and its cleanup removed the QA organization.

The first account and active Canopy subscription were provisioned by a test fixture so this run would not create a real Stripe charge or depend on email confirmation delivery. The public signup form and legal/checkout progression have separate E2E coverage; this scenario does not claim a completed Stripe payment.

## Three parity passes

1. **Source inventory:** `scripts/qa-html-source-inventory.mjs` rendered the supplied HTMLs in Chromium and recorded 851 source items in `HTML_FIELD_MATRIX_20261113.csv`: 180 annual ED Review keys, 29 Board Calendar `.dc` keys, 39 additional controls from the dynamic Calendar FINAL settings/branding/meeting/contact/invitation forms, 27 staff and 25 partner survey questions/comments/context entries, 144 Strategic Planning fields/checklist items/table columns, 30 stakeholder questions, 53 Board Recruitment skills, 115 Board Evaluation question-bank items, 44 annual and seven meeting questions, 82 Summary controls, and 76 Training lessons/questions/chair-guide sessions. Repeated source controls are recorded with their rendered instance counts where applicable. `BOARD_CALENDAR_FINAL_VIEWS_20261113.json` records the ten distinct views and visible actions. The matrix distinguishes source inventory from app interaction evidence.
2. **Source-data comparison:** `scripts/qa-html-data-parity.mjs` compared 23 datasets and 3,796 individual leaf values from the reference HTMLs with the application data. Strategic modules, survey bank, and the ten English/French Training content and quiz payloads had exact JSON equality. Staff and partner question IDs, labels and order matched, as did their visible guidance and prompt metadata. Recruitment's 53 built-in skills matched in order. All 115 Board Evaluation bank questions, 44 annual questions and seven meeting questions were found in the rendered source HTML. `tests/unit/ed-review-html-all-fields.test.ts` verified that each of the 180 annual ED source keys changes a distinct imported archive value.
3. **Authenticated behavior and output:** The published-staging regression run covered save/reload, role gates, mobile, English/French, survey submission, action planning and exports: 48/51 passed in the loaded first run; the remaining three passed independently immediately afterward. A separate published-staging test imported all 180 annual ED keys through the UI, saved in Supabase and verified their presence in the archive export. Fifteen additional staging tests covered signup, the ED and Strategic branded PDFs, and source-field import. The original HTML sometimes allows manual entry of values that the application calculates from real responses (for example Board Evaluation response count and average); their outputs are present but the interaction differs to protect data integrity and small samples.

## Branded documents and fixes

The custom-branded PDF checks and final staging smoke found these defects:

| Finding | Correction on this branch | Verification |
| --- | --- | --- |
| Board Evaluation kept “Download branded PDF” disabled after a successful Save until the page was reloaded. | Compare the full report state with the last successful-save snapshot, including custom controls. | Authenticated local app + development Supabase PDF test passed immediately after Save; a second edit disabled export until saved again. |
| Board Calendar meeting-document PDF omitted the brand's address, phone, email and website. | Pass the shared branded footer to the PDF renderer. Board Evaluation PDF receives the same footer for consistency. | Calendar PDF was downloaded and its first page was visually inspected: uploaded SVG logo, blue primary color, orange accent, organization name and contact footer were present. |
| Calendar FINAL applies the organization's colors and logo to the portal, but the app's calendar navigation used Olea colors. | Show the saved logo and organization name in the calendar header; use primary color for the active tab and secondary color for the accent and meeting count. | Authenticated local app + development Supabase test checked the logo and the active tab's exact CSS color. |
| Calendar FINAL has three document-security controls absent from the app settings. | Add persisted acknowledgment, download audit and generated-PDF reader watermark controls, defaulting to enabled for existing calendars; honor the selected values on the server. | Authenticated local app + development Supabase test unchecked all three, reloaded, exported an approved consent agenda without acknowledgment, verified the watermark was absent and found no download audit row. Default-on export and acknowledgment were retested. French labels and the 390 px layout also passed. |
| Concurrent staging PDF exports intermittently returned HTTP 500 while the shared Chromium executable was being inflated (`spawn ETXTBSY`). | Retry only this temporary Chromium launch error with a bounded backoff; preserve other errors. | Five-seat staging smoke exposed the defect (7/8 scenarios passed); Vercel runtime log identified `ETXTBSY`. Three focused retry tests, TypeScript, lint, full unit suite and production build passed. Published-staging retest is pending. |

The PDF test checks Board Evaluation, Board Calendar, Board Recruitment, Strategic Planning and ED Review annual exports. First pages of all five PDFs were rendered and visually checked: the uploaded logo, blue primary, orange accent, organization name and contact footer were visible. The Board Training certificate is an Olea-issued certificate: it names the member's organization but intentionally uses the Olea issuer's visual identity; it is not an organization governance report.

## Results and limits

- `npm run typecheck`: passed after the final Chromium fix.
- `npx vitest run`: 125 files and 606 tests passed after the Chromium fix, including all three new retry cases.
- Focused ESLint: zero errors; remaining size/complexity warnings in large existing module files. Extracting the security controls removed the new file-size warning.
- Authenticated published-staging regression: 48/51 passed in the loaded run, then the three timing failures passed in 2.1 minutes when rerun alone. The two Recruitment CRUD scenarios ran near the prior 30-second limit; their suite timeout was increased to 90 seconds for the remote environment.
- Authenticated published-staging source/signup/PDF addendum: 15/15 passed.
- Authenticated local app + development Supabase branded documents: 5/5 passed. Calendar security settings and default-on PDF regression passed in a later focused run.
- Production-mode Next.js build: passed after the final Chromium fix.
- A read-only development Supabase query found one orphaned QA organization from an interrupted test run; its exact fixture identity was checked, then its subscription, brand, membership, profile and auth user were removed. A second query found zero QA organizations created since this task started.
- Initial smoke after PR #119 was merged into staging at `b40b3c3` (`dpl_B3j4t4zNwdzjeoQUMNjzZ4ZAmz6n`): 7/8 passed, including the five-seat journey and four branded PDF/security scenarios. Strategic Planning PDF failed with the Chromium launch race described above. Final post-fix smoke and deployment reference: pending.

This audit checks source content and selected real user journeys. It does not claim that every one of the 851 source items was individually clicked by a browser, that page pixels are identical to the standalone HTML, or that a French native speaker reviewed every translated sentence. The standalone Calendar's Google/Outlook sync controls and destructive "reset demo" control remain excluded by the user's earlier direction; the app exports `.ics` for manual import. The invitation name is collected when the invitee accepts rather than before the invite is sent. The matrix and automated checks make these interaction differences explicit.
