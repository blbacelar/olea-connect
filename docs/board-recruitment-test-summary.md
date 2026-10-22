# Board Recruitment Toolkit Test Summary

## Coverage

The automated coverage includes:

- Happy path: open the tenant-scoped toolkit and navigate all six tabs.
- Roster CRUD: create, edit, deactivate, and delete a member.
- Committee CRUD: create, rename, assign members, set a chair, and delete a committee.
- Skill CRUD: add and remove a custom skill.
- Skill assignment: add and edit a director's skills from the member dialog,
  reassign skills, and recalculate single-holder risk after deactivation.
- Term rules: edit all four bylaw controls inline in Board Terms, persist them,
  verify navigation stays on the same tab, and confirm the controls are not
  duplicated in Workspace Settings.
- Survey workflow: active director eligibility, invitation status, preview responses, and response status transition.
- Report modes: identified and anonymous views.
- Public access: invalid and unavailable survey tokens.
- Isolation: test records use per-run markers and the fixture cleanup removes them after the test.
- Validation and authorization: server actions validate input and resolve the workspace from the authenticated organization; the public response path validates the signed token, expiry, active director, exact skill set, and boolean answers inside one database transaction.
- Administrative authorization: owners and organization admins can use the
  toolkit; regular organization members are denied by both the server boundary
  and the authenticated E2E regression.

## Prototype parity review

The standalone toolkit was served locally and exercised through all six views:
Overview, Survey & Send, Skills Matrix, Board Terms, Committees, and Board
Report. The production module now matches the important Board Terms behavior:
term rules are visible beside the roster workflow and update the computed
summary after save, while workspace branding/year settings remain separate.

## Verification commands

Run the feature suite with credentials for the linked Supabase project:

```sh
npm run typecheck
npm run lint
npm run test:unit -- tests/unit/board-recruitment-domain.test.ts
npm run test:e2e -- tests/e2e/board-recruitment.spec.ts tests/e2e/board-recruitment-public.spec.ts --workers=2 --reporter=line
npm run build
```

The E2E suite must use the linked preview/test Supabase URL and service-role cleanup credentials. The repository's stale `.env.local` must not be used as a substitute for those credentials.

## Release gate

The feature is not ready to be called complete if typecheck, lint, unit tests, the feature E2E suite, build, migration verification, or an authenticated remote smoke path is blocked or failing. A failure must first be classified as an application defect, test defect, or environment defect.
