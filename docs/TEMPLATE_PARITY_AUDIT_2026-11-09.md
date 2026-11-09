# HTML prototype parity audit — Trello 244O54JI

Date: 2026-11-09. Source branch: `origin/staging` at `35c259d`.

## Scope and evidence

The Trello card asks for a comparison of Board Calendar, Board Evaluation, Strategic Planning, and ED Review against the HTML prototypes and developer handoffs in [Templates to add to platform](https://drive.google.com/drive/folders/1uO0KSSfZALUyG_WQhQJhX8j0WM3Wp8Qc). The final source sets reviewed are:

| Module | Reference | Application entry point |
| --- | --- | --- |
| Board Calendar | `Board Calendar System FINAL.html` and `Board calendar management system FINAL.zip` in [Board Calendar Management System](https://drive.google.com/drive/folders/15clrMg3yJAcp3YQO-I2RNwKJuFI_jjrk) | `app/modules/board-calendar/page.tsx`, `components/templates/BoardCalendarWorkbench.tsx` |
| Board Evaluation | Four HTMLs and `README.md` in `Board Evaluation Survey Templates FINAL.zip` in [Board Self Evaluation Templates](https://drive.google.com/drive/folders/1ECSV2N_0EcSrhHEF-xJi_L_zYp8pVSy-) | `app/modules/board-evaluation/*`, `app/templates/board-self-evaluation/*` |
| Strategic Planning | `strategic-planning-workbook.html` v1.2.0, `Strategic-Planning-Workbook-Developer-Handoff.docx`, and `olea-hosted-surveys.zip` in [Strategic Planning Module](https://drive.google.com/drive/folders/1HOgf9ApzRcAk2rf0n0oLIKfoIvjZOxbt) | `app/modules/strategic-planning/*` |
| ED Review | Four final HTMLs and `design_handoff_ed_module` in [FINAL templates for ED Annual review & Surveys](https://drive.google.com/drive/folders/1DxKyOhN9TeFpGR_-0MgkpaqLI2-u0hVE) | `app/modules/ed-review/*`, `lib/ed-review/*` |

I also reviewed the folder-level `HTML_PROTOTYPES_GUIDE.md`, `COMPLETE_DATA_FLOW_DIAGRAMS.md`, and `DEVELOPER_SUMMARY_COMPLETE.md`. Those describe earlier broad concepts; the final module folders above are the primary references when they disagree. The handoffs are source material, not instructions to override this repository's security, UI, or release rules.

**Verification boundary:** I downloaded and inspected the final source files, handoffs, route code, data models, and migrations. The Drive HTML preview displays raw source text rather than executing the prototype. The browser's URL safety policy blocked opening the downloaded `file://` HTML prototypes, so I did not claim to have clicked every control in those standalone files. In the authenticated staging session for the ACME inc Canopy workspace, I opened Strategic Planning, Board Evaluation and its published worksheet, ED Review, and Board Calendar. I checked navigation and rating/status options without creating records. In ED Review, I opened and closed the campaign form and inspected the summary and access/audit tabs. In Board Calendar, I checked all eight tabs, selected November 19, switched month/week/year views, and opened the entry form and type selector without saving. The workspace has no calendar entries or evaluation campaigns, so populated-state calculations, save/reload, deletion, exports, and privacy behavior after response collection remain unverified. Source inspection establishes the missing structures, but does not certify the paths that exist.

## Result

**None of the four modules has complete functional parity with its final HTML set.** The differences are product scope gaps, not merely styling. Do not mark Trello 244O54JI complete or describe the modules as exact copies yet.

### Board Calendar — partial implementation

The prototype contains Dashboard, Calendar, Meetings, Workflows, Board Packages, Directory, Audit Log, Integrations, Settings, and Branding views. The current `moduleTabs` contains the first eight except Integrations and Branding (`components/templates/board-calendar/workbench-options.ts`). The app has real persistence, meeting/document flows, secure file storage, task generation, PDF export, ICS download, and an audit log. This is substantial existing work and should be preserved.

| Reference interaction | Current implementation | Gap / acceptance check |
| --- | --- | --- |
| Repeat a meeting monthly for 3/6/12 occurrences | One meeting per save | Create the requested series, including the first occurrence; test month-end dates, edit, and cancellation. |
| Queue/review/auto-send date-only notices to board recipients | No Board Calendar meeting-email queue or per-meeting notify mode found | Recipient selection, preview, delivery result, failed-send handling, and no internal task data in email. Prototype's success toast alone is not a real send. |
| RSVP as attending/tentative/not attending and show roster | No RSVP state or interaction found | Persist one board member's response and show it in meeting detail and document templates. |
| Integrations for Google/Outlook calendar and sending status | No corresponding tab or OAuth flow found | Connect, sync create/update/cancel, show errors, and protect refresh tokens. |
| Branding panel and reset | No corresponding Board Calendar tab | Verify whether organization branding is intended to replace this exact panel; otherwise add its controls and preview. |
| Confidential acknowledgment and optional watermark | Signed downloads and audit exist | Match the acknowledgment gate and real watermark behavior if enabled; verify access log records successful downloads. |
| Role-specific navigation and private staff workflow | Current workbench renders `moduleTabs` without a role filter and receives the whole template `formData` for any member with template access | Ensure board members cannot fetch staff tasks, internal notes, or settings. A hidden tab alone is insufficient; split or filter data server-side and test direct access. |

The prior [Board Calendar workflow audit](BOARD_CALENDAR_PROTOTYPE_WORKFLOW_AUDIT_2026-09-23.md) has more detail on recurring meetings, task lead times, notices, RSVP, and simulated prototype integrations. Its observations should be rechecked after the current branch's document changes.

**Staging click path:** the dashboard showed zero entries; the Calendar tab selected November 19 correctly and the week view displayed November 15–21. Month, week, and annual views opened. Meetings, Workflows, Board Packages, Directory, Audit Log, and Settings opened and showed their empty/setup states. The Add calendar entry form exposed date, type, category, title, time, location, virtual link, lead contact, confirmation, and notes; type options were Meeting or event, Annual calendar note, Operational task, and AGM milestone. The Add entry button was disabled while required fields were empty. No event was saved, so edit/delete persistence was not tested.

### Board Evaluation — two separate partial paths, neither the four-template workflow

The final reference has (1) administrator question bank and inclusion tracker, (2) an anonymous annual self-evaluation with 10 sections, **44 ratings** and 4 open questions, (3) an anonymous post-meeting survey with 3 groups and **7 ratings**, a shared link/QR, and (4) an administrator results/action plan. The published `/templates/board-self-evaluation` route uses the later v2 dynamic schema with **three ratings and one required reflection** (`supabase/migrations/20260619000140_dynamic_template_renderer_definitions.sql`), as confirmed in staging. It also asks for an administrator and contact email, so it is an identified worksheet, not the anonymous annual submission in the final reference. A richer 38-rating, 8-section editor exists in `survey-editor.tsx`, but that page does not render it. `/modules/board-evaluation` is a different annual cycle with **nine** mandatory ratings and improvement actions.

| Reference interaction | Current implementation | Gap / acceptance check |
| --- | --- | --- |
| Choose questions from admin bank with rated/open/meeting target counts | No question-bank workflow found | Include/exclude questions, persist choices, update target counters and their states. |
| Answer 10-section anonymous annual form, with N/A and resumable draft | Published worksheet has 3 ratings; annual cycle has 9 fixed ratings tied to `respondent_id` | Match exact question set and response behavior; explicitly decide how anonymity and draft resume coexist. |
| Submit post-meeting form from shared meeting link/QR | No corresponding Board Evaluation route or data model found | Publish one meeting link, submit the three groups, comment, and show confirmation. |
| Results and three-priority action plan with trend and response-rate math | Annual cycle shows 9 averages and unbounded improvement actions | Match reference calculations, 3 priorities, year-over-year trend, and privacy suppression. |
| Suppress question results when fewer than five responses | Current `minimumEvaluationResponses` is 3 and `canShowBoardEvaluationResults` shows all nine question averages once a cycle closes | **Privacy priority:** do not expose question-level averages for fewer than five; cover small-board cases. |

The current implementation stores the respondent's account ID to allow updates. The final survey calls for anonymous collection without respondent identity. This is a data-model and privacy decision, not a copy edit; do not migrate or expose old answers without a reviewed plan.

### Strategic Planning — workbook not integrated

The final v1.2.0 HTML is a nine-module workbook with Guidance/Template per module, 3/5-year horizon, organization-size and equity options, stakeholder survey builder and hosted responses, multi-year action plan, quarterly Action tracker, Plan budget, generated strategic plan, board dashboard, board-share snapshots, CSV/Word/HTML downloads, and dated Board Calendar events. The current `/modules/strategic-planning` page has only a plan form and goal cards. Its database has `strategic_plans` and `strategic_goals`; no workbook JSON/version history, hosted survey, snapshot, quarterly tracker, or budget tables/routes were found.

The handoff defines a `postMessage` contract (`ready`, `change`, `calendar`, `board-share`, survey publish/status/results), one saved JSON document per organization, revision-aware merge, a board-only view, and a public anonymous respondent path. No `olea-workbook:*` handler or hosted survey endpoint is present. The handoff's old Canopy/Harvest entitlement note must be reconciled with the current saleable plans; it is not authority to revive Harvest.

**Acceptance path:** enter settings and all nine modules; link goals → priorities → actions; edit a Year 2 action and budget; record two quarterly status/spend updates; carry an unfinished action to the next year; assemble/download the plan; publish a survey and submit anonymously signed out; refresh results; share one quarter and verify the board-only snapshot; confirm its dates appear and later disappear correctly in Board Calendar. Repeat concurrent saves, cross-organization denial, and a 390 px/mobile keyboard pass.

### ED Review — survey collection exists, annual evaluation document does not

The current ED Review has cycles, anonymous staff/partner campaigns, reviewer assignments, compilation, approval, and audit. These are real features and should not be reported as missing. The final handoff additionally specifies an eight-section ED/CEO evaluation document, with ED and Chair competency ratings, weighted score and gap interpretation, salary-band and bonus math, professional-development tables, future-remuneration option, sign-off, JSON import/export, and six server-enforced section access roles. None of that document appears in the current four-tab workspace (Overview, Campaigns, Board Chair Summary, Access & audit) or the `ed_review_*` tables.

**Staging click path:** Campaigns showed zero campaigns; its create form contained title, audience, opening/closing dates, and an optional delivery list, and closed without saving. Board Chair Summary suppressed scores at zero responses and stated three more anonymous responses were required. Access & audit showed the assigned Board Chair and a cycle-created audit event; changing or removing the sole Chair was disabled. This confirms the current empty-state privacy gate and reviewer UI, not the final evaluation document or populated-state calculations.

| Reference interaction | Current implementation | Gap / acceptance check |
| --- | --- | --- |
| Add/remove competencies, set weights, rate separately as ED and Chair | No competency document or rating data | Equal-weight fallback only when no weight is entered; otherwise unset weights count 0; divide by sum of rated-item weights, warn if total is not 100. |
| Recalculate summary gaps and salary recommendation | No weighted scoring or salary-band fields | Verify gap highlight for absolute difference greater than 1, active band, recommended adjustment, and new salary. |
| Six section-specific roles, including CFO compensation-only view | Three reviewer roles (`board_chair`, `hr_reviewer`, `privileged_auditor`) for the current survey workflow | Enforce document section access and compensation isolation server-side; URL role switches must not confer access. |
| Staff survey: 6×3 ratings; partner survey: 4+4+4+3 ratings | Staff has 18 ratings; partner has **14**, with only three Inclusion items (`lib/ed-review/domain.ts`) | Match final question IDs and wording; add the missing fourth Inclusion question without silently rewriting existing responses. |
| Chair consolidation with response rates, staff/partner gap, import, AI theme compilation, and editable narrative | Existing threshold-protected compilation and manual summary | Compare each calculation and control to the final HTML. Preserve anonymity protections and test the less-than-threshold state. |

## Priority and release guidance

1. **Privacy and authorization first:** Board Calendar staff data exposure, Board Evaluation small-group results and respondent identity, ED compensation access. Write tenant and role regression tests before any release.
2. **Complete the missing documents/workbooks:** Strategic Planning v1.2 and ED annual evaluation, then the Board Evaluation four-template flow.
3. **Finish Board Calendar parity:** notices, RSVP, integrations, branding, and recurring meetings. Preserve the app's real file and audit behavior while matching the reference's visible flow.
4. **Run exact click-path QA:** each button/tab/back action, calculation boundary, save/reload, export/import, mobile, and signed-out respondent path against the final HTML behavior and staging. The authenticated empty-state staging navigation above passed; standalone HTML interaction and populated persistence/calculation paths are still unverified.

No application code, schema, production environment, or Trello status was changed by this audit. The findings combine source-verified gaps with the explicitly limited staging observations above; a passing automated suite would not, by itself, establish prototype parity.
