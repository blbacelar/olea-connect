insert into public.resources (
  id,
  category_id,
  type,
  status,
  slug,
  title,
  summary,
  description,
  estimated_minutes,
  published_at,
  is_featured
)
values (
  '10000000-0000-4000-8000-000000000007',
  (select id from public.resource_categories where slug = 'governance'),
  'template',
  'published',
  'board-calendar-operational-workflow',
  'Board Calendar & Operational Workflow',
  'A connected board calendar system for meetings, preparation deadlines, staff tasks, and AGM planning.',
  'Inspired by the Organizational Board Calendar Workbook, this template helps organizations capture board meetings, committee events, operational lead times, preparation tasks, AGM milestones, and colour-coded calendar categories in one branded workflow.',
  35,
  '2026-06-22T16:00:00Z',
  true
)
on conflict (id) do update
set
  category_id = excluded.category_id,
  status = excluded.status,
  slug = excluded.slug,
  title = excluded.title,
  summary = excluded.summary,
  description = excluded.description,
  estimated_minutes = excluded.estimated_minutes,
  published_at = excluded.published_at,
  is_featured = excluded.is_featured;

insert into public.template_definitions (
  resource_id,
  renderer_key,
  schema_version,
  interaction_mode,
  field_schema,
  default_values,
  supports_pdf,
  supports_docx
)
values (
  '10000000-0000-4000-8000-000000000007',
  'dynamic_form',
  1,
  'form',
  $schema$
  {
    "version": 1,
    "header_fields": [
      {
        "id": "fiscal_year",
        "type": "text",
        "label": "Fiscal year",
        "required": true,
        "placeholder": "2026",
        "validation": { "minLength": 4, "maxLength": 24 }
      },
      {
        "id": "administrator",
        "type": "text",
        "label": "Calendar administrator",
        "required": true
      },
      {
        "id": "administrator_email",
        "type": "email",
        "label": "Administrator email",
        "required": true
      },
      {
        "id": "board_chair",
        "type": "text",
        "label": "Board Chair"
      },
      {
        "id": "executive_director",
        "type": "text",
        "label": "Executive Director / CEO"
      }
    ],
    "sections": [
      {
        "id": "getting_started",
        "title": "Workflow overview",
        "description": "Use this template to connect your board-facing calendar with the operational work required before and after each meeting.",
        "questions": [
          {
            "id": "workflow_note",
            "type": "paragraph",
            "text": "Start by confirming your organization details and committees, then enter board meetings and events. The lead-time fields help your staff team plan save-the-dates, agenda requests, reports, board packages, reminders, and follow-up action items."
          }
        ]
      },
      {
        "id": "committees",
        "title": "Committees",
        "description": "Name the committees your board uses. Leave rows blank if they do not apply.",
        "questions": [
          {
            "id": "committees",
            "type": "repeatable",
            "label": "Committee",
            "subfields": [
              {
                "id": "name",
                "type": "text",
                "label": "Committee name",
                "required": true
              },
              {
                "id": "chair",
                "type": "text",
                "label": "Committee chair"
              },
              {
                "id": "notes",
                "type": "textarea",
                "label": "Notes"
              }
            ]
          }
        ]
      },
      {
        "id": "operational_calendar",
        "title": "Operational calendar",
        "description": "Set the default preparation timeline used to plan staff tasks for each meeting.",
        "questions": [
          {
            "id": "save_the_date_days",
            "type": "number",
            "label": "Save-the-date due days before meeting",
            "validation": { "min": 0, "max": 180 }
          },
          {
            "id": "agenda_request_days",
            "type": "number",
            "label": "Request agenda items days before meeting",
            "validation": { "min": 0, "max": 180 }
          },
          {
            "id": "reports_due_days",
            "type": "number",
            "label": "Reports due days before meeting",
            "validation": { "min": 0, "max": 180 }
          },
          {
            "id": "draft_agenda_days",
            "type": "number",
            "label": "Draft agenda to Chair days before meeting",
            "validation": { "min": 0, "max": 180 }
          },
          {
            "id": "package_sent_days",
            "type": "number",
            "label": "Board package sent days before meeting",
            "validation": { "min": 0, "max": 180 }
          },
          {
            "id": "rsvp_deadline_days",
            "type": "number",
            "label": "RSVP deadline days before meeting",
            "validation": { "min": 0, "max": 180 }
          },
          {
            "id": "final_reminder_days",
            "type": "number",
            "label": "Final reminder days before meeting",
            "validation": { "min": 0, "max": 180 }
          },
          {
            "id": "action_items_after_days",
            "type": "number",
            "label": "Action items sent days after meeting",
            "validation": { "min": 0, "max": 60 }
          }
        ]
      },
      {
        "id": "annual_calendar",
        "title": "Annual calendar",
        "description": "Build a board-facing 12-month view with the most important meetings, events, deadlines, and observances.",
        "questions": [
          {
            "id": "annual_highlights",
            "type": "repeatable",
            "label": "Annual calendar item",
            "subfields": [
              {
                "id": "month",
                "type": "select",
                "label": "Month",
                "required": true,
                "options": [
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December"
                ]
              },
              {
                "id": "title",
                "type": "text",
                "label": "Calendar item",
                "required": true
              },
              {
                "id": "category",
                "type": "select",
                "label": "Category",
                "options": [
                  "Board Meeting",
                  "Committee Meeting",
                  "AGM / Annual Meeting",
                  "Board Retreat",
                  "Board Orientation",
                  "Board Recruitment",
                  "Social Event",
                  "Key Deadline",
                  "Other / General"
                ]
              },
              {
                "id": "date",
                "type": "date",
                "label": "Date"
              },
              {
                "id": "notes",
                "type": "textarea",
                "label": "Notes"
              }
            ]
          }
        ]
      },
      {
        "id": "monthly_calendar",
        "title": "Monthly calendar",
        "description": "Capture the selected month and the board package priorities for that month.",
        "questions": [
          {
            "id": "monthly_calendar_month",
            "type": "select",
            "label": "Selected month",
            "options": [
              "January",
              "February",
              "March",
              "April",
              "May",
              "June",
              "July",
              "August",
              "September",
              "October",
              "November",
              "December"
            ]
          },
          {
            "id": "monthly_calendar_year",
            "type": "text",
            "label": "Selected year"
          },
          {
            "id": "monthly_priorities",
            "type": "repeatable",
            "label": "Monthly calendar priority",
            "subfields": [
              {
                "id": "day_or_week",
                "type": "text",
                "label": "Day or week"
              },
              {
                "id": "item",
                "type": "text",
                "label": "Calendar item",
                "required": true
              },
              {
                "id": "notes",
                "type": "textarea",
                "label": "Notes"
              }
            ]
          }
        ]
      },
      {
        "id": "meeting_schedule",
        "title": "Meeting schedule",
        "description": "Enter all board meetings, committee meetings, AGM dates, recruitment activities, orientations, and social events for the year.",
        "questions": [
          {
            "id": "meetings",
            "type": "repeatable",
            "label": "Meeting or event",
            "required": true,
            "subfields": [
              {
                "id": "date",
                "type": "date",
                "label": "Date",
                "required": true
              },
              {
                "id": "type",
                "type": "select",
                "label": "Meeting type",
                "required": true,
                "options": [
                  "Board Meeting",
                  "Committee Meeting",
                  "AGM / Annual Meeting",
                  "Board Retreat",
                  "Board Orientation",
                  "Board Recruitment",
                  "Summer Social",
                  "Holiday Social",
                  "New Member Welcome Event",
                  "Key Deadline",
                  "Other / General"
                ]
              },
              {
                "id": "committee",
                "type": "text",
                "label": "Committee"
              },
              {
                "id": "time",
                "type": "time",
                "label": "Time"
              },
              {
                "id": "location",
                "type": "text",
                "label": "Location / platform"
              },
              {
                "id": "virtual_link",
                "type": "url",
                "label": "Virtual link"
              },
              {
                "id": "lead_contact",
                "type": "text",
                "label": "Lead contact"
              },
              {
                "id": "notes",
                "type": "textarea",
                "label": "Notes"
              },
              {
                "id": "confirmed",
                "type": "select",
                "label": "Confirmed?",
                "options": ["Yes", "TBC", "No"]
              }
            ]
          }
        ]
      },
      {
        "id": "staff_tasks",
        "title": "Staff task list",
        "description": "Use this as the Monday-morning working list for preparation deadlines and follow-up.",
        "questions": [
          {
            "id": "tasks",
            "type": "repeatable",
            "label": "Task",
            "subfields": [
              {
                "id": "task",
                "type": "text",
                "label": "Task",
                "required": true
              },
              {
                "id": "due_date",
                "type": "date",
                "label": "Due date"
              },
              {
                "id": "related_meeting",
                "type": "text",
                "label": "Related meeting"
              },
              {
                "id": "responsible",
                "type": "text",
                "label": "Responsible"
              },
              {
                "id": "status",
                "type": "select",
                "label": "Status",
                "options": ["Not Started", "In Progress", "Complete"]
              },
              {
                "id": "notes",
                "type": "textarea",
                "label": "Notes"
              },
              {
                "id": "done",
                "type": "checkbox",
                "label": "Done"
              }
            ]
          }
        ]
      },
      {
        "id": "agm_timeline",
        "title": "AGM planning timeline",
        "description": "Capture the AGM date and major governance deliverables before and after the annual meeting.",
        "questions": [
          {
            "id": "agm_date",
            "type": "date",
            "label": "Confirmed AGM date"
          },
          {
            "id": "agm_milestones",
            "type": "repeatable",
            "label": "AGM milestone",
            "subfields": [
              {
                "id": "track",
                "type": "select",
                "label": "Track",
                "options": ["Governance", "Finance", "Communications", "Operations", "Other"]
              },
              {
                "id": "task",
                "type": "text",
                "label": "Task / deliverable",
                "required": true
              },
              {
                "id": "weeks_before",
                "type": "number",
                "label": "Weeks before AGM",
                "validation": { "min": -12, "max": 52 }
              },
              {
                "id": "calculated_date",
                "type": "date",
                "label": "Target date"
              },
              {
                "id": "responsible",
                "type": "text",
                "label": "Responsible"
              },
              {
                "id": "status",
                "type": "select",
                "label": "Status",
                "options": ["Not Started", "In Progress", "Complete"]
              },
              {
                "id": "notes",
                "type": "textarea",
                "label": "Notes"
              },
              {
                "id": "done",
                "type": "checkbox",
                "label": "Done"
              }
            ]
          }
        ]
      },
      {
        "id": "colour_key",
        "title": "Colour key",
        "description": "Document the event and task status colours your organization wants to use across calendar exports.",
        "questions": [
          {
            "id": "event_categories",
            "type": "repeatable",
            "label": "Event category",
            "subfields": [
              {
                "id": "category",
                "type": "text",
                "label": "Category",
                "required": true
              },
              {
                "id": "hex_code",
                "type": "text",
                "label": "Hex code",
                "validation": { "pattern": "^#[0-9A-Fa-f]{6}$" }
              },
              {
                "id": "used_for",
                "type": "textarea",
                "label": "Used for"
              }
            ]
          }
        ]
      }
    ]
  }
  $schema$::jsonb,
  jsonb_build_object(
    'fiscal_year', extract(year from now())::text,
    'administrator', '',
    'administrator_email', '',
    'board_chair', '',
    'executive_director', '',
    'committees', jsonb_build_array(
      jsonb_build_object('name', 'Finance / Audit Committee'),
      jsonb_build_object('name', 'Governance / Nominating Committee'),
      jsonb_build_object('name', 'Human Resources Committee'),
      jsonb_build_object('name', 'Program Committee')
    ),
    'save_the_date_days', 42,
    'agenda_request_days', 28,
    'reports_due_days', 14,
    'draft_agenda_days', 14,
    'package_sent_days', 12,
    'rsvp_deadline_days', 7,
    'final_reminder_days', 2,
    'action_items_after_days', 1,
    'meetings', jsonb_build_array(),
    'annual_highlights', jsonb_build_array(),
    'monthly_calendar_month', '',
    'monthly_calendar_year', extract(year from now())::text,
    'monthly_priorities', jsonb_build_array(),
    'tasks', jsonb_build_array(),
    'agm_milestones', jsonb_build_array(
      jsonb_build_object('track', 'Governance', 'task', 'Confirm AGM date, venue, and format', 'weeks_before', 16, 'responsible', 'Administrator', 'status', 'Not Started'),
      jsonb_build_object('track', 'Governance', 'task', 'Review board composition and skills gaps', 'weeks_before', 16, 'responsible', 'Governance Chair', 'status', 'Not Started'),
      jsonb_build_object('track', 'Governance', 'task', 'Begin board recruitment outreach', 'weeks_before', 12, 'responsible', 'Governance Chair', 'status', 'Not Started'),
      jsonb_build_object('track', 'Governance', 'task', 'Send formal AGM notice to members', 'weeks_before', 4, 'responsible', 'Administrator', 'status', 'Not Started'),
      jsonb_build_object('track', 'Governance', 'task', 'AGM held', 'weeks_before', 0, 'responsible', 'Board Chair', 'status', 'Not Started'),
      jsonb_build_object('track', 'Governance', 'task', 'Draft AGM minutes and send to Board Chair', 'weeks_before', -2, 'responsible', 'Administrator', 'status', 'Not Started')
    ),
    'event_categories', jsonb_build_array(
      jsonb_build_object('category', 'Board Meeting', 'hex_code', '#1A6B6B', 'used_for', 'Full board meetings'),
      jsonb_build_object('category', 'Committee Meeting', 'hex_code', '#4A3580', 'used_for', 'Standing and ad hoc committee meetings'),
      jsonb_build_object('category', 'AGM / Annual Meeting', 'hex_code', '#C47D00', 'used_for', 'Annual General Meeting and member meetings'),
      jsonb_build_object('category', 'Key Deadline', 'hex_code', '#C0392B', 'used_for', 'Regulatory filings, statutory dates, and financial deadlines'),
      jsonb_build_object('category', 'Other / General', 'hex_code', '#5F5E5A', 'used_for', 'Awareness days, observances, and general calendar items')
    )
  ),
  true,
  true
)
on conflict (resource_id) do update
set
  renderer_key = excluded.renderer_key,
  schema_version = excluded.schema_version,
  interaction_mode = excluded.interaction_mode,
  field_schema = excluded.field_schema,
  default_values = excluded.default_values,
  supports_pdf = excluded.supports_pdf,
  supports_docx = excluded.supports_docx;

insert into public.resource_plan_access (resource_id, plan_id)
values
  ('10000000-0000-4000-8000-000000000007', 'roots'),
  ('10000000-0000-4000-8000-000000000007', 'canopy'),
  ('10000000-0000-4000-8000-000000000007', 'harvest')
on conflict do nothing;
