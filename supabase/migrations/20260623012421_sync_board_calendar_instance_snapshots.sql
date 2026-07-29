update public.template_instances instance
set
  schema_snapshot = definition.field_schema,
  definition_version = definition.schema_version
from public.resources resource
join public.template_definitions definition
  on definition.resource_id = resource.id
where instance.resource_id = resource.id
  and resource.slug = 'board-calendar-operational-workflow'
  and (
    instance.schema_snapshot is distinct from definition.field_schema
    or instance.definition_version is distinct from definition.schema_version
  );
