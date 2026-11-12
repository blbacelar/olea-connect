# Olea Connects UX review, feature by feature

Started: 2026-11-11 (Pacific time)
Branch: `codex/ux-laws-project-review` (from `origin/staging`)
Source: [Leandro Rezende UX, “20 leis de design para vibecoders”](https://www.instagram.com/p/DfcPnaPDOXP/)

## Scope and method

The reel uses examples of clear primary actions, familiar placement, fewer simultaneous choices, grouped fields, rapid feedback, progress, helpful defaults, error prevention and recovery, and a clear end to a task. These are review heuristics, not absolute rules. Apply them to Olea's actual tasks and users. The source's examples are not Olea product requirements.

For every feature, check the normal path, a loading state, an empty state, validation, a recoverable failure, keyboard operation, mobile layout, and both `en-CA` and `fr-CA`. Record the concrete issue and the verification result before checking off a row. Keep membership, authorization, and data semantics unchanged unless a separate functional change is required and tested.

## Principles observed in the reel

| Principle | Practical check in Olea |
| --- | --- |
| Hick | Present a small number of meaningful next actions at each step. |
| Fitts | Make the main action easy to reach and give controls adequate target size. |
| Jakob | Put familiar navigation and controls where users expect them. |
| Miller | Group long forms and information into understandable chunks. |
| Proximity, similarity, common region | Keep related content together and give equivalent actions consistent visual treatment. |
| Doherty | Confirm that an action started or finished without leaving people guessing. |
| Von Restorff, serial position | Make the primary action recognizable without making everything compete for attention. |
| Peak-end, goal gradient, Zeigarnik | Show progress and make completion or unfinished work clear. |
| Tesler | Let the system do work it can do safely; avoid asking users to repeat known information. |
| Defaults | Use helpful, transparent defaults; avoid preselecting consequential choices. |
| Nielsen error prevention and recovery | Constrain invalid input and explain how to fix a specific problem. |
| Parkinson | Keep the path to the main task direct; disclose advanced controls when needed. |

The reel also references progressive disclosure. Its visual sequence repeats Fitts for different contexts. We will not treat the video's number of labels as an independent compliance score.

## Feature review tracker

Status: `queued`, `auditing`, `fixing`, `verified`, or `blocked`. “Verified” requires the recorded checks, including French.

| Feature family | Routes / components | Status | Findings and change | Verification |
| --- | --- | --- | --- | --- |
| Shared shell and feedback | `AppShell`, sidebar, header, `app/error.tsx`, `app/loading.tsx` | fixing | Error/loading boundaries had English-only copy; now use EN/FR, clear retry text, alert role and reduced-motion loading. Small buttons, icon buttons and select options now have 44px targets. | Build, unit suite and desktop/mobile route inventory passed; manual keyboard and French error-state review remains. |
| Public site and demos | `/`, `/demos`, `/sponsorship`, legal/help | auditing | Route inventory found no browser exception or horizontal overflow. Podcast episode title in English was a false positive in the French UI text audit, not navigation copy. | 40 public route/viewport observations passed; task-level review remains. |
| Signup and authentication | `/signup/**`, `/login`, password and email flows | fixing | Login/reset now explain expected email format, show inline field errors and prevent blank login submission. Password update guidance and toggle target improved. | Two EN/FR auth E2E cases passed; signup/payment and email-delivery paths remain. |
| Onboarding and workspace | `/onboarding/**`, `/dashboard`, `/team`, `/users` | auditing | Template selection availability dates and team invitation dates now follow locale. | Route inventory passed; next-action, authorization and keyboard paths remain. |
| Board Calendar | `/modules/board-calendar`, package workbench | fixing | Document dialog now warns before discarding an unsaved draft and offers an explicit discard action. | Two critical document E2E cases passed on development Supabase; other event/workflow paths remain. |
| ED Review and board evaluation | `/modules/ed-review`, `/modules/board-evaluation`, surveys | auditing | ED Review error boundary and compilation dates now follow locale. | Route/tab inventory passed; confidential survey, evaluation and export paths remain. |
| Board Training | `/modules/board-training/**` | auditing | Main route loaded in authenticated desktop/mobile inventory. | Course progress, assessment, certificate, invitation and French audio paths remain. |
| Grants and strategic planning | `/modules/grant-platform`, `/modules/strategic-planning` | auditing | Grant Pipeline screenshot showed five same-weight actions; Add Grant now has primary visual weight. Grant amounts/deadlines now format by locale. | Ten Grant Platform tabs loaded; grant draft create/edit/delete and calendar persistence passed. Strategic task flows, brand export, mobile and keyboard paths remain. |
| Other modules | accreditation, recruitment, KPI dashboard | auditing | Error boundaries localized; tab inventory loaded accreditation, recruitment and KPI tabs. Accreditation now keeps the unsaved status choice and shows EN/FR inline validation before an invalid submission. A global 44px select-option change made a Board Calendar menu unreachable and was reverted; 44px select triggers remain. | Accreditation settings/evidence and Board Recruitment access/CRUD/branded export passed. KPI save/edit/archive passed on isolated rerun. Other edit/export paths remain. |
| Community and programs | `/community`, `/webinars/**`, `/consulting`, `/sponsors` | auditing | Several visible dates and CAD amounts now format for EN/FR. | Route inventory passed; submission, validation and confirmation paths remain. |
| Billing and referrals | `/subscription`, `/referrals/**`, settings | auditing | Billing/referral/integration dates and displayed CAD amounts now follow locale. | Route inventory passed; purchase/upgrade, referral and permission paths remain. |

## First implementation pass and evidence

- Build and TypeScript passed after the shared changes; 523 unit tests passed.
- Focused ESLint completed with zero errors and 27 complexity/file-size warnings, mostly in existing large components. The final repository-wide lint completed with zero errors and 212 warnings.
- Authenticated development Supabase smoke passed for Board Calendar document create, persist, approve, export and package, plus event deletion; login validation passed in English and password-reset validation in French.
- Public inventory covered 40 route/viewport observations and authenticated inventory covered 60; both passed at desktop and mobile width. Module-tab inventory clicked 37 tabs across six modules and passed. These inventories detect load, browser exceptions and horizontal overflow; they are not full task-flow tests.
- Development Supabase migrations were checked before the authenticated tests: 106 local versions matched remote, with 15 remote-only versions and no local-only migrations. This work adds no database migration.
- A French UI string sweep covered 44 routes and passed. Its initial one finding was the title of an English-language podcast episode, explicitly labelled as such. The matcher was narrowed to exact navigation labels.
- Five existing axe accessibility tests passed. The Board Calendar full CRUD scenario passed after reverting the select-option height that had moved a menu outside the viewport. Board Recruitment's denial scenario passed after updating its expected error-boundary copy.
- The critical module suite had 30/34 initial passes. Accreditation and Board Calendar were fixed and passed on isolated reruns; the permission test expectation was updated and passed; KPI passed on isolated rerun. These fixes were not followed by a full 34-test rerun.
- Community, consulting, webinars, billing and referral suite had 50/54 initial passes, two failures caused by missing local `CRON_SECRET` and Stripe test key, and two cases not run. The three community cases passed after adding a disposable local cron secret; the Stripe case passed using an existing local Stripe **test** key. No Stripe live key was used.

## Remaining work, ordered by user task

1. Finish the full grant workflow in both languages and verify the branded export; primary Pipeline action is now visually distinct.
2. Exercise Board Calendar event, workflow and package paths beyond the tested document flow, plus ED Review and Board Training task completion in both languages.
3. Exercise forms, keyboard flows, empty/error states and authorization for the remaining feature families above. Record and fix concrete findings here.
4. Run the full French audit, targeted accessibility checks and final regression suite after the last source edit. Push a review branch only when required checks pass.

The 44-route French sweep checks a defined set of frequent English UI labels; it does not prove full translation of every module state. Accreditation, grants and the remaining module task flows still need manual French interaction review. The current first pass remains local to the review branch and has not been deployed or merged.

## Working agreement

- Keep this document current as each feature is audited and changed. Do not mark a feature `verified` on code inspection alone.
- Implement English and French together; avoid relying on runtime translation for a newly written critical control.
- Use shadcn interactive components and Lucide icons, as required by `AGENTS.md`.
- Run proportionate focused checks, then a broad regression and authenticated staging smoke before merging. Use Supabase for database-backed tests; do not use Docker.
- Keep production unchanged during this review until the feature tracker is complete and the release checks pass.
