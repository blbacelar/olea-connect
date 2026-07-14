# Observability, Audit Operations, and Recovery

This runbook supports issue #23. It defines how operators detect failures,
trace events, recover service, and rotate secrets without exposing member data.

## Request Correlation

Every request receives an `x-request-id` response header. If an upstream system
already sends a safe `x-request-id`, the app keeps it; otherwise the middleware
generates one.

When a user reports a failure, collect:

- timestamp and timezone
- URL or feature name
- `x-request-id` from the browser Network tab, if available
- signed-in email and organization name
- screenshot of the user-facing error, with private document contents hidden

Never ask users to send passwords, payment details, document contents, auth
tokens, cookies, or full request payloads.

## Structured Server Logs

Critical API paths use JSON logs with these safe fields:

- `timestamp`
- `level`
- `message`
- `service`
- `environment`
- `requestId`
- `component`
- `provider`
- `eventId`
- `eventType`

The logger redacts common secret/content keys such as tokens, passwords, API
keys, authorization headers, signatures, raw payloads, HTML, text, and document
content. Production logs should be searchable by `requestId`, `provider`,
`eventId`, and `eventType`.

## Health Check

Endpoint:

```text
GET /api/v1/health
```

Expected success:

```json
{
  "status": "ok",
  "checks": {
    "database": "ok",
    "supabaseUrl": "configured",
    "supabasePublishableKey": "configured",
    "cronSecret": "configured",
    "appUrl": "configured"
  }
}
```

The endpoint uses the public Supabase key and a catalog-table read. It does not
use service-role credentials and does not return member data.

Alert if:

- status is `degraded`
- HTTP status is `503`
- the endpoint fails from more than one monitoring region

## Critical Alerts

Production alerts should be wired to Vercel logs or the selected log drain for
JSON records where either:

- `level = "critical"`
- `alert = true`
- health check returns HTTP `503`

Initial alert routes:

| Component | Condition | Owner |
| --- | --- | --- |
| Auth/session | repeated login callback or session middleware errors | Engineering lead |
| Stripe webhook | `component = "stripe_webhook"` and `level = "critical"` | Billing owner |
| Email worker | `component = "email_worker"` and `level = "critical"` | Operations owner |
| Attio worker | `provider = "attio"` and `level = "critical"` | Operations owner |
| QuickBooks worker | `provider = "quickbooks"` and `level = "critical"` | Finance owner |
| PDF/export | repeated server errors on template or board-calendar export routes | Engineering lead |
| Database | health check `database = "error"` | Database owner |

## Webhook And Integration Trace

Authorized platform operators can use:

```text
/settings/integrations
```

The page is restricted to `super_admin` users through `platform_user_roles`.

Use it to:

1. Search by Stripe event ID, integration event ID, aggregate ID,
   provider-message ID, idempotency key, or error text.
2. Inspect recent Stripe webhook status.
3. Inspect recent Resend, Attio, and QuickBooks outbox events.
4. View redacted payload previews.
5. Replay failed or dead-letter integration events.

Trace sequence:

1. Search the Stripe `provider_event_id` or checkout/subscription ID.
2. Confirm the webhook was received and processed.
3. Search the related organization/member aggregate ID.
4. Confirm email, Attio, and QuickBooks outbox events are completed.
5. If an outbox event is failed or dead-letter, review the redacted payload and
   error, then replay only after the upstream issue is fixed.

Stripe webhooks themselves are replayed from the Stripe Dashboard or Stripe CLI,
not from Olea Connects. Olea Connects only replays internal outbox events.

## Database Restore Procedure

Before production launch, run and record a restore rehearsal. Minimum evidence:

- backup timestamp
- restore target environment
- restore start/end time
- validation queries
- owner sign-off

Restore rehearsal steps:

1. Confirm the incident scope and freeze risky write operations if needed.
2. Capture the current production backup checkpoint.
3. Restore into a non-production Supabase project first.
4. Validate:
   - auth users exist
   - organizations and memberships exist
   - `audit_logs` are readable by authorized operators
   - `integration_events` and `webhook_events` preserve recent records
   - storage object references resolve for a sample organization
5. Decide whether to restore production or forward-fix.
6. If production restore is required, communicate downtime and owner.
7. Restore, then run smoke checks: login, dashboard, subscription, templates,
   board calendar, community, webinars, consulting, and health check.

Do not restore production from an unverified backup snapshot.

## Storage Recovery

Storage recovery covers uploaded logos, consulting attachments, board package
documents, and generated exports.

Recovery steps:

1. Identify bucket and object path from the application record.
2. Check whether the file is user-uploaded, generated, or temporary.
3. Restore user-uploaded files from Supabase storage backup if available.
4. Regenerate generated exports instead of restoring stale generated files.
5. Confirm bucket policies still prevent cross-tenant access.
6. Record the object path, owner, restore action, and validation result.

Generated files are disposable and should continue to be cleaned up by the
generated-document cleanup job.

## Secret Rotation

Rotate immediately if a secret appears in logs, screenshots, tickets, commit
history, local terminal output, or a third-party tool.

Rotation order:

1. Create the new secret in the provider.
2. Add it to Vercel Preview/Staging and Production with the correct scope.
3. Add it to Supabase secrets if the Supabase function uses it.
4. Redeploy the affected environment.
5. Validate the dependent flow.
6. Revoke the old secret.
7. Record the owner, timestamp, affected systems, and validation evidence.

Never paste secret values into GitHub issues, docs, PRs, Slack, or screenshots.

## Least-Privilege Operator Access

Operational access must stay narrow:

- Use `platform_user_roles` for operator capability, not organization roles.
- Grant `super_admin` only to people who need production operational access.
- Prefer provider-specific admin roles in future when the team grows.
- Review `platform_user_roles` before launch and after team changes.
- Keep replay capability restricted to platform operators.
- Use audit logs and provider logs to review who changed what.

Suggested access review query:

```sql
select users.email, roles.role, roles.granted_at
from public.platform_user_roles roles
join auth.users users on users.id = roles.user_id
order by roles.granted_at desc;
```

Run this before launch and after any staff access change.
