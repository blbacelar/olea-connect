# Board Recruitment Toolkit QA Plan

The module is tested as a tenant-scoped workflow. Test data must be created with the isolated Playwright fixture and purged through the fixture cleanup, never by reusing a production roster.

## Happy paths

- Open the module and switch through Overview, Survey & Send, Skills Matrix, Board Terms, Committees, and Board Report.
- Add, edit, deactivate/reactivate, and delete a director and staff roster member.
- Assign skills while adding or editing a director; reassignments update the
  Skills Matrix and single-holder warning.
- Add, rename, assign members to, set a chair for, and delete a committee.
- Add and remove a custom skill; duplicate names are rejected.
- Send one invitation and send invitations to all eligible directors; responded members are never regressed.
- Record a survey response and verify matrix holder/coverage output changes.
- Toggle identified/anonymous report and print/save as PDF.

## Negative and edge cases

- Invalid email, date, hex color, empty name, and out-of-range term rules are rejected server-side.
- Staff cannot be invited to the director survey and inactive directors are excluded from coverage.
- A committee chair must be a current committee member; only one chair can exist.
- A sole skill holder is marked at risk; no-holder skills are recruitment gaps.
- Deactivating a director removes their skill coverage immediately; staff are
  intentionally excluded from the director skills matrix and survey.
- Missing join dates render as “Add join date” instead of producing a false term.
- Survey response writes are idempotent and status cannot move from responded back to invited.

## Authorization and isolation

- Unauthenticated users are redirected to sign in.
- Regular organization members cannot open the administrative toolkit; owners
  and organization admins can access it.
- Every write includes the workspace ID but server-side membership resolution is authoritative.
- Database RLS scopes every table through the parent organization; cross-organization IDs must not be readable or writable.
- Cleanup removes the workspace with the isolated test organization.
