begin;

do $$
declare
  survey_resource_id uuid := gen_random_uuid();
  agenda_resource_id uuid := gen_random_uuid();
  invalid_resource_id uuid := gen_random_uuid();
  invalid_schema_rejected boolean := false;
begin
  insert into public.resources (
    id,
    type,
    status,
    slug,
    title,
    summary
  )
  values
    (
      survey_resource_id,
      'template',
      'draft',
      'test-board-self-evaluation',
      'Board Self-Evaluation',
      'Template-engine schema validation test.'
    ),
    (
      agenda_resource_id,
      'template',
      'draft',
      'test-board-meeting-agenda',
      'Board Meeting Agenda',
      'Template-engine repeatable-field validation test.'
    ),
    (
      invalid_resource_id,
      'template',
      'draft',
      'test-invalid-template',
      'Invalid Template',
      'Unsupported field-type rejection test.'
    );

  insert into public.template_definitions (
    resource_id,
    renderer_key,
    interaction_mode,
    field_schema
  )
  values (
    survey_resource_id,
    'survey_layout',
    'survey',
    '{
      "version": 1,
      "header_fields": [
        {"id": "board_year", "type": "text", "label": "Board Year", "required": true}
      ],
      "sections": [
        {
          "id": "mission",
          "title": "Mission, Vision and Strategic Direction",
          "questions": [
            {
              "id": "q1",
              "type": "rating",
              "text": "I can clearly articulate our mission and vision.",
              "options": [1, 2, 3, 4, 5],
              "required": true
            },
            {
              "id": "oe1",
              "type": "textarea",
              "text": "What is the board doing particularly well?"
            }
          ]
        }
      ]
    }'::jsonb
  );

  insert into public.template_definitions (
    resource_id,
    renderer_key,
    interaction_mode,
    field_schema
  )
  values (
    agenda_resource_id,
    'agenda_layout',
    'form',
    '{
      "version": 1,
      "header_fields": [
        {"id": "meeting_date", "type": "date", "label": "Meeting date"},
        {"id": "meeting_time", "type": "time", "label": "Start time"}
      ],
      "sections": [
        {
          "id": "agenda_items",
          "title": "Agenda Items",
          "questions": [
            {
              "id": "items",
              "type": "repeatable",
              "label": "Agenda item",
              "subfields": [
                {"id": "time", "type": "time", "label": "Time"},
                {"id": "item", "type": "text", "label": "Item"},
                {
                  "id": "type",
                  "type": "select",
                  "label": "Type",
                  "options": ["Decision", "Discussion", "Information", "Approval"]
                }
              ]
            }
          ]
        }
      ]
    }'::jsonb
  );

  begin
    insert into public.template_definitions (
      resource_id,
      renderer_key,
      field_schema
    )
    values (
      invalid_resource_id,
      'invalid_layout',
      '{
        "version": 1,
        "sections": [
          {
            "id": "invalid",
            "title": "Invalid",
            "questions": [
              {"id": "bad", "type": "unknown_widget"}
            ]
          }
        ]
      }'::jsonb
    );
  exception
    when others then
      invalid_schema_rejected := sqlerrm like 'Unsupported template field type:%';
  end;

  if not invalid_schema_rejected then
    raise exception 'Expected unsupported template field type to be rejected';
  end if;
end;
$$;

rollback;
