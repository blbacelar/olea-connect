insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'board-package-documents',
  'board-package-documents',
  false,
  26214400,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "board_package_documents_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'board-package-documents'
    and (
      (select private.is_org_member(private.first_path_uuid(replace(name, 'workspaces/', ''))))
      or (select private.is_platform_admin(null))
    )
  );
