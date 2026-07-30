# Issue #61: ED/CEO Review Surveys Test Plan

## Risk model

This feature handles confidential leadership feedback. The primary failure modes are respondent re-identification, accidental disclosure across organizations, an unauthorized reviewer opening data, a survey continuing after closure, and sending identifiable or malicious content to the AI service.

## Automated coverage

| Area | Scenario | Test layer | Status |
| --- | --- | --- | --- |
| Anonymous feedback | A shared staff link accepts a partial response after explicit confirmation | Playwright E2E | Implemented |
| Anonymous feedback | At least one rating is required | Client + Zod/SQL contract | Implemented |
| Anonymous feedback | Unknown questions, staff partner-context, identity-bearing payloads, invalid JSON, and cross-origin requests are rejected | Vitest API/domain | Implemented |
| Privacy | Response schema has no user, email, recipient, IP, UA, client timestamp, or response-to-delivery join | pgTAP + migration review | Implemented |
| Privacy | Comments are scrubbed at submission and again before the AI call | Vitest domain/AI | Implemented |
| AI controls | OpenRouter uses ZDR/provider constraints and strict JSON output; malformed output fails closed | Vitest | Implemented |
| Authorization | Normal member is denied; explicit HR assignment grants scoped access | Playwright E2E + RLS pgTAP | Implemented |
| Reviewer access lifecycle | A reviewer can be assigned, read, changed from HR to Board Chair and back, then revoked; each step verifies the persisted record has one role only | Playwright E2E + pgTAP | Implemented |
| Reviewer access integrity | A reviewer cannot receive a second role in the same cycle; the legacy duplicate migration retains Board Chair and removes the redundant role | Migration + pgTAP + staging smoke | Implemented |
| Reviewer concurrency | A stale reviewer card fails safely after another session revokes that access, reloads the list, and explains what changed | Playwright E2E | Implemented |
| Reviewer safeguards | The final Board Chair cannot be demoted or removed; a non-Chair cannot manage access; recovery is limited to active workspace owners/admins | Playwright E2E + pgTAP | Implemented |
| Authorization | Only Board Chair can control cycle lifecycle, reviewer assignment, compilation, edits, and approval | Server-action access checks + UX gating | Implemented; requires staging smoke |
| Lifecycle | Open campaign accepts feedback; closed, expired, and archived campaigns do not | SQL RPC + public route | Implemented; E2E regression pending |
| Threshold | Compilation is blocked below the minimum, then creates a versioned audit record at threshold | Server action + UI | Implemented; E2E regression pending |
| Delivery | Generic link email delivery is tracked separately from responses and never joins back to one | Data access review + migration contract | Implemented; staging email test pending |

## Required staging verification before completion

1. Apply the migration to staging and verify `supabase migration list --linked` reports it.
2. Use a real owner session to create/open a campaign and submit an anonymous response from a separate unauthenticated browser context.
3. Confirm a normal organization member sees the restricted screen, then explicitly assign HR and confirm scoped access.
4. Close the cycle and confirm its public link returns unavailable and submission is rejected.
5. Submit enough non-identifying responses to meet the configured threshold, compile a summary with the configured OpenRouter model, inspect the audit record, edit it, and approve it as Board Chair.
6. Send one campaign email in the target environment and verify it does not expose a recipient-specific response identifier.
