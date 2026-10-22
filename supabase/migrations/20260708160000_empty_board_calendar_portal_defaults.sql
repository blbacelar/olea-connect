update public.template_definitions definitions
set
  default_values = coalesce(definitions.default_values, '{}'::jsonb)
    || jsonb_build_object(
      'organization_name', '',
      'fiscal_year', '',
      'administrator', '',
      'administrator_email', '',
      'executive_director', '',
      'board_chair', '',
      'committees', '[]'::jsonb,
      'operational_task_rules', '[]'::jsonb,
      'meetings', '[]'::jsonb,
      'annual_highlights', '[]'::jsonb,
      'monthly_calendar_month', '',
      'monthly_calendar_year', '',
      'monthly_priorities', '[]'::jsonb,
      'tasks', '[]'::jsonb,
      'agm_date', '',
      'agm_milestones', '[]'::jsonb,
      'event_categories', '[]'::jsonb
    ),
  updated_at = now()
from public.resources resources
where resources.id = definitions.resource_id
  and resources.slug = 'board-calendar-operational-workflow';
