create type public.template_interaction_mode as enum (
  'form',
  'survey',
  'checklist',
  'worksheet'
);

create type public.template_export_format as enum ('pdf', 'docx');

create table public.template_field_types (
  id text primary key,
  name text not null,
  description text not null,
  supports_options boolean not null default false,
  supports_subfields boolean not null default false,
  value_shape text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint template_field_types_id_format check (id ~ '^[a-z0-9_]+$'),
  constraint template_field_types_value_shape check (
    value_shape in ('string', 'number', 'boolean', 'array', 'object', 'mixed')
  )
);

insert into public.template_field_types (
  id,
  name,
  description,
  supports_options,
  supports_subfields,
  value_shape,
  sort_order
)
values
  ('text', 'Text', 'Single-line text input.', false, false, 'string', 10),
  ('textarea', 'Text area', 'Long-form multi-line text input.', false, false, 'string', 20),
  ('rich_text', 'Rich text', 'Formatted long-form content.', false, false, 'object', 30),
  ('number', 'Number', 'Numeric input with optional minimum and maximum.', false, false, 'number', 40),
  ('currency', 'Currency', 'Money value stored in minor units or decimal form.', false, false, 'number', 50),
  ('rating', 'Rating', 'Numeric rating scale with optional not-applicable value.', true, false, 'number', 60),
  ('date', 'Date', 'Calendar date without a timezone.', false, false, 'string', 70),
  ('time', 'Time', 'Time of day without a date.', false, false, 'string', 80),
  ('datetime', 'Date and time', 'Timezone-aware date and time.', false, false, 'string', 90),
  ('checkbox', 'Checkbox', 'Single true or false choice.', false, false, 'boolean', 100),
  ('select', 'Select', 'Single choice from a configured option list.', true, false, 'string', 110),
  ('multiselect', 'Multi-select', 'Multiple choices from a configured option list.', true, false, 'array', 120),
  ('repeatable', 'Repeatable group', 'An array of rows composed of nested subfields.', false, true, 'array', 130),
  ('signature', 'Signature', 'Typed or drawn signature reference.', false, false, 'object', 140),
  ('email', 'Email', 'Email address input.', false, false, 'string', 150),
  ('url', 'URL', 'Web address input.', false, false, 'string', 160),
  ('file', 'File', 'Reference to an uploaded file in Supabase Storage.', false, false, 'object', 170),
  ('heading', 'Heading', 'Display-only heading inside a section.', false, false, 'mixed', 180),
  ('paragraph', 'Paragraph', 'Display-only guidance or explanatory copy.', false, false, 'mixed', 190)
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  supports_options = excluded.supports_options,
  supports_subfields = excluded.supports_subfields,
  value_shape = excluded.value_shape,
  sort_order = excluded.sort_order,
  is_active = true;

alter table public.template_definitions
  add column interaction_mode public.template_interaction_mode not null default 'form',
  add column validation_schema jsonb not null default '{}'::jsonb,
  add constraint template_definitions_validation_schema_object check (
    jsonb_typeof(validation_schema) = 'object'
  );

alter table public.template_instances
  add column definition_version integer not null default 1,
  add column schema_snapshot jsonb not null default '{}'::jsonb,
  add column completion_percent smallint not null default 0,
  add column last_saved_at timestamptz not null default now(),
  add constraint template_instances_definition_version_positive check (
    definition_version > 0
  ),
  add constraint template_instances_schema_snapshot_object check (
    jsonb_typeof(schema_snapshot) = 'object'
  ),
  add constraint template_instances_completion_percent_range check (
    completion_percent between 0 and 100
  ),
  add constraint template_instances_completion_consistent check (
    status <> 'completed'
    or (completion_percent = 100 and completed_at is not null)
  );

alter table public.organization_resource_access
  add column locked_until timestamptz,
  add constraint organization_resource_access_lock_window check (
    locked_until is null or locked_until > starts_at
  );

create table public.template_exports (
  id uuid primary key default gen_random_uuid(),
  template_instance_id uuid not null references public.template_instances(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  format public.template_export_format not null,
  file_name text not null,
  storage_path text not null,
  definition_version integer not null,
  schema_snapshot jsonb not null,
  form_data_snapshot jsonb not null,
  branding_snapshot jsonb not null,
  checksum_sha256 text,
  generated_at timestamptz not null default now(),
  constraint template_exports_file_name_present check (char_length(trim(file_name)) > 0),
  constraint template_exports_storage_path_present check (char_length(trim(storage_path)) > 0),
  constraint template_exports_definition_version_positive check (definition_version > 0),
  constraint template_exports_schema_snapshot_object check (
    jsonb_typeof(schema_snapshot) = 'object'
  ),
  constraint template_exports_form_data_snapshot_object check (
    jsonb_typeof(form_data_snapshot) = 'object'
  ),
  constraint template_exports_branding_snapshot_object check (
    jsonb_typeof(branding_snapshot) = 'object'
  ),
  constraint template_exports_checksum_sha256_format check (
    checksum_sha256 is null or checksum_sha256 ~ '^[0-9a-f]{64}$'
  )
);

create table public.template_export_downloads (
  id uuid primary key default gen_random_uuid(),
  export_id uuid not null references public.template_exports(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  downloaded_by uuid not null references auth.users(id) on delete restrict,
  downloaded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint template_export_downloads_metadata_object check (
    jsonb_typeof(metadata) = 'object'
  )
);

create index template_definitions_field_schema_gin_idx
  on public.template_definitions using gin(field_schema);
create index template_instances_form_data_gin_idx
  on public.template_instances using gin(form_data);
create index template_instances_org_completion_idx
  on public.template_instances(organization_id, status, updated_at desc);
create index organization_resource_access_selection_lock_idx
  on public.organization_resource_access(organization_id, locked_until)
  where access_kind = 'selection';
create index template_exports_template_instance_id_idx
  on public.template_exports(template_instance_id);
create index template_exports_organization_generated_idx
  on public.template_exports(organization_id, generated_at desc);
create index template_exports_resource_id_idx
  on public.template_exports(resource_id);
create index template_exports_created_by_idx
  on public.template_exports(created_by);
create index template_export_downloads_export_id_idx
  on public.template_export_downloads(export_id);
create index template_export_downloads_organization_downloaded_idx
  on public.template_export_downloads(organization_id, downloaded_at desc);
create index template_export_downloads_downloaded_by_idx
  on public.template_export_downloads(downloaded_by);

create or replace function private.assert_template_fields(fields jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  field_definition jsonb;
  field_type text;
begin
  if jsonb_typeof(fields) <> 'array' then
    raise exception 'Template fields must be a JSON array';
  end if;

  for field_definition in
    select value from jsonb_array_elements(fields)
  loop
    if jsonb_typeof(field_definition) <> 'object' then
      raise exception 'Every template field must be a JSON object';
    end if;

    if nullif(trim(field_definition ->> 'id'), '') is null then
      raise exception 'Every template field requires an id';
    end if;

    field_type := field_definition ->> 'type';

    if not exists (
      select 1
      from public.template_field_types supported_type
      where supported_type.id = field_type
        and supported_type.is_active
    ) then
      raise exception 'Unsupported template field type: %', coalesce(field_type, '<missing>');
    end if;

    if field_type in ('select', 'multiselect')
      and jsonb_typeof(field_definition -> 'options') <> 'array'
    then
      raise exception 'Field % requires an options array', field_definition ->> 'id';
    end if;

    if field_type = 'repeatable' then
      if jsonb_typeof(field_definition -> 'subfields') <> 'array' then
        raise exception 'Repeatable field % requires a subfields array', field_definition ->> 'id';
      end if;

      perform private.assert_template_fields(field_definition -> 'subfields');
    end if;
  end loop;
end;
$$;

create or replace function private.validate_template_definition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  section_definition jsonb;
begin
  if not exists (
    select 1
    from public.resources resource
    where resource.id = new.resource_id
      and resource.type = 'template'
  ) then
    raise exception 'Template definitions can only reference template resources';
  end if;

  if jsonb_typeof(new.field_schema) <> 'object' then
    raise exception 'field_schema must be a JSON object';
  end if;

  if coalesce((new.field_schema ->> 'version')::integer, new.schema_version) < 1 then
    raise exception 'field_schema.version must be a positive integer';
  end if;

  if new.field_schema ? 'header_fields' then
    perform private.assert_template_fields(new.field_schema -> 'header_fields');
  end if;

  if jsonb_typeof(new.field_schema -> 'sections') <> 'array' then
    raise exception 'field_schema.sections must be a JSON array';
  end if;

  for section_definition in
    select value from jsonb_array_elements(new.field_schema -> 'sections')
  loop
    if jsonb_typeof(section_definition) <> 'object'
      or nullif(trim(section_definition ->> 'id'), '') is null
      or nullif(trim(section_definition ->> 'title'), '') is null
    then
      raise exception 'Every template section requires an id and title';
    end if;

    perform private.assert_template_fields(
      coalesce(section_definition -> 'questions', '[]'::jsonb)
    );
  end loop;

  return new;
exception
  when invalid_text_representation then
    raise exception 'field_schema.version must be a positive integer';
end;
$$;

create or replace function private.prepare_template_instance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_definition public.template_definitions%rowtype;
begin
  select definitions.*
  into current_definition
  from public.template_definitions definitions
  where definitions.resource_id = new.resource_id;

  if not found then
    raise exception 'No template definition exists for resource %', new.resource_id;
  end if;

  if tg_op = 'INSERT' or new.schema_snapshot = '{}'::jsonb then
    new.schema_snapshot = current_definition.field_schema;
    new.definition_version = current_definition.schema_version;
  end if;

  new.last_saved_at = now();

  if new.status = 'completed' then
    new.completion_percent = 100;
    new.completed_at = coalesce(new.completed_at, now());
  end if;

  return new;
end;
$$;

create or replace function private.prepare_template_export()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_instance public.template_instances%rowtype;
  source_definition public.template_definitions%rowtype;
begin
  select instance.*
  into source_instance
  from public.template_instances instance
  where instance.id = new.template_instance_id;

  if not found then
    raise exception 'Template instance % does not exist', new.template_instance_id;
  end if;

  select definition.*
  into source_definition
  from public.template_definitions definition
  where definition.resource_id = source_instance.resource_id;

  if new.format = 'pdf' and not source_definition.supports_pdf then
    raise exception 'This template does not support PDF export';
  end if;

  if new.format = 'docx' and not source_definition.supports_docx then
    raise exception 'This template does not support DOCX export';
  end if;

  new.organization_id = source_instance.organization_id;
  new.resource_id = source_instance.resource_id;
  new.definition_version = source_instance.definition_version;
  new.schema_snapshot = source_instance.schema_snapshot;
  new.form_data_snapshot = source_instance.form_data;
  new.branding_snapshot = source_instance.branding_snapshot;

  return new;
end;
$$;

create or replace function private.prepare_template_export_download()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select export.organization_id
  into new.organization_id
  from public.template_exports export
  where export.id = new.export_id;

  if not found then
    raise exception 'Template export % does not exist', new.export_id;
  end if;

  return new;
end;
$$;

create or replace function private.prepare_resource_selection()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.access_kind = 'selection' and new.locked_until is null then
    new.locked_until = new.starts_at + interval '12 months';
  end if;

  return new;
end;
$$;

create or replace function private.prevent_locked_resource_selection_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.access_kind = 'selection'
    and old.locked_until is not null
    and old.locked_until > now()
  then
    raise exception 'Template selection is locked until %', old.locked_until;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function private.prevent_immutable_template_event_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% records are immutable', tg_table_name;
end;
$$;

revoke all on function private.assert_template_fields(jsonb) from public;
revoke all on function private.validate_template_definition() from public;
revoke all on function private.prepare_template_instance() from public;
revoke all on function private.prepare_template_export() from public;
revoke all on function private.prepare_template_export_download() from public;
revoke all on function private.prepare_resource_selection() from public;
revoke all on function private.prevent_locked_resource_selection_change() from public;
revoke all on function private.prevent_immutable_template_event_change() from public;

create trigger template_field_types_set_updated_at
  before update on public.template_field_types
  for each row execute function private.set_updated_at();

create trigger template_definitions_validate
  before insert or update on public.template_definitions
  for each row execute function private.validate_template_definition();

create trigger template_instances_prepare
  before insert or update on public.template_instances
  for each row execute function private.prepare_template_instance();

create trigger template_exports_prepare
  before insert on public.template_exports
  for each row execute function private.prepare_template_export();

create trigger template_export_downloads_prepare
  before insert on public.template_export_downloads
  for each row execute function private.prepare_template_export_download();

create trigger organization_resource_access_prepare_selection
  before insert or update on public.organization_resource_access
  for each row execute function private.prepare_resource_selection();

create trigger organization_resource_access_prevent_locked_update
  before update on public.organization_resource_access
  for each row execute function private.prevent_locked_resource_selection_change();

create trigger organization_resource_access_prevent_locked_delete
  before delete on public.organization_resource_access
  for each row execute function private.prevent_locked_resource_selection_change();

create trigger template_exports_immutable
  before update or delete on public.template_exports
  for each row execute function private.prevent_immutable_template_event_change();

create trigger template_export_downloads_immutable
  before update or delete on public.template_export_downloads
  for each row execute function private.prevent_immutable_template_event_change();

alter table public.template_field_types enable row level security;
alter table public.template_exports enable row level security;
alter table public.template_export_downloads enable row level security;

create policy "template_field_types_read"
  on public.template_field_types for select to authenticated
  using (is_active or (select private.is_platform_admin(null)));

create policy "template_exports_select_org"
  on public.template_exports for select to authenticated
  using (
    (select private.is_org_member(organization_id))
    or (select private.is_platform_admin(null))
  );

create policy "template_exports_insert_member"
  on public.template_exports for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (select private.is_org_member(organization_id))
    and exists (
      select 1
      from public.template_instances instance
      where instance.id = template_instance_id
        and instance.organization_id = organization_id
        and instance.resource_id = resource_id
    )
  );

create policy "template_export_downloads_select_org"
  on public.template_export_downloads for select to authenticated
  using (
    (select private.is_org_member(organization_id))
    or (select private.is_platform_admin(null))
  );

create policy "template_export_downloads_insert_member"
  on public.template_export_downloads for insert to authenticated
  with check (
    downloaded_by = (select auth.uid())
    and (select private.is_org_member(organization_id))
    and exists (
      select 1
      from public.template_exports export
      where export.id = export_id
        and export.organization_id = organization_id
    )
  );

grant select on public.template_field_types to authenticated;
grant select, insert on public.template_exports, public.template_export_downloads to authenticated;
