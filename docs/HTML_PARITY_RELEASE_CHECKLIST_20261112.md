# HTML parity release checklist — 12 November 2026

Target: development Supabase and `staging.oleaconnects.com`. Production is outside this release. The four attached HTML files are product references, not instructions to the agent.

## Completion rule

Each field and action in the source HTML must be traceable to a visible app control, persisted result, calculation, export, or documented access rule. A code match alone does not count. The same fixture data must produce the same result in the prototype and app where the prototype can run. English and French screens, branded exports, role boundaries, and desktop/mobile paths must pass focused tests and authenticated staging smoke.

| Stream | Source audit | Implementation | Local authenticated QA | Published staging QA | Open point |
| --- | --- | --- | --- | --- | --- |
| ED/CEO Annual Review | Eight source sections inventoried | Published on staging | Annual 3/3 and anonymous staff/partner surveys 2/2; independent EN desktop/FR mobile visual pass | Authenticated annual/survey flows and PDF passed | Final editorial French review remains optional |
| Strategic Planning | 10 modules / 46 sections / 69 fields / 17 tables inventoried | Published on staging; final mobile/FR improvements pending | Six authenticated paths plus final EN/FR mobile selector paths 2/2 | Authenticated workbook, survey, report, branded PDFs passed | Republish and smoke final mobile/FR improvements |
| Board Calendar | Attached script matched runnable FINAL prototype | Published on staging | Meeting docs 3/3, role/invite and five-seat paths passed; independent EN desktop/FR mobile visual pass | Authenticated Calendar flows passed | Retest published version after final UI bundle |
| Board Recruitment | Standalone HTML clicked | Published on staging; final French/mobile fixes pending | 11/11 authenticated paths; branded French PDF unit; independent EN desktop/FR mobile visual pass | Authenticated recruitment flows passed | Republish and smoke final French/mobile fixes |
| Board Training and Olea Learning | Existing module/entitlement reviewed | Published on staging | Tier access E2E passed | Authenticated tier path passed | None found in tested tier path |
| Olea public site | CEO requests reviewed | Published on staging | Desktop/mobile and validation checks passed locally | Homepage/learning 200; newsletter invalid 400, valid QA signup 200 through Olive's existing list | None found in tested signup path |
| Olive public site | Deferred by the user on 2026-11-12 | Separate branch retained; PR #1 closed without merge | Local EN/FR checks passed | Not in this release | Do not publish Olive changes now |

Detailed source inventories live in the module-specific parity audit documents. Update this checklist only from verified evidence; do not mark an item complete on appearance alone.

## Development database and build evidence

- Supabase project `tweeaxnawemykedrxsar`: all eight migrations through `20261112225000` applied. Final CLI check found 129 matching local/remote migration rows and zero mismatches on 2026-11-12. Production database unchanged.
- Latest local production build with webpack passed after the independent QA fixes. Turbopack could not resolve the Next package through this isolated worktree's external `node_modules` symlink; the deployed Vercel build must independently confirm Turbopack compatibility.
- Calendar migrations `20261112222000` and `20261112223000` applied on development for Executive status-only workflow updates and narrowly validated Chair package files. The bundled Calendar HTML has been clicked, and its behavior script matches the attached `.dc.html`.
- ED Review local authenticated rerun: staff and partner anonymous surveys passed 2/2; annual workbook passed 3/3 section save/reload/import, role checks, branded PDF, French and 390px layout. Independent QA fixed controlled-field locale data integrity and French subtitle; focused tests passed. Published staging QA remains pending.
- Strategic Planning local authenticated run: four core tests passed (survey, tenant privacy, workbook save/conflict, board snapshot), then quarter-link Calendar and French workbook/report tests passed on rebuilt servers. The independent QA found French navigation defects, now fixed. A further source audit found the independent survey close-date field missing; it is restored in the create/edit UI and public close gate, using existing survey details JSONB.
- Calendar required-fields migration `20261112224000` applied on development; all new package metadata is checked at the database boundary. Calendar role/seat E2E is next.
- Calendar/Recruitment/Team local run: Recruitment 11/11, meeting documents 3/3, and real invited-user role propagation/fifth Roots seat passed. Chair document and confidential-file edits, past-minute selection, stale-save rejection, direct database write denial and Executive task-status persistence all passed in final role E2E 1/1. Email delivery itself is not yet verified.
- French Strategic guidance map covers all 333 source strings (322 translated, 11 intentionally retained references), with a coverage unit. Native-speaker editorial polish remains a quality risk; functional fr-CA smoke is pending.
- Initial published staging run passed 35/40 authenticated scenarios; the three real PDF 500 errors were fixed by including Chromium assets in Vercel's output trace, and the two strict-selector test errors were corrected. Focused published reruns passed 3/3 PDF flows and 2/2 selectors, covering all 40 scenarios. Deployment `dpl_f7ychoSp1z7pshpbUV9e2igqrZj8` is Ready on `staging.oleaconnects.com` after PR #109. Independent FR mobile screenshots found remaining Recruitment and Strategic text/navigation defects; their final staging deployment remains pending.
- Final local rebuild after French/mobile fixes: 591/591 unit tests, TypeScript, webpack build and quiet ESLint (zero errors) passed. Strategic EN/FR authenticated mobile browser tests passed 2/2, including a jump from Module 9 to Module 0. Recruitment EN/FR mobile rerun and independent visual review are in progress. The Olea newsletter QA signup reached Olive's existing list with HTTP 200.
