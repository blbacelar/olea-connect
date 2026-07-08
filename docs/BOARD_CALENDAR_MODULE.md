# Board Calendar Module

The Board Calendar is treated as an Olea module, not a simple document template.
It still uses the dynamic template session engine for persistence, exports, brand
snapshots, and multi-instance workbooks, but the user-facing entry point is:

`/modules/board-calendar`

The legacy template route remains available for compatibility:

`/templates/board-calendar-operational-workflow`

## Why It Is A Module

The Board Calendar includes workflow behavior that is larger than a static
template:

- calendar-first meeting and event entry
- repeatable setup data for committees and task rules
- generated staff tasks from meeting dates
- AGM milestone calculations from a confirmed AGM date
- annual, monthly, and operational output views
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

## Module UX

The Board Calendar module uses internal tabs for the module areas inspired by
the CEO prototype: Dashboard, Calendar, Meetings, Workflows, Board Packages,
Directory, Audit Log, Integrations, and Settings.

The top module action bar owns the primary workflow actions:

- `Add meeting` opens the calendar tab and scrolls to the entry composer.
- `Export PDF` uses the browser print flow.
- `Add to calendar` downloads an `.ics` calendar file from dated module events.

Areas that are part of the product direction but not wired to persisted module
data yet should render a clear coming-soon panel, not a dead control.

## Product Direction

Future refactors should keep the user mental model simple:

1. Configure setup rules once.
2. Add meetings and events from the calendar.
3. Generate staff tasks and output views from the same source data.

Avoid adding duplicate auth, branding, navigation, storage, or app shell logic
inside this module. Those belong to the Olea platform.
