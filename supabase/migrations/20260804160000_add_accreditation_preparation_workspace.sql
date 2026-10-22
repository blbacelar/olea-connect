insert into public.resource_categories (name, slug, description, sort_order)
values (
  'Accreditation',
  'accreditation',
  'Accreditation preparation modules and templates.',
  50
)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.resources (
  id,
  category_id,
  type,
  status,
  slug,
  title,
  summary,
  description,
  estimated_minutes,
  published_at,
  is_featured
)
values (
  '10000000-0000-4000-8000-000000000062',
  (select id from public.resource_categories where slug = 'accreditation'),
  'template',
  'published',
  'imagine-canada-accreditation-prep',
  'Accreditation Preparation Workspace',
  'Prepare Imagine Canada evidence, policies, approvals, and submission readiness in one workspace.',
  'A document-based accreditation preparation workspace for organizing evidence, creating missing policies, tracking board approvals, and validating readiness against Imagine Canada standards.',
  75,
  '2026-08-04T16:00:00Z',
  true
)
on conflict (id) do update
set
  category_id = excluded.category_id,
  type = excluded.type,
  status = excluded.status,
  slug = excluded.slug,
  title = excluded.title,
  summary = excluded.summary,
  description = excluded.description,
  estimated_minutes = excluded.estimated_minutes,
  published_at = excluded.published_at,
  is_featured = excluded.is_featured;

insert into public.template_definitions (
  resource_id,
  renderer_key,
  schema_version,
  interaction_mode,
  field_schema,
  default_values,
  supports_pdf,
  supports_docx
)
values (
  '10000000-0000-4000-8000-000000000062',
  'dynamic_form',
  1,
  'form',
  '{
    "version": 1,
    "presentation": {
      "section_layout": "tabs",
      "module": "accreditation_preparation",
      "document_count": 36,
      "source": "custom_module"
    },
    "sections": [
      {
        "id": "A",
        "title": "Board Governance",
        "questions": []
      },
      {
        "id": "B",
        "title": "Financial Accountability",
        "questions": []
      },
      {
        "id": "C",
        "title": "Fundraising",
        "questions": []
      },
      {
        "id": "D",
        "title": "Staff Management",
        "questions": []
      },
      {
        "id": "E",
        "title": "Volunteer Involvement",
        "questions": []
      }
    ]
  }'::jsonb,
  '{}'::jsonb,
  true,
  false
)
on conflict (resource_id) do update
set
  renderer_key = excluded.renderer_key,
  schema_version = excluded.schema_version,
  interaction_mode = excluded.interaction_mode,
  field_schema = excluded.field_schema,
  default_values = excluded.default_values,
  supports_pdf = excluded.supports_pdf,
  supports_docx = excluded.supports_docx;

insert into public.resource_plan_access (resource_id, plan_id)
values
  ('10000000-0000-4000-8000-000000000062', 'roots'),
  ('10000000-0000-4000-8000-000000000062', 'canopy'),
  ('10000000-0000-4000-8000-000000000062', 'harvest')
on conflict do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'accreditation-evidence',
  'accreditation-evidence',
  false,
  15728640,
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

drop policy if exists "accreditation_evidence_select" on storage.objects;
create policy "accreditation_evidence_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'accreditation-evidence'
    and (
      (select private.is_org_member(private.first_path_uuid(name)))
      or (select private.is_platform_admin(null))
    )
  );

drop policy if exists "accreditation_evidence_insert" on storage.objects;
create policy "accreditation_evidence_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'accreditation-evidence'
    and (select private.is_org_member(private.first_path_uuid(name)))
  );

drop policy if exists "accreditation_evidence_delete" on storage.objects;
create policy "accreditation_evidence_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'accreditation-evidence'
    and (
      (select private.has_org_role(
        private.first_path_uuid(name),
        array['owner', 'admin']::public.organization_member_role[]
      ))
      or (select private.is_platform_admin(null))
    )
  );
