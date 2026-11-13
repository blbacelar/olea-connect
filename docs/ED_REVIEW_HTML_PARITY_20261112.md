# ED / CEO Annual Review HTML parity audit

Source: `/Users/brunobacelar/Downloads/index_ED-CEO Annual Review (1).html` (embedded template and controller inspected on 2026-11-12). Target: `/modules/ed-review/annual` and the existing ED Review survey flow. This is a field and behavior inventory, not a production release claim.

| HTML section | Source fields and controls | Olea implementation |
| --- | --- | --- |
| Cover & Setup | Organization; period; ED and Chair names; review date; years in role; five 360° source checkboxes (self, board, staff, partners, stakeholders); themes summary | `cover` schema, section form, saved to `ed_review_annual_general`. Staff and partner feedback campaigns are linked prominently from the ED Review overview. |
| ED Self-Assessment | Repeatable competencies with name, weight, description, linked KPIs, ED rating, evidence; strengths, development, KPI commentary, summary | `competencies`, `selfNarrative`; add/remove, rating, weighted score. |
| Board Chair Assessment | Same competencies with Chair rating/evidence; strengths, development, KPI commentary, summary | `chairNarrative`, Chair ratings/evidence; role-restricted edit. |
| Scoring Summary | ED/Chair weighted scores, overall gap, per-competency weight/ratings/gap/interpretation, weight warning | Calculated from saved competencies; zero/blank ratings excluded; warning for non-100% weights. |
| Compensation & Bonuses | Salary, last salary review, last adjustment, total package, Chair score, editable five-band matrix, recommended adjustment and salary, effective date, rationale, Board approval date/by/minute reference, milestone bonus register and total, CFO name/email/link/preview | All captured, server validated, permission gated, branded PDF/JSON export. Milestones support Not started, In progress, Achieved, Paid; legacy Pending values remain readable. CFO preview projects a compensation-only view on the server; actual access requires assigned role and sign-in. |
| Professional Development | Repeatable SMART goals (goal, measure, relevance, competency, due, progress), growth goals (area, goal, method, date), external activities (activity, provider, dates, cost, approval), ED/Chair reflections, commitments, organization investment | `development` schema/form and sum of external cost; add/remove and save. |
| Future Remuneration | Optional section; purpose, why, structure, threshold, share, vesting, conditions, cap, current status, target date, Board notes | `futureRemunerationEnabled` and `future` fields in compensation store; hidden for unauthorized roles. |
| Agreed Actions & Sign-off | Repeatable action/detail/owner/due; overall judgement, key message, priorities, Chair/ED names/dates; confidential Board in-camera pack | `signoff` schema/form; full branded PDF action for Chair/full editor. |
| Document controls | Automatic save, import/export editable JSON, Print/PDF, six role views (full, Chair, ED, admin, HR, CFO), CFO sharing | Server-side save after field blur and explicit Save; full editor JSON archive export and import of both app and standalone HTML formats; branded PDF; six role matrices (organization owner gets full editor access); HR access requires migration `20261112212500_ed_review_annual_hr_role.sql`. |

## Survey clarification

The supplied annual-review HTML contains **no staff or partner survey questionnaire**. Its Cover page says those surveys are completed separately and summarized in the annual review. Olea already has tokenized, anonymous staff and partner survey campaigns in ED Review. The overview now exposes direct Staff and Partner survey actions. The partner questionnaire's fourth inclusion question matches the existing database column.

## Verification and remaining gate

- Unit: ED annual, domain, and public middleware tests passed on 2026-11-12, including standalone export import, French source defaults, and anonymous route allowlisting.
- Focused ESLint: 0 errors; maintainability warnings remain in large pre-existing/ported modules.
- Full `npx tsc --noEmit` passed.
- Authenticated `next start` E2E against development Supabase: annual document 3/3 passed, including all eight sections, archive round trip, branded PDF bytes, role boundaries, 390px layout, and French default guidance. Focused staff and partner anonymous survey E2E 2/2 passed on the same development environment.
- Development Supabase has the annual HR access migration. Do not infer published staging parity until the integrated deployment and its authenticated smoke checks finish.
