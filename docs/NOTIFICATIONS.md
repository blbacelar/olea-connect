# Notifications

Olea Connects™ uses persisted, user-scoped notifications for member lifecycle
updates. The notification bell should always reflect unread rows in
`public.notifications`, not hard-coded UI state.

## Data Model

Notifications are stored in `public.notifications` with:

- `user_id`: the recipient.
- `organization_id`: optional tenant scope for organization events.
- `type`: lowercase domain event name, such as `template_available`.
- `severity`: `info`, `success`, `warning`, or `critical`.
- `title` and `body`: member-facing copy.
- `action_url`: an internal deep link only.
- `read_at`: null while unread.
- `expires_at`: optional expiry for time-sensitive notices.
- `idempotency_key`: deterministic dedupe key per user and event.
- `metadata`: structured context for future debugging or admin views.

The migration `20260710193000_member_notifications_lifecycle.sql` adds a
private helper, `private.enqueue_notification(...)`, that all database lifecycle
triggers should use. It enforces tenant membership, rejects external deep links,
and deduplicates repeated domain events.

## Read State

Members update notification state through RPCs:

- `public.mark_notification_read(notification_id)`
- `public.mark_all_notifications_read()`

Both RPCs are scoped to `auth.uid()` so one user cannot mark another user's
notifications as read.

The app shell loads unread notification count and the five newest unread
notifications through `lib/data/member-context.ts`. The header performs an
optimistic UI update, then persists the read state through server actions in
`app/notifications/actions.ts`.

## Lifecycle Sources

Current lifecycle notification sources include:

- Community mentions on posts and comments.
- Newly available templates.
- Grant rounds opening and results posting.
- Grant award status changes.
- New webinars/events available to a member's plan.
- Webinar cancellations, reschedules, and recordings.
- Team invitations, team member changes, and seat-limit warnings.
- Subscription renewals, payment failures, payment successes, pauses, and
  cancellations.

Some notification events also create email outbox records in
`public.integration_events` when an email lifecycle message is required.

## Testing

Database tests live in `supabase/tests/notifications.sql` and cover:

- Notification creation.
- Idempotent dedupe.
- Cross-tenant rejection.
- External deep-link rejection.
- Individual read state.
- Mark-all-read scope.

Authenticated E2E coverage in `tests/e2e/authenticated-member.spec.ts` covers:

- Bell unread count from database rows.
- Mark-all-read persistence after reload.
- Deep-link navigation.
- Individual read-state persistence.

## Community Mentions

Community mentions are normalized through `public.community_mentions`, not
parsed from freeform `@name` text. The UI exposes a mention picker scoped to the
selected community space, and submitted user IDs are filtered server-side before
records are inserted.

Important guarantees:

- Members cannot mention themselves.
- Members can only mention users who have access to the same community space.
- Post/comment authors can manage mentions on their own content.
- Community managers can manage post mentions for spaces they moderate.
- Each mentioned user receives one deduplicated `community_mention`
  notification per post or comment target.

Database coverage lives in `supabase/tests/community_mentions.sql` and verifies
valid mentions, notification creation, duplicate rejection, access rejection,
and notification read-state isolation. Community E2E coverage in
`tests/e2e/native-community.spec.ts` verifies the mention picker and member
notification deep link.
