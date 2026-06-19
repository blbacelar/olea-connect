begin;

select plan(7);

select is(
  (select count(*)::integer from public.template_field_types where is_active),
  19,
  'all supported template field types are registered'
);

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
    '10000000-0000-0000-0000-000000000001',
    'template',
    'draft',
    'test-all-field-types',
    'All Field Types',
    'Complete template field fixture.'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'template',
    'draft',
    'test-invalid-field-type',
    'Invalid Field Type',
    'Unsupported field fixture.'
  );

select lives_ok(
  $test$
    insert into public.template_definitions (
      resource_id,
      renderer_key,
      interaction_mode,
      field_schema
    )
    values (
      '10000000-0000-0000-0000-000000000001',
      'all_fields_layout',
      'form',
      '{
        "version": 1,
        "header_fields": [
          {"id":"text","type":"text"},
          {"id":"textarea","type":"textarea"},
          {"id":"rich_text","type":"rich_text"},
          {"id":"number","type":"number"},
          {"id":"currency","type":"currency"},
          {"id":"rating","type":"rating","options":[1,2,3,4,5]},
          {"id":"date","type":"date"},
          {"id":"time","type":"time"},
          {"id":"datetime","type":"datetime"},
          {"id":"checkbox","type":"checkbox"},
          {"id":"select","type":"select","options":["A","B"]},
          {"id":"multiselect","type":"multiselect","options":["A","B"]},
          {"id":"signature","type":"signature"},
          {"id":"email","type":"email"},
          {"id":"url","type":"url"},
          {"id":"file","type":"file"},
          {"id":"heading","type":"heading"},
          {"id":"paragraph","type":"paragraph"}
        ],
        "sections": [
          {
            "id":"repeatable_section",
            "title":"Repeatable",
            "questions":[
              {
                "id":"repeatable",
                "type":"repeatable",
                "subfields":[
                  {"id":"nested_text","type":"text"},
                  {"id":"nested_select","type":"select","options":["One","Two"]}
                ]
              }
            ]
          }
        ]
      }'::jsonb
    )
  $test$,
  'a schema containing every supported field type is accepted'
);

select is(
  (
    select count(distinct field_type)::integer
    from (
      select field ->> 'type' as field_type
      from public.template_definitions definitions,
        jsonb_array_elements(definitions.field_schema -> 'header_fields') field
      where definitions.resource_id = '10000000-0000-0000-0000-000000000001'
      union all
      select question ->> 'type'
      from public.template_definitions definitions,
        jsonb_array_elements(definitions.field_schema -> 'sections') section,
        jsonb_array_elements(section -> 'questions') question
      where definitions.resource_id = '10000000-0000-0000-0000-000000000001'
    ) fixture_types
  ),
  19,
  'the fixture exercises every registered field type'
);

select throws_ok(
  $test$
    insert into public.template_definitions (
      resource_id,
      renderer_key,
      field_schema
    )
    values (
      '10000000-0000-0000-0000-000000000002',
      'invalid_layout',
      '{
        "version":1,
        "sections":[
          {
            "id":"invalid",
            "title":"Invalid",
            "questions":[{"id":"bad","type":"unknown_widget"}]
          }
        ]
      }'::jsonb
    )
  $test$,
  'P0001',
  'Unsupported template field type: unknown_widget',
  'unsupported field types are rejected'
);

select throws_ok(
  $test$
    update public.template_field_types
    set value_shape = 'unsupported'
    where id = 'text'
  $test$,
  '23514',
  null,
  'field value shapes remain constrained'
);

select is(
  (
    select bool_and(supports_docx)
    from public.template_definitions
    where renderer_key = 'dynamic_form'
  ),
  true,
  'dynamic templates support DOCX exports'
);

select is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in ('generated_documents_update', 'generated_documents_delete')
  ),
  0,
  'generated document storage objects are immutable to authenticated users'
);

select * from finish();
rollback;
