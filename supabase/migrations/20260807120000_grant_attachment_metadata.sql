create table if not exists public.grant_application_attachments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.grant_applications(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  file_name text not null,
  file_path text not null,
  content_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  constraint grant_application_attachments_file_name_length
    check (char_length(file_name) between 1 and 255),
  constraint grant_application_attachments_file_path_length
    check (char_length(file_path) between 1 and 1024),
  constraint grant_application_attachments_size_nonnegative
    check (size_bytes is null or size_bytes >= 0)
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'grant-attachments',
  'grant-attachments',
  false,
  26214400,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/csv',
    'text/plain'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create index if not exists grant_application_attachments_application_idx
  on public.grant_application_attachments(application_id);
create index if not exists grant_application_attachments_org_idx
  on public.grant_application_attachments(organization_id);

alter table public.grant_application_attachments enable row level security;

drop policy if exists "grant_application_attachments_select_org"
  on public.grant_application_attachments;
create policy "grant_application_attachments_select_org"
  on public.grant_application_attachments for select to authenticated
  using (
    (select private.is_org_member(organization_id))
    or (select private.is_platform_admin(array['super_admin', 'grants_admin']::public.platform_role[]))
  );

drop policy if exists "grant_application_attachments_insert_org"
  on public.grant_application_attachments;
create policy "grant_application_attachments_insert_org"
  on public.grant_application_attachments for insert to authenticated
  with check (
    (select private.is_org_member(organization_id))
    or (select private.is_platform_admin(array['super_admin', 'grants_admin']::public.platform_role[]))
  );

drop policy if exists "grant_application_attachments_update_org"
  on public.grant_application_attachments;
create policy "grant_application_attachments_update_org"
  on public.grant_application_attachments for update to authenticated
  using (
    (select private.is_org_member(organization_id))
    or (select private.is_platform_admin(array['super_admin', 'grants_admin']::public.platform_role[]))
  )
  with check (
    (select private.is_org_member(organization_id))
    or (select private.is_platform_admin(array['super_admin', 'grants_admin']::public.platform_role[]))
  );

drop policy if exists "grant_application_attachments_delete_org"
  on public.grant_application_attachments;
create policy "grant_application_attachments_delete_org"
  on public.grant_application_attachments for delete to authenticated
  using (
    (select private.is_org_member(organization_id))
    or (select private.is_platform_admin(array['super_admin', 'grants_admin']::public.platform_role[]))
  );

grant select, insert, update, delete on public.grant_application_attachments to authenticated;
