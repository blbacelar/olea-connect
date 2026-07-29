drop policy if exists "generated_documents_update" on storage.objects;
drop policy if exists "generated_documents_delete" on storage.objects;

update public.template_definitions
set supports_docx = true
where renderer_key = 'dynamic_form';

drop trigger if exists template_exports_immutable on public.template_exports;
drop trigger if exists template_export_downloads_immutable on public.template_export_downloads;

create trigger template_exports_immutable
  before update on public.template_exports
  for each row execute function private.prevent_immutable_template_event_change();

create trigger template_export_downloads_immutable
  before update on public.template_export_downloads
  for each row execute function private.prevent_immutable_template_event_change();
