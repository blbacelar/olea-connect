-- Recovered from development Supabase schema_migrations on 2026-11-12.
drop policy if exists "template_exports_select_org" on public.template_exports;

create or replace function private.is_board_calendar_export(target_export_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.template_exports as exported
    join public.resources as resource on resource.id = exported.resource_id
    where exported.id = target_export_id
      and resource.slug = 'board-calendar-operational-workflow'
  );
$$;

create policy template_exports_select_org
  on public.template_exports for select to authenticated
  using (
    private.is_platform_admin(null)
    or (
      private.is_org_member(organization_id)
      and (
        not exists (
          select 1 from public.resources
          where id = resource_id and slug = 'board-calendar-operational-workflow'
        )
        or private.has_org_role(
          organization_id, array['owner', 'admin']::public.organization_member_role[]
        )
      )
    )
  );

drop policy if exists "template_export_downloads_select_org" on public.template_export_downloads;

create policy template_export_downloads_select_org
  on public.template_export_downloads for select to authenticated
  using (
    private.is_platform_admin(null)
    or (
      private.is_org_member(organization_id)
      and not private.is_board_calendar_export(export_id)
    )
    or private.has_org_role(
      organization_id, array['owner', 'admin']::public.organization_member_role[]
    )
  );

revoke all on function private.is_board_calendar_export(uuid) from public;

grant execute on function private.is_board_calendar_export(uuid) to authenticated;
