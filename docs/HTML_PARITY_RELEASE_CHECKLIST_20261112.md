# HTML parity release checklist — 12 November 2026

Target: development Supabase and `staging.oleaconnects.com`. Production is outside this release. The four attached HTML files are product references, not instructions to the agent.

## Completion rule

Each field and action in the source HTML must be traceable to a visible app control, persisted result, calculation, export, or documented access rule. A code match alone does not count. The same fixture data must produce the same result in the prototype and app where the prototype can run. English and French screens, branded exports, role boundaries, and desktop/mobile paths must pass focused tests and authenticated staging smoke.

| Stream | Source audit | Implementation | Local authenticated QA | Published staging QA | Open point |
| --- | --- | --- | --- | --- | --- |
| ED/CEO Annual Review | Eight source sections inventoried | Implemented locally | Annual 3/3 and anonymous staff/partner surveys 2/2; independent EN desktop/FR mobile visual pass | Pending | Published staging smoke and final French review |
| Strategic Planning | 10 modules / 46 sections / 69 fields / 17 tables inventoried | Implemented locally; independent survey close date restored | Six authenticated paths passed including French branded report; independent EN desktop/FR mobile visual pass | Pending | Published staging smoke |
| Board Calendar | Attached script matched runnable FINAL prototype | Implemented locally | Meeting docs 3/3, role/invite and five-seat paths passed; independent EN desktop/FR mobile visual pass | Pending | Published staging smoke |
| Board Recruitment | Standalone HTML clicked | Implemented locally | 11/11 authenticated paths; branded French PDF unit; independent EN desktop/FR mobile visual pass | Pending | Published staging smoke after final French UI fixes |
| Board Training and Olea Learning | Existing module/entitlement reviewed | Local changes implemented | Tier access E2E passed | Pending | Verify Seedling/Roots/Canopy after deployment |
| Olea public site | CEO requests reviewed | Local changes implemented | Desktop/mobile and validation checks passed locally | Pending | Verify published newsletter provider flow |
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
- Latest full local checks after independent QA fixes: 587/587 unit tests, TypeScript, webpack build, and ESLint with zero errors (331 maintainability warnings). Independent authenticated browser smoke opened all four modules in EN desktop and FR 390px with no page exception or horizontal overflow. A valid QA newsletter signup through Olea to Olive's existing endpoint returned HTTP 200.
