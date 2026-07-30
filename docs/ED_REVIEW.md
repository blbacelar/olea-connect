# ED/CEO Review

The ED/CEO Review module supports confidential annual feedback campaigns for
staff and partners, followed by a Board Chair review of an aggregated summary.
It is deliberately separate from ordinary workspace membership: being a member
of an organization does not grant access to its confidential review material.

## Access Model

- The initial cycle creator is assigned as a `board_chair`.
- A Board Chair can explicitly assign an active workspace member as a Board
  Chair or HR reviewer for that review cycle only.
- Board Chairs can change an assigned reviewer between those two roles or
  revoke their access. Privileged-auditor assignments are not managed through
  the workspace UI.
- Every active cycle must retain at least one Board Chair. The UI disables a
  final Board Chair's edit and remove controls, while database functions enforce
  the same rule atomically for concurrent requests.
- Reviewer-access changes are recorded in `ed_review_audit_events`.
- Workspace owners and administrators can recover a cycle with no assigned
  Board Chair by appointing an active member as its Board Chair.

## Survey Privacy

Campaigns generate an opaque, tokenized public URL. The raw token is shown to
the authorized creator only briefly and is never stored. Survey responses are
not linked to platform accounts, recipient email addresses, device data, IP
addresses, or user-agent data. The delivery list is intentionally separate from
anonymous survey answers.

## Operational Flow

1. A Board Chair creates the review cycle and assigns any additional reviewers.
2. The Board Chair creates separate staff and partner feedback campaigns and
   distributes the generated survey links to the intended audiences.
3. Once the configured response threshold is reached, a Board Chair compiles a
   draft summary. AI output is a draft, not an automatic decision.
4. A Board Chair reviews and approves the summary. Access, lifecycle changes,
   and compilation activity remain auditable.

## Verification

`tests/e2e/ed-review-surveys.spec.ts` covers campaign creation, anonymous
responses, authorization boundaries, reviewer role updates, revocation, the
sole-Board-Chair guard, recovery access, and public closure behavior.

`supabase/tests/ed_review_anonymous_surveys.sql` verifies database-level
privacy boundaries and that browser roles cannot call the privileged reviewer
mutation functions directly. It also verifies that the service-side mutation
path cannot remove the final Board Chair.
