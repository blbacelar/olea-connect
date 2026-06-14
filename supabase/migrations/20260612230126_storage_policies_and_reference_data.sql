create or replace function private.first_path_uuid(object_name text)
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  first_segment text;
begin
  first_segment := split_part(object_name, '/', 1);
  return first_segment::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

create or replace function private.can_access_event_for_any_org(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_platform_admin(null)
    or exists (
      select 1
      from public.organization_members memberships
      where memberships.user_id = (select auth.uid())
        and memberships.status = 'active'
        and private.can_access_event(target_event_id, memberships.organization_id)
    );
$$;

revoke all on function private.first_path_uuid(text) from public;
revoke all on function private.can_access_event_for_any_org(uuid) from public;
grant execute on function private.first_path_uuid(text) to authenticated;
grant execute on function private.can_access_event_for_any_org(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'organization-logos',
    'organization-logos',
    false,
    5242880,
    array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
  ),
  (
    'resource-assets',
    'resource-assets',
    false,
    262144000,
    array[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'video/mp4',
      'image/png',
      'image/jpeg',
      'image/webp'
    ]
  ),
  (
    'generated-documents',
    'generated-documents',
    false,
    26214400,
    array[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  ),
  (
    'event-recordings',
    'event-recordings',
    false,
    1073741824,
    array['video/mp4', 'audio/mpeg', 'audio/mp4']
  ),
  (
    'sponsor-logos',
    'sponsor-logos',
    true,
    5242880,
    array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
  ),
  (
    'grant-attachments',
    'grant-attachments',
    false,
    20971520,
    array[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png',
      'image/jpeg'
    ]
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "organization_logos_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'organization-logos'
    and (
      (select private.is_org_member(private.first_path_uuid(name)))
      or (select private.is_platform_admin(null))
    )
  );
create policy "organization_logos_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'organization-logos'
    and (
      (select private.has_org_role(
        private.first_path_uuid(name),
        array['owner', 'admin']::public.organization_member_role[]
      ))
      or (select private.is_platform_admin(null))
    )
  );
create policy "organization_logos_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'organization-logos'
    and (
      (select private.has_org_role(
        private.first_path_uuid(name),
        array['owner', 'admin']::public.organization_member_role[]
      ))
      or (select private.is_platform_admin(null))
    )
  )
  with check (
    bucket_id = 'organization-logos'
    and (
      (select private.has_org_role(
        private.first_path_uuid(name),
        array['owner', 'admin']::public.organization_member_role[]
      ))
      or (select private.is_platform_admin(null))
    )
  );
create policy "organization_logos_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'organization-logos'
    and (
      (select private.has_org_role(
        private.first_path_uuid(name),
        array['owner', 'admin']::public.organization_member_role[]
      ))
      or (select private.is_platform_admin(null))
    )
  );

create policy "resource_assets_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'resource-assets'
    and (
      (select private.can_access_resource_for_any_org(private.first_path_uuid(name)))
      or (select private.is_platform_admin(null))
    )
  );

create policy "generated_documents_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'generated-documents'
    and (
      (select private.is_org_member(private.first_path_uuid(name)))
      or (select private.is_platform_admin(null))
    )
  );
create policy "generated_documents_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'generated-documents'
    and (select private.is_org_member(private.first_path_uuid(name)))
  );
create policy "generated_documents_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'generated-documents'
    and (select private.is_org_member(private.first_path_uuid(name)))
  )
  with check (
    bucket_id = 'generated-documents'
    and (select private.is_org_member(private.first_path_uuid(name)))
  );
create policy "generated_documents_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'generated-documents'
    and (
      (select private.has_org_role(
        private.first_path_uuid(name),
        array['owner', 'admin']::public.organization_member_role[]
      ))
      or (select private.is_platform_admin(null))
    )
  );

create policy "event_recordings_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'event-recordings'
    and (
      (select private.can_access_event_for_any_org(private.first_path_uuid(name)))
      or (select private.is_platform_admin(null))
    )
  );

create policy "grant_attachments_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'grant-attachments'
    and (
      (select private.is_org_member(private.first_path_uuid(name)))
      or (select private.is_platform_admin(
        array['super_admin', 'grants_admin']::public.platform_role[]
      ))
    )
  );
create policy "grant_attachments_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'grant-attachments'
    and (select private.is_org_member(private.first_path_uuid(name)))
  );
create policy "grant_attachments_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'grant-attachments'
    and (select private.is_org_member(private.first_path_uuid(name)))
  )
  with check (
    bucket_id = 'grant-attachments'
    and (select private.is_org_member(private.first_path_uuid(name)))
  );
create policy "grant_attachments_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'grant-attachments'
    and (select private.is_org_member(private.first_path_uuid(name)))
  );

-- The application values are the source of truth where newer than the June draft docs.
insert into public.membership_plans (
  id,
  name,
  description,
  monthly_price_cents,
  annual_price_cents,
  included_seats,
  template_selection_limit,
  sort_order,
  features
)
values
  (
    'seedling',
    'Seedling',
    'For grassroots and small organizations choosing the resources they need now.',
    4400,
    44000,
    1,
    3,
    10,
    '[
      "Choose any 3 governance templates",
      "Branded document downloads",
      "Ebooks and tutorial videos",
      "Full Olea community access",
      "Weekly grant alerts"
    ]'::jsonb
  ),
  (
    'roots',
    'Roots',
    'A complete branded governance toolkit for organizations building capacity.',
    9900,
    99000,
    2,
    null,
    20,
    '[
      "Full governance template suite",
      "Customized branded templates",
      "Live how-to webinars",
      "Quarterly governance guide",
      "Annual organizational health check",
      "Full Olea community access"
    ]'::jsonb
  ),
  (
    'canopy',
    'Canopy',
    'The full resource library, learning calendar, and funder access.',
    22500,
    225000,
    3,
    null,
    30,
    '[
      "Everything in Roots",
      "Full library across all topics",
      "Monthly speaker webinars",
      "Funder AMA sessions",
      "Annual virtual summit",
      "Full Olea community access"
    ]'::jsonb
  ),
  (
    'harvest',
    'Harvest',
    'Full platform access plus CEO-delivered fractional administration.',
    135000,
    1350000,
    3,
    null,
    40,
    '[
      "Everything in Canopy",
      "5 hours of admin support monthly",
      "2 additional in-kind hours",
      "Board packages prepared",
      "Committee minutes drafted",
      "Monthly CEO strategy call"
    ]'::jsonb
  )
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  monthly_price_cents = excluded.monthly_price_cents,
  annual_price_cents = excluded.annual_price_cents,
  included_seats = excluded.included_seats,
  template_selection_limit = excluded.template_selection_limit,
  sort_order = excluded.sort_order,
  features = excluded.features,
  is_active = true;

insert into public.sponsorship_packages (
  id,
  name,
  annual_price_cents,
  olea_gives_contribution_cents,
  category_exclusivity,
  sort_order,
  benefits
)
values
  (
    'bronze',
    'Bronze - Community Supporter',
    250000,
    50000,
    false,
    10,
    '["Directory listing", "Community visibility"]'::jsonb
  ),
  (
    'silver',
    'Silver - Sector Partner',
    500000,
    100000,
    false,
    20,
    '["Directory listing", "Newsletter features", "Community visibility"]'::jsonb
  ),
  (
    'gold',
    'Gold - Impact Leader',
    1000000,
    250000,
    true,
    30,
    '["Category exclusivity", "Webinar participation", "Named grant eligibility"]'::jsonb
  ),
  (
    'platinum',
    'Platinum - Founding Partner',
    1500000,
    500000,
    true,
    40,
    '["Category exclusivity", "Priority programming", "Named grant eligibility"]'::jsonb
  ),
  (
    'webinar_series',
    'Webinar Series',
    550000,
    100000,
    false,
    50,
    '["Six-event webinar series"]'::jsonb
  ),
  (
    'annual_summit',
    'Annual Summit',
    750000,
    150000,
    false,
    60,
    '["Annual summit sponsorship"]'::jsonb
  )
on conflict (id) do update
set
  name = excluded.name,
  annual_price_cents = excluded.annual_price_cents,
  olea_gives_contribution_cents = excluded.olea_gives_contribution_cents,
  category_exclusivity = excluded.category_exclusivity,
  sort_order = excluded.sort_order,
  benefits = excluded.benefits,
  is_active = true;

insert into public.resource_categories (name, slug, description, sort_order)
values
  ('Governance', 'governance', 'Board, policy, and organizational governance resources.', 10),
  ('Event Planning', 'event-planning', 'Planning tools for nonprofit events and programs.', 20),
  ('HR and Volunteers', 'hr-and-volunteers', 'Human resources and volunteer management tools.', 30),
  ('Communications', 'communications', 'Communications, outreach, and reporting resources.', 40),
  ('Accreditation', 'accreditation', 'Accreditation preparation modules and templates.', 50),
  ('Grant Funding', 'grant-funding', 'Funding alerts, grant guidance, and funder resources.', 60)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.grant_programs (
  type,
  name,
  slug,
  description,
  default_award_cents,
  eligibility_rules
)
values
  (
    'quarterly',
    'Olea Gives Quarterly Community Grant',
    'quarterly-community-grant',
    'Quarterly $500 capacity grants funded by Olea Connects sponsors.',
    50000,
    '{
      "country": "CA",
      "membership_required": true,
      "cra_good_standing_required": true,
      "annual_revenue_priority_below_cents": 50000000
    }'::jsonb
  ),
  (
    'summit',
    'Olea Gives Annual Summit Capacity Grant',
    'annual-summit-capacity-grant',
    'Annual $2,500 capacity grant announced during the Olea Connects virtual summit.',
    250000,
    '{
      "country": "CA",
      "membership_required": true,
      "cra_good_standing_required": true
    }'::jsonb
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  default_award_cents = excluded.default_award_cents,
  eligibility_rules = excluded.eligibility_rules,
  is_active = true;
