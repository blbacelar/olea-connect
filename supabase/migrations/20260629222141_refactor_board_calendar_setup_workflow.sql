with board_calendar_definition as (
  select definitions.resource_id
  from public.template_definitions definitions
  join public.resources resources on resources.id = definitions.resource_id
  where resources.slug = 'board-calendar-operational-workflow'
)
update public.template_definitions definitions
set
  field_schema = jsonb_set(
    definitions.field_schema,
    '{sections}',
    (
      select jsonb_agg(
        case
          when section.value->>'id' = 'getting_started' then
            section.value
            || jsonb_build_object(
              'title', 'Setup',
              'description', 'Configure organization details, committees, and task rules before adding meetings.'
            )
          when section.value->>'id' = 'operational_calendar' then
            section.value
            || jsonb_build_object(
              'title', 'Generated operational workflow',
              'description', 'Generated from Meeting Schedule dates and Setup task rules.'
            )
          when section.value->>'id' = 'staff_tasks' then
            section.value
            || jsonb_build_object(
              'title', 'Staff task list',
              'description', 'Generated staff work with editable owner, status, and notes.'
            )
          when section.value->>'id' = 'agm_timeline' then
            jsonb_set(
              section.value || jsonb_build_object(
                'description', 'Add AGM milestones one at a time. Target dates are calculated from the confirmed AGM date and days before AGM.'
              ),
              '{questions}',
              (
                select jsonb_agg(
                  case
                    when question.value->>'id' = 'agm_milestones' then
                      jsonb_set(
                        question.value,
                        '{subfields}',
                        (
                          select jsonb_agg(
                            case
                              when subfield.value->>'id' = 'weeks_before' then
                                subfield.value
                                || jsonb_build_object(
                                  'id', 'days_before',
                                  'label', 'Days before AGM',
                                  'validation', jsonb_build_object('min', -365, 'max', 365)
                                )
                              else subfield.value
                            end
                            order by subfield.ordinality
                          )
                          from jsonb_array_elements(question.value->'subfields')
                            with ordinality as subfield(value, ordinality)
                        )
                      )
                    else question.value
                  end
                  order by question.ordinality
                )
                from jsonb_array_elements(section.value->'questions')
                  with ordinality as question(value, ordinality)
              )
            )
          else section.value
        end
        order by section.ordinality
      )
      from jsonb_array_elements(definitions.field_schema->'sections')
        with ordinality as section(value, ordinality)
    )
  ),
  default_values = jsonb_set(
    jsonb_set(
      jsonb_set(
        definitions.default_values,
        '{committees}',
        '[]'::jsonb
      ),
      '{agm_milestones}',
      '[]'::jsonb
    ),
    '{operational_task_rules}',
    jsonb_build_array(
      jsonb_build_object(
        'label', 'Send save-the-date',
        'days_before', 42,
        'applies_to', 'Any meeting',
        'responsible', 'Administrator'
      ),
      jsonb_build_object(
        'label', 'Request agenda items',
        'days_before', 28,
        'applies_to', 'Any meeting',
        'responsible', 'Administrator'
      ),
      jsonb_build_object(
        'label', 'Reports due',
        'days_before', 14,
        'applies_to', 'Any meeting',
        'responsible', 'Administrator'
      ),
      jsonb_build_object(
        'label', 'Draft agenda to Chair',
        'days_before', 14,
        'applies_to', 'Any meeting',
        'responsible', 'Administrator'
      ),
      jsonb_build_object(
        'label', 'Board package sent',
        'days_before', 12,
        'applies_to', 'Any meeting',
        'responsible', 'Administrator'
      ),
      jsonb_build_object(
        'label', 'RSVP deadline',
        'days_before', 7,
        'applies_to', 'Any meeting',
        'responsible', 'Administrator'
      ),
      jsonb_build_object(
        'label', 'Final reminder',
        'days_before', 2,
        'applies_to', 'Any meeting',
        'responsible', 'Administrator'
      ),
      jsonb_build_object(
        'label', 'Action items sent',
        'days_after', 1,
        'applies_to', 'Any meeting',
        'responsible', 'Administrator'
      )
    )
  )
where definitions.resource_id in (select resource_id from board_calendar_definition);

with board_calendar_instances as (
  select instances.id, instances.form_data
  from public.template_instances instances
  join public.resources resources on resources.id = instances.resource_id
  where resources.slug = 'board-calendar-operational-workflow'
    and jsonb_typeof(instances.form_data->'agm_milestones') = 'array'
)
update public.template_instances instances
set form_data = jsonb_set(
  instances.form_data,
  '{agm_milestones}',
  (
    select jsonb_agg(
      case
        when milestone.value ? 'weeks_before'
          and not (milestone.value ? 'days_before') then
          (milestone.value - 'weeks_before')
          || jsonb_build_object(
            'days_before',
            ((milestone.value->>'weeks_before')::numeric * 7)::integer
          )
        else milestone.value
      end
      order by milestone.ordinality
    )
    from jsonb_array_elements(board_calendar_instances.form_data->'agm_milestones')
      with ordinality as milestone(value, ordinality)
  )
)
from board_calendar_instances
where instances.id = board_calendar_instances.id;
