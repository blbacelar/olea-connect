update public.template_definitions
set
  renderer_key = 'dynamic_form',
  schema_version = 2,
  interaction_mode = 'survey',
  supports_pdf = true,
  field_schema = $schema$
  {
    "version": 2,
    "header_fields": [
      {
        "id": "board_year",
        "type": "text",
        "label": "Board year",
        "required": true,
        "validation": { "minLength": 4, "maxLength": 24 }
      },
      {
        "id": "survey_period",
        "type": "text",
        "label": "Survey period",
        "required": true,
        "placeholder": "June 2026"
      },
      {
        "id": "administrator",
        "type": "text",
        "label": "Administrator",
        "required": true
      },
      {
        "id": "contact_email",
        "type": "email",
        "label": "Contact email",
        "required": true
      }
    ],
    "sections": [
      {
        "id": "governance",
        "title": "Governance foundations",
        "description": "Rate how clearly the board understands its role, duties, and operating rhythm.",
        "questions": [
          {
            "id": "mission_alignment",
            "type": "rating",
            "label": "The board keeps decisions aligned to the mission.",
            "required": true,
            "options": [
              { "label": "1 - Needs attention", "value": "1" },
              { "label": "2", "value": "2" },
              { "label": "3", "value": "3" },
              { "label": "4", "value": "4" },
              { "label": "5 - Strong", "value": "5" }
            ],
            "validation": { "min": 1, "max": 5 }
          },
          {
            "id": "role_clarity",
            "type": "rating",
            "label": "Directors understand their governance responsibilities.",
            "required": true,
            "options": [
              { "label": "1 - Needs attention", "value": "1" },
              { "label": "2", "value": "2" },
              { "label": "3", "value": "3" },
              { "label": "4", "value": "4" },
              { "label": "5 - Strong", "value": "5" }
            ],
            "validation": { "min": 1, "max": 5 }
          }
        ]
      },
      {
        "id": "board_operations",
        "title": "Board operations",
        "description": "Capture practical feedback about meetings, materials, and follow-through.",
        "questions": [
          {
            "id": "meeting_effectiveness",
            "type": "rating",
            "label": "Board meetings use time well and focus on the right topics.",
            "required": true,
            "options": [
              { "label": "1 - Needs attention", "value": "1" },
              { "label": "2", "value": "2" },
              { "label": "3", "value": "3" },
              { "label": "4", "value": "4" },
              { "label": "5 - Strong", "value": "5" }
            ],
            "validation": { "min": 1, "max": 5 }
          },
          {
            "id": "priority_improvements",
            "type": "textarea",
            "label": "What should the board improve over the next year?",
            "required": true,
            "validation": { "minLength": 10 }
          }
        ]
      }
    ]
  }
  $schema$::jsonb,
  default_values = jsonb_build_object(
    'board_year', extract(year from now())::text,
    'survey_period', '',
    'administrator', '',
    'contact_email', ''
  )
where resource_id = '10000000-0000-4000-8000-000000000001';

update public.template_definitions
set
  renderer_key = 'dynamic_form',
  schema_version = 2,
  interaction_mode = 'form',
  supports_pdf = true,
  field_schema = $schema$
  {
    "version": 2,
    "header_fields": [
      {
        "id": "meeting_title",
        "type": "text",
        "label": "Meeting title",
        "required": true,
        "placeholder": "Monthly board meeting"
      },
      {
        "id": "meeting_date",
        "type": "date",
        "label": "Meeting date",
        "required": true
      },
      {
        "id": "meeting_time",
        "type": "time",
        "label": "Meeting time"
      },
      {
        "id": "facilitator_email",
        "type": "email",
        "label": "Facilitator email"
      }
    ],
    "sections": [
      {
        "id": "agenda",
        "title": "Agenda items",
        "description": "Add, reorder, and refine the items that will guide the meeting.",
        "questions": [
          {
            "id": "agenda_items",
            "type": "repeatable",
            "label": "Agenda item",
            "required": true,
            "subfields": [
              {
                "id": "topic",
                "type": "text",
                "label": "Topic",
                "required": true
              },
              {
                "id": "owner",
                "type": "text",
                "label": "Owner"
              },
              {
                "id": "duration_minutes",
                "type": "number",
                "label": "Duration in minutes",
                "validation": { "min": 1, "max": 180 }
              },
              {
                "id": "purpose",
                "type": "select",
                "label": "Purpose",
                "required": true,
                "options": [
                  "Information",
                  "Discussion",
                  "Decision"
                ]
              },
              {
                "id": "decision_required",
                "type": "checkbox",
                "label": "Decision required"
              },
              {
                "id": "decision_question",
                "type": "textarea",
                "label": "Decision question",
                "show_if": {
                  "field": "decision_required",
                  "equals": true
                }
              },
              {
                "id": "supporting_documents",
                "type": "repeatable",
                "label": "Supporting document",
                "subfields": [
                  {
                    "id": "document_name",
                    "type": "text",
                    "label": "Document name",
                    "required": true
                  },
                  {
                    "id": "document_url",
                    "type": "url",
                    "label": "Document URL"
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "closing",
        "title": "Closing details",
        "questions": [
          {
            "id": "next_meeting_date",
            "type": "date",
            "label": "Next meeting date"
          },
          {
            "id": "notes",
            "type": "textarea",
            "label": "Additional notes"
          }
        ]
      }
    ]
  }
  $schema$::jsonb,
  default_values = jsonb_build_object(
    'meeting_title', 'Board meeting',
    'agenda_items', jsonb_build_array()
  )
where resource_id = '10000000-0000-4000-8000-000000000002';

update public.template_definitions
set
  renderer_key = 'dynamic_form',
  schema_version = 2,
  field_schema = jsonb_build_object(
    'version', 2,
    'header_fields', jsonb_build_array(
      jsonb_build_object('id', 'document_title', 'type', 'text', 'label', 'Document title', 'required', true)
    ),
    'sections', jsonb_build_array(
      jsonb_build_object(
        'id', 'content',
        'title', 'Content',
        'questions', jsonb_build_array(
          jsonb_build_object('id', 'summary', 'type', 'textarea', 'label', 'Summary', 'required', true)
        )
      )
    )
  ),
  default_values = '{}'::jsonb
where resource_id in (
  '10000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000005',
  '10000000-0000-4000-8000-000000000006'
);
