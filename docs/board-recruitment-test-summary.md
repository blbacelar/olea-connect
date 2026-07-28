# Board Recruitment Toolkit Test Summary

## Coverage

The automated coverage includes:

- Happy path: open the tenant-scoped toolkit and navigate all six tabs.
- Roster CRUD: create, edit, deactivate, and delete a member.
- Committee CRUD: create, rename, assign members, set a chair, and delete a committee.
- Skill CRUD: add and remove a custom skill.
- Survey workflow: active director eligibility, invitation status, preview responses, and response status transition.
- Report modes: identified and anonymous views.
- Public access: invalid and unavailable survey tokens.
- Isolation: test records use per-run markers and the fixture cleanup removes them after the test.
- Validation and authorization: server actions validate input and resolve the workspace from the authenticated organization; the public response path validates the signed token, expiry, active director, exact skill set, and boolean answers inside one database transaction.

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
