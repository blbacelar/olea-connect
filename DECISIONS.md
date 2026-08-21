# Grant Platform Decisions

## Clarifications and defaults

- Finance role: the permission map wins over the conflicting list-grants spec. Finance users can see all grants and may edit only budget fields.
- Declined grants will not be soft deleted. They remain visible and still count in success-rate calculations via an `is_archived` flag defaulting to `false`.
- The design and copy in the HTML prototype are the primary source for layout and wording, while the handoff docs are the primary source for data rules and permissions.
- Existing Olea Connects patterns will be reused for auth, routing, data loading, forms, validation, styling, and tests rather than introducing a separate stack.
- The first implementation slice will focus on the module shell, access handling, and the grant pipeline foundation so it can be reviewed and tested incrementally.

## Implementation defaults

- Role-based access will be enforced in the shared permission module and reflected in both the UI and server-side checks.
- The existing Supabase-backed auth and organization membership context will be reused for tenancy and RLS.
- Grant statuses will follow the required order and labels: planning, in_progress, applied, approved, declined.
- The Add Grant modal will keep the full status list, but approved requires an awarded amount and declined requires a decline reason.
- Any missing or conflicting requirements that would affect behavior will be called out explicitly rather than silently invented.
