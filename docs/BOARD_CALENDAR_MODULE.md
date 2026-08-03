# Board Calendar Portal

The Board Calendar is treated as an Olea board portal, not a simple document
template. The CEO prototype HTML from the Board Calendar handoff is the product
behavior guide for the portal. We should use Olea Connects™ UI components and
theme, but keep the portal behavior aligned with that source of truth.

The current implementation still uses the dynamic template session engine for
persistence, exports, brand snapshots, and multi-instance calendars, but the
user-facing entry point is:

`/modules/board-calendar`

The legacy template route remains available for compatibility:

`/templates/board-calendar-operational-workflow`

## Why It Is A Portal

The Board Calendar includes board-operations behavior that is larger than a
static workbook:

- calendar-first meeting and event entry
- repeatable setup data for committees and task rules
- generated staff tasks from meeting dates
- AGM milestone calculations from a confirmed AGM date
- annual, monthly, and operational board views
- board packages, directory, and audit log workspaces
- PDF/DOCX exports through the shared template export pipeline

## Architecture

The module route loads the existing board-calendar resource through
`getDynamicTemplateEditorData()` and renders `DynamicTemplateEditor` with a
module-specific `basePath`.

Core files:

- `app/modules/board-calendar/page.tsx`
- `components/templates/DynamicTemplateEditor.tsx`
- `components/templates/BoardCalendarWorkbench.tsx`
- `components/templates/BoardCalendarWorkflowPanels.tsx`
- `lib/template-renderer/board-calendar-editor.ts`
- `lib/template-renderer/calendar-view.ts`

## Routing Rules

- New product navigation should point to `/modules/board-calendar`.
- Template library cards for `board-calendar-operational-workflow` should open
  the module route.
- Existing saved template sessions remain stored in `template_instances`.
- Starting a new calendar from the module route should keep the browser on the
  module route after the first save.

## Portal UX

The Board Calendar portal uses internal tabs for the board-operations areas
inspired by the CEO prototype: Dashboard, Calendar, Meetings, Workflows, Board
Packages, Directory, Audit Log, and Settings.

The top portal action bar owns the primary workflow actions:

- `Add meeting` opens the calendar tab and launches the entry modal.
- `Export PDF` uses the browser print flow.
- `Add to calendar` downloads an `.ics` calendar file from dated module events.

The portal should not repeat organization identity or fiscal-year setup details
in its chrome. Those details belong in the Settings tab and the shared template
workspace header.

The portal should not include an Integrations tab. Integration management belongs
in platform-level settings; this portal may later show integration-driven
outcomes only where they directly support board work.

Areas that are part of the product direction but not wired to persisted portal
data yet should render a clear coming-soon panel, not a dead control.

New Board Calendar workspaces must start empty. Do not seed mock committees,
task rules, AGM milestones, event categories, fiscal years, or sample meetings in
template defaults, and do not preselect entry form values such as category,
status, confirmation, lead contact, or responsible person. Placeholder text is
acceptable; persisted values must come from explicit user input.

## Product Direction

Future refactors should keep the user mental model simple:

1. Configure setup rules once.
2. Add meetings and events from the calendar.
3. Generate staff tasks and output views from the same source data.

Avoid adding duplicate auth, branding, navigation, storage, or app shell logic
inside this module. Those belong to the Olea platform.
