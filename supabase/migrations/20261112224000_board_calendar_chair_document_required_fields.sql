-- Require numeric file size and a meeting scope for documents added by a Chair.
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
      or document - array[
        'id', 'category', 'content_type', 'confidential', 'file_name', 'meeting_id',
        'name', 'size', 'size_label', 'storage_path', 'uploaded_at', 'url'
      ] <> '{}'::jsonb
      or coalesce(document->'confidential', 'false'::jsonb) <> 'true'::jsonb
      or coalesce(document->>'url', '') <> ''
      or length(coalesce(document->>'name', '')) not between 1 and 200
      or btrim(coalesce(document->>'name', '')) = ''
      or length(coalesce(document->>'category', '')) not between 1 and 100
      or btrim(coalesce(document->>'category', '')) = ''
      or length(coalesce(document->>'file_name', '')) not between 1 and 255
      or btrim(coalesce(document->>'file_name', '')) = ''
      or coalesce(jsonb_typeof(document->'size'), '') <> 'number'
      or (document->>'size')::numeric not between 0 and 26214400
      or coalesce(jsonb_typeof(document->'meeting_id'), '') <> 'string'
      or (document->>'meeting_id' <> '' and not exists (
        select 1 from jsonb_array_elements(coalesce(before_data->'meetings', '[]'::jsonb))
          with ordinality as meetings(meeting, position)
        where coalesce(meetings.meeting->>'id', 'meeting-' || (meetings.position - 1)::text)
          = document->>'meeting_id'
      ))
      or coalesce(document->>'uploaded_at', '') !~
        '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?Z$'
      or not exists (
        select 1 from storage.objects object
        where object.bucket_id = 'board-package-documents' and object.name = path
      ) then return false;
    end if;
  end loop;
  return true;
end;
$$;
