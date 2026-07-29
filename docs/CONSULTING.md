# Harvest Consulting Workflow

Harvest members can request advisory support, attach working files, and track how
their included and purchased consulting hours are consumed during the active
subscription period.

## Member Flow

1. A member opens `/consulting`.
2. The page checks the signed-in member's organization, active subscription, and
   plan entitlement.
3. Active Harvest organizations can submit a request with category, urgency,
   title, description, and optional attachments.
4. Members can view their own organization's requests, status updates, scheduled
   calls, attachments, recorded time, and activity history.

Non-Harvest organizations see a locked state explaining that consulting is a
Harvest benefit. They cannot create requests through the UI or the database API.

## Staff Flow

Users with one of these platform roles can manage consulting work:

- `super_admin`
- `consulting_admin`
- `consultant`

Staff can update request status, assign a consultant, set due/scheduled dates,
leave member-facing notes, keep internal notes, and record time entries. Time
entry recording is protected by database locks so concurrent submissions cannot
silently over-consume the available bucket.

## Data Model

Core tables:

- `consulting_engagements`: one active consulting period per organization and
  subscription period.
- `consulting_requests`: member-created support requests tied to an engagement.
- `consulting_time_entries`: staff-recorded work against a request.
- `consulting_request_attachments`: uploaded request files in the private
  `consulting-attachments` Supabase Storage bucket.
- `consulting_request_activity`: auditable status, note, and time-entry history.

Purchased consulting hours are read from `subscription_items` where
`item_type = 'consulting_hour'`. The active period's available support equals:

- Included minutes from the engagement.
- Purchased consulting hour items converted to minutes.
- In-kind support tracked in its own bucket.

## Authorization

Tenant isolation is enforced in Postgres with RLS and security-definer RPCs:

- Only active Harvest organizations can create requests.
- Members can only select requests, attachments, and activity for their own
  organization.
- Staff queue access requires a platform staff role.
- Staff assignment and time entry RPCs reject non-staff callers.

The direct `consulting_requests` insert policy also checks Harvest entitlement so
members cannot bypass the request RPC with a direct REST insert.

## Notifications

The workflow enqueues in-app notifications for:

- New member requests, sent to consulting staff.
- Request status/member-note updates, sent to the requesting member.
- Recorded consulting time, sent to the requesting member with remaining minutes
  in the relevant support bucket.

## Tests

Database coverage lives in `supabase/tests/consulting_workflow.sql` and checks:

- Non-Harvest organizations cannot create requests.
- Harvest organizations can create requests.
- Members only see their own organization's requests.
- Non-staff users cannot update requests or record time.
- Staff can assign, update, complete, and record time.
- Over-consumption is rejected.
- Completed requests keep activity history.

Security metadata coverage is included in `supabase/tests/security_contract.sql`.
