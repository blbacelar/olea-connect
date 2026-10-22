insert into public.template_field_types (
  id,
  name,
  description,
  supports_options,
  supports_subfields,
  value_shape,
  sort_order
)
values (
  'color',
  'Color',
  'Hex color picker stored as a #RRGGBB string.',
  false,
  false,
  'string',
  165
)
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  supports_options = excluded.supports_options,
  supports_subfields = excluded.supports_subfields,
  value_shape = excluded.value_shape,
  sort_order = excluded.sort_order,
  is_active = true;
