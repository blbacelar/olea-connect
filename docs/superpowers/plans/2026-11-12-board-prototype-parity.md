# Board prototype parity plan

Date: 2026-11-12
Branch: `codex/board-prototype-parity-20261112`
References: `Board Calendar System FINAL.html` and the four HTML files in `Board Evaluation Survey Templates FINAL.zip` under the user's Downloads directory.

## Objective

Recreate the final Board Calendar and Board Evaluation prototype behavior in the existing English/French Olea Connects application, preserving real persistence, authorization, privacy, and report branding. Diagnose the stale/missing staging view before deploying any fix.

## Assumptions and constraints

- Prototype localStorage, fake email delivery, fake PDF/downloads, and fake integration switches are behavior references, not production services.
- Use existing organization brand settings and Supabase remote development project. Do not use Docker.
- Preserve existing Calendar capabilities beyond the prototype (AGM milestones, workspace permissions, real package uploads, exports).
- Never claim integrations connected without working credentials. Existing Google/Outlook OAuth setup is pending.
- Board Evaluation's anonymous survey design supersedes its current identity-linked response flow. Treat old response data carefully; do not expose raw replies.

## Feature inventory and implementation order

### 1. Stage diagnosis and baseline

- [x] Confirm the final local HTML files and inspect the rendered Calendar recurrence/email controls.
- [x] Confirm staging deployment exists and test accessible account; current IAB member session redirects to subscription due to absent activation.
- [x] Record staging deployment SHA and remote development migration state.
- [x] Record exact currently visible features under a correctly entitled staging account.

### 2. Board Calendar

- [x] Monthly meeting series (3/6/12), per-meeting prep generation, stable IDs/date handling, and task regeneration.
- [x] Date-only notification review/automatic/none, pending count, actual Resend delivery, audit/failure states.
- [x] Member RSVP and meeting roster, wired into agenda/minutes.
- [x] Meeting detail and document template parity: draft, edit, decisions, actions, approval, generated branded PDF.
- [x] Confidential acknowledgment, access audit, and document watermark; JSON backup.
- [x] Directory and invitation behavior, settings, branded exports, role behavior, EN/FR. Calendar integration setup accurately reports pending OAuth credentials.

### 3. Board Evaluation

- [x] Persisted administrator guide/question bank and selection tracker.
- [x] Annual survey with 10 sections, final wording, 1–5/N/A, open questions, progress, draft resume, shared anonymous URL, completion state.
- [x] Anonymous post-meeting survey with seven ratings, optional comment, meeting link/QR/agenda text, draft resume.
- [x] Protected collection API, tenant isolation, anonymity, response thresholds, small-board suppression, safe reporting of open-text themes.
- [x] Administrator-only summary and action plan: response rate, section scores/flags/trends, three priorities, year-over-year record, branded export.
- [x] English/French UI and content, including responsive, keyboard, focus, empty/loading/error/success states.

### 4. Verification and delivery

- [x] Focused unit and integration tests for calculations, privacy, access, persistence, and regressions.
- [x] Typecheck, lint, build, and relevant browser end-to-end paths.
- [x] Supabase development migration state and authenticated remote smoke, including data reload.
- [ ] Visual/interaction QA against both original HTMLs and staging (desktop/mobile, EN/FR).
- [ ] Deploy to staging and verify published build and data paths. Update `docs/WORK_LOG.md` with evidence and references.

## Current evidence

- Calendar HTML creation with three monthly meetings on 2026-11-20 raised meeting count from 5 to 8 and generated 18 tasks; email queue count rose to 8. Its detail button threw a TypeError in the prototype, so production should preserve the intended meeting detail behavior rather than this defect.
- Existing Calendar implementation has task rules, meeting document templates, uploaded packages, PDF and ICS; it does not expose monthly recurrence, per-meeting task toggle, date-email queue, or RSVP.
- Existing Board Evaluation has nine fixed identity-linked rated questions; the final HTML package specifies four distinct screens and anonymous surveys.
- Local implementation covers monthly series, date notices, RSVP, four meeting-document kinds, anonymous annual/post-meeting surveys, question bank, aggregate reporting, branded PDF, and shared-link email invitations.
- A complete Vitest run passed 545/545; typecheck, full lint, and build passed after the functional and localization edits. The final singular-notification copy edit requires a focused recheck before staging.
- The Supabase development dashboard for `tweeaxnawemykedrxsar` is accessible in Chrome. Its migration list contained 13 remote-only November 9 migrations, now restored to source control. The CLI is authenticated and the new migration has been applied only to development.
- The 13 remote-only November 9 migrations were downloaded from `supabase_migrations.schema_migrations` and reconstructed byte-for-byte from their archived statements, then added to this branch's migration directory. Development has zero RSVP rows, zero toolkit surveys/responses, and one legacy Board Evaluation cycle. The deployed staging alias showed deployment `dpl_95pmdPERsVuqPvbmuxmNwdAeMmqW` in Chrome on November 12. The previous available IAB session redirected to billing, and the Bacelar Digital Tech Chrome profile redirected to `/login`; neither is an authenticated feature smoke.
- Development RLS denies members access to full Board Calendar template instances. Server loading now filters Calendar data before serialization; RSVP and document server actions use explicit organization checks and the existing table shape. Calendar members cannot download drafts or full exports. Local build, typecheck, focused lint, and 544 unit tests passed after these changes. No migrations or code from this branch have been deployed.
- Authenticated staging still cannot be assessed in the available IAB member session because it redirects to `/subscription?billing=required`. No published parity claim is valid yet.

- Development OAuth and migration completed at 15:00 local time; CLI dry run included only the new Board Evaluation migration. Authenticated browser QA against development covered Calendar create/delete/recurrence/prep/RSVP/document/PDF/audit and annual/meeting anonymous evaluation, suppression, report export, bilingual form, and mobile layout. The meeting document init crash, attendance fetch race, and scoped directory RPC were fixed during this smoke. Full local build, typecheck, lint (0 errors), and 545 unit tests passed. Staging deployment and published smoke remain pending.
