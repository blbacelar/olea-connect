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
- [x] Visual/interaction QA against both original HTMLs and staging (desktop/mobile, EN/FR).
- [x] Deploy to staging and verify published build and data paths. Update `docs/WORK_LOG.md` with evidence and references.

## Final evidence

- The final Board Calendar HTML generated three monthly meetings and 18 preparation tasks. The implemented calendar generated the same six default tasks per meeting, persisted meetings and RSVP, and removed a deleted meeting and its tasks immediately and after reload.
- The four final Board Evaluation HTMLs specify annual and post-meeting surveys. The implementation includes their 44 annual and 7 post-meeting questions, anonymous shared links, question bank, responses, summary/action planning, English and French, and branded reports.
- The development Supabase `tweeaxnawemykedrxsar` had 13 remote-only November 9 migrations. Their archived statements were restored to source control. The new anonymous-survey migration `20261112210000` was applied only to development after a CLI dry run, making 122 applied migrations.
- Development authenticated browser QA used Bruno/ACME Canopy: meeting create/reload/delete, recurrence/preparation, RSVP, document approval/PDF/audit, contact validation and a Resend date email, annual and meeting survey submissions, score suppression, summary/report download, and public closed-survey behavior. The meeting evaluation invitation was accepted by Resend and audited.
- Final local checks: 545 unit tests, TypeScript, full ESLint (0 errors; 256 existing warnings), production build, and diff check passed. The tiny notification singular-copy edit was followed by a new typecheck and build.
- [PR #102](https://github.com/blbacelar/olea-connect/pull/102) merged into `staging` at `42f434349106da7277c5eb4738b4d0c1049bdb22`. Vercel deployment `dpl_3z2QyyVeV3jev6PJ46LLUSfJhjVE` is Ready and aliased to `staging.oleaconnects.com`.
- Authenticated staging smoke loaded both modules without page errors, created/reloaded/deleted a QA meeting (meeting count 3→4→3), verified its exact 2027-02-19 date in the edit form, and inspected English/French mobile pages at 390px without horizontal overflow. Anonymous public annual and meeting URLs loaded; a closed annual survey blocked submission. Branded Board Evaluation and consent-agenda PDFs downloaded successfully from staging and contained the ACME brand; the latter identified its reader.
- Google/Outlook calendar OAuth synchronization remains pending credentials by prior user instruction. The Integrations tab accurately reports this state. Production was not modified.
