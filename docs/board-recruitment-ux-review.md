# Board Recruitment Toolkit UX Review

## Review scope

The review covers the authenticated toolkit at `/modules/board-recruitment` and the public survey route at `/modules/board-recruitment/survey/[token]`.

## Findings and decisions

- The toolkit is organized into six tabs that match the product workflow: Overview, Survey & Send, Skills Matrix, Board Terms, Committees, and Board Report.
- Member, skill, committee, invitation, and response mutations use focused dialogs so the user keeps context and does not lose the active tab.
- The member-facing survey is separated from the administrative workspace and exposes only the minimum response controls.
- Director-only calculations are separated from staff records. Staff can be assigned to committees but are excluded from survey, matrix, and term calculations.
- Identified and anonymous report modes are explicit controls. Anonymous mode removes holder names while preserving aggregate coverage and succession information.
- Empty states explain what the user should do next instead of presenting blank tables.
- Destructive actions use the shared confirmation dialog and never use a native browser prompt.
- Forms use labels, server-side validation, format hints, and shadcn controls for selects. Dates, emails, and member status values are validated before persistence.
- The tab strip remains horizontally scrollable on narrow screens so controls remain reachable without squeezing data tables into unreadable columns.
- Status, coverage, and risk use text labels in addition to color so the workflow remains understandable without relying on color alone.

## Follow-up risk

The public survey route requires a valid, unexpired, single-use invitation token. Email delivery must be verified in the target environment before release; the application does not treat a queued email event as proof of delivery.
