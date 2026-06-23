with board_calendar_definition as (
  select td.resource_id, td.field_schema
  from public.template_definitions td
  join public.resources r on r.id = td.resource_id
  where r.slug = 'board-calendar-operational-workflow'
),
updated_sections as (
  select
    resource_id,
    jsonb_agg(
      case
        when section->>'id' = 'operational_calendar' then
          section || jsonb_build_object('layout', 'two_column')
        when section->>'id' = 'colour_key' then
          jsonb_set(
            section,
            '{questions}',
            (
              select jsonb_agg(
                case
                  when question->>'id' = 'event_categories' then
                    jsonb_set(
                      question,
                      '{subfields}',
                      (
                        select jsonb_agg(
                          case
                            when subfield->>'id' = 'hex_code' then
                              subfield || jsonb_build_object('type', 'color')
                            else subfield
                          end
                          order by subfield_ordinality
                        )
                        from jsonb_array_elements(coalesce(question->'subfields', '[]'::jsonb))
                          with ordinality as subfields(subfield, subfield_ordinality)
                      )
                    )
                  else question
                end
                order by question_ordinality
              )
              from jsonb_array_elements(coalesce(section->'questions', '[]'::jsonb))
                with ordinality as questions(question, question_ordinality)
            )
          )
        else section
      end
      order by section_ordinality
    ) as sections
  from board_calendar_definition,
    jsonb_array_elements(coalesce(field_schema->'sections', '[]'::jsonb))
      with ordinality as sections(section, section_ordinality)
  group by resource_id
)
update public.template_definitions td
set
  schema_version = greatest(td.schema_version, 2),
  field_schema = jsonb_set(
    jsonb_set(
      td.field_schema,
      '{presentation}',
      jsonb_build_object(
        'section_layout', 'tabs',
        'calendar', jsonb_build_object('enabled', true, 'source', 'meetings')
      ),
      true
    ),
    '{sections}',
    updated_sections.sections,
    false
  )
from updated_sections
where td.resource_id = updated_sections.resource_id;
