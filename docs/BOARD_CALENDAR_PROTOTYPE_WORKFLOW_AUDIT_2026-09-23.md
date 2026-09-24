# Board Calendar Prototype: Automated Workflow Audit

Reviewed: 2026-09-23

Source: `/Users/brunobacelar/Downloads/Board Calendar System FINAL.html`

Comparison: Board Calendar implementation in this repository, not a live-environment test.

## Important distinction

The HTML is a browser-only prototype. It persists to `localStorage`; it has no server job, real outbound email, or live calendar integration. Several buttons report that something was sent, uploaded, downloaded, or approved when they only change local demo data. Treat the behaviors below as **product ideas**, not proof of working integrations.

## Workflow inventory

| Workflow in prototype | Trigger and behavior | Current app comparison | Assessment |
| --- | --- | --- | --- |
| Monthly meeting series | Saving a meeting with “Repeat monthly” creates 3, 6, or 12 meetings, including the first. | Meeting form and mutation support one meeting at a time. | Not found in reviewed Board Calendar code. |
| Preparation tasks | “Auto-generate the prep workflow” is checked by default. For every created meeting, it creates tasks due a configured number of days before the meeting; lead contact becomes responsible. | The app already generates tasks from configurable rules when meetings change. Rules can target a meeting type and be before or after a meeting; regeneration preserves task status, owner, notes, and completion. There is no per-meeting generation switch. | Substantially implemented, with a different control model. |
| Date-only board email | On save: queue for review (default), “send automatically now,” or do not email. The message includes meeting date, time, and location, not internal tasks. A review modal previews dates and recipients. | No equivalent outbound meeting-email flow was found. The current app has in-app reminders, which are a different channel. | Prototype **simulates** sending; not implemented as real email. |
| Pending-email badge | Meetings navigation badge counts future, unnotified meetings awaiting review. | No corresponding Board Calendar email queue was found. | Depends on implementing a real queue. |
| RSVP | A board member records Attending, Tentative, or Not Attending for the next meeting. Meeting detail and document templates read the RSVP roster. | No RSVP storage or interaction was found in the reviewed Board Calendar module. | Not found. |
| Agenda/minutes templates | Opening a template creates a prefilled draft; saving persists it. “Approve” adds a generated PDF entry to the board package. | The app has board-package documents, real file upload/download, and audit logs, but no matching draft-to-approval template workflow was found. | Prototype’s PDF is metadata only; generation is not real. |
| Confidential document handling | Optional acknowledgment before download, claimed watermark, and access log. | The app uses authenticated storage, short-lived signed download URLs, and audit logging. No equivalent acknowledgment or watermark workflow was found. | Partially implemented; prototype download/watermark is simulated. |
| Calendar/export actions | Downloads an ICS file, exports JSON backup, or prints to PDF. | The app has ICS download and server-generated PDF export. | ICS/PDF exist, implemented differently. |
| Member invitation and integrations | “Send invite” adds a local contact; Outlook, Google, Resend, and Supabase switches show connected state. | Do not use these prototype controls as evidence of real delivery or integration. | Simulated in the HTML. |

The prototype's default prep rules are: save-the-date **21 days** before, agenda request **14**, committee reports **10**, package compilation **7**, package distribution **5**, and quorum/RSVP confirmation **1**. The current app's configured rules should be checked against these defaults before changing or reseeding an organization's settings.

### Existing reminder endpoint needs operational verification

The app has a protected endpoint that can create idempotent in-app notifications for Board Calendar events happening **today or tomorrow**. It targets active organization members, not just board-email recipients. However, the repository's `vercel.json` schedules only generated-document cleanup; it does **not** schedule this reminder endpoint. An external scheduler may exist, but that was not verified here. Do not describe reminders as automatically running in production until the deployed schedule and an authenticated smoke test confirm it.

## Recommended next decisions

1. **Email policy:** Decide whether meeting emails require human approval by default. Keep “auto-send” off until recipient eligibility, consent, locale, delivery provider, retries, and audit history are defined. Mark “sent” only after confirmed provider acceptance; expose failures and retries.
2. **Queue scope:** The prototype’s review action marks *every* pending future meeting as notified. Production should show exactly which meetings and recipients are selected, allow per-meeting review, and prevent unrelated dates from being sent together accidentally.
3. **Recurring meetings:** Define timezone, daylight-saving behavior, month-end dates, editing one occurrence versus a whole series, cancellation, duplicate prevention, and how generated tasks and already-sent notices update. Avoid creating 12 emailed meetings from one click without explicit confirmation.
4. **Task generation:** Preserve the current rule engine. Decide whether a per-meeting opt-out is needed, and test that rule changes, date edits, and deletions do not erase manually edited status or orphan tasks.
5. **RSVP and documents:** If needed, use workspace identities and permissions rather than prototype contacts. Define who can view responses, how the roster flows into agendas/minutes, and whether approval creates a real immutable PDF with version history.
6. **Operational readiness:** Verify the in-app reminder schedule and timezone in the target environment. Keep outbound meeting email distinct from in-app reminders and from invitations.

## Source pointers

- HTML embedded template: meeting options and notification controls around decoded lines **777-796**; task-rule seed around **1014-1017**; save/delete logic around **1351-1359**; review-send simulation around **1391**; RSVP around **1370**; simulated files/integrations around **1372-1380**, **1406-1407**.
- Current task generator: `lib/template-renderer/board-calendar-editor.ts` (`buildGeneratedStaffTasks`, `syncBoardCalendarGeneratedTasks`).
- Current meeting interactions: `components/templates/board-calendar/use-board-calendar-workbench.ts` and `EntryFormFields.tsx`.
- Current reminders: `lib/notifications/board-calendar-reminders.ts`, `app/api/v1/notifications/board-calendar-reminders/route.ts`, and `vercel.json`.
- Current board-package storage/audit: `app/modules/board-calendar/actions.ts` and `lib/template-renderer/board-calendar-packages.ts`.
