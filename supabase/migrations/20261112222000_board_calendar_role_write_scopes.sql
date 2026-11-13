-- Executives may advance staff workflow status. Chairs may edit meeting
-- documents and add/remove uploaded package files, but may not rewrite file
-- metadata or reference files outside this exact calendar session.
create or replace function private.board_calendar_status_only_change(
  before_data jsonb,
  after_data jsonb
)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  before_tasks jsonb := coalesce(before_data->'tasks', '[]'::jsonb);
  after_tasks jsonb := coalesce(after_data->'tasks', '[]'::jsonb);
  before_shape jsonb;
  after_shape jsonb;
begin
  if before_data - 'tasks' <> after_data - 'tasks'
    or jsonb_typeof(before_tasks) <> 'array'
    or jsonb_typeof(after_tasks) <> 'array'
    or jsonb_array_length(before_tasks) <> jsonb_array_length(after_tasks) then
    return false;
  end if;
  select coalesce(jsonb_agg(task - 'status' order by position), '[]'::jsonb)
    into before_shape
  from jsonb_array_elements(before_tasks) with ordinality as rows(task, position);
  select coalesce(jsonb_agg(task - 'status' order by position), '[]'::jsonb)
    into after_shape
  from jsonb_array_elements(after_tasks) with ordinality as rows(task, position);
  if before_shape <> after_shape then return false; end if;
  if exists (
    select 1 from jsonb_array_elements(after_tasks) as rows(task)
    where rows.task->>'status' not in ('Not Started', 'In Progress', 'Complete')
       or rows.task->>'status' is null
  ) then return false; end if;
  return true;
end;
$$;

create or replace function private.board_calendar_chair_documents_allowed(
  before_data jsonb,
  after_data jsonb,
  target_organization_id uuid,
  target_instance_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  old_documents jsonb := coalesce(before_data->'documents', '[]'::jsonb);
  new_documents jsonb := coalesce(after_data->'documents', '[]'::jsonb);
  document jsonb;
  prior jsonb;
  document_id text;
  path text;
  seen_ids text[] := '{}';
begin
  if jsonb_typeof(old_documents) <> 'array'
    or jsonb_typeof(new_documents) <> 'array'
    or jsonb_array_length(new_documents) > 400 then
    return false;
  end if;
  for document in select value from jsonb_array_elements(new_documents) loop
    if jsonb_typeof(document) <> 'object' then return false; end if;
    document_id := document->>'id';
    if document_id is null or document_id = '' or document_id = any(seen_ids) then
      return false;
    end if;
    seen_ids := array_append(seen_ids, document_id);
    select value into prior from jsonb_array_elements(old_documents)
      where value->>'id' = document_id limit 1;
    if prior is not null then
      if document <> prior then return false; end if;
      continue;
    end if;
    path := document->>'storage_path';
    if path is null or path not like
      'workspaces/' || target_organization_id::text || '/board-calendar/' || target_instance_id::text || '/%'
      or coalesce(document->'confidential', 'false'::jsonb) <> 'true'::jsonb
      or coalesce(document->>'url', '') <> ''
      or length(coalesce(document->>'name', '')) not between 1 and 200
      or length(coalesce(document->>'category', '')) > 100
      or length(coalesce(document->>'file_name', '')) not between 1 and 255
      or not exists (
        select 1 from storage.objects object
        where object.bucket_id = 'board-package-documents' and object.name = path
      ) then return false;
    end if;
  end loop;
  return true;
end;
$$;

create or replace function private.enforce_board_calendar_instance_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  calendar_resource_id uuid := '10000000-0000-4000-8000-000000000007';
  calendar_role text;
  metadata_unchanged boolean;
begin
  if tg_op = 'INSERT' then
    if new.resource_id <> calendar_resource_id then return new; end if;
  elsif new.resource_id <> calendar_resource_id
    and old.resource_id <> calendar_resource_id then
    return new;
  end if;

  if (select auth.role()) = 'service_role' then return new; end if;
  calendar_role := private.board_calendar_role(new.organization_id);
  if calendar_role = 'administrator' then return new; end if;
  if tg_op = 'INSERT' then
    raise exception 'This Board Calendar role cannot create a calendar.';
  end if;

  metadata_unchanged := new.id = old.id
    and new.created_by = old.created_by
    and new.organization_id = old.organization_id
    and new.resource_id = old.resource_id
    and new.title is not distinct from old.title
    and new.status is not distinct from old.status
    and new.schema_snapshot is not distinct from old.schema_snapshot
    and new.definition_version is not distinct from old.definition_version
    and new.branding_snapshot is not distinct from old.branding_snapshot
    and new.completion_percent is not distinct from old.completion_percent;
  if not metadata_unchanged then
    raise exception 'This Board Calendar role cannot change calendar settings.';
  end if;

  if calendar_role = 'executive'
    and private.board_calendar_status_only_change(old.form_data, new.form_data) then
    return new;
  end if;
  if calendar_role = 'chair'
    and old.form_data - 'meeting_documents' - 'documents' =
      new.form_data - 'meeting_documents' - 'documents'
    and private.board_calendar_chair_documents_allowed(
      old.form_data, new.form_data, new.organization_id, new.id
    ) then
    return new;
  end if;

  raise exception 'This Board Calendar role cannot change this calendar.';
end;
$$;
