-- Recovered from development Supabase schema_migrations on 2026-11-12.
create table public.board_calendar_member_views (
  template_instance_id uuid primary key references public.template_instances(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  calendar_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint board_calendar_member_views_data_object check (jsonb_typeof(calendar_data) = 'object')
);

create index board_calendar_member_views_org_updated_idx
  on public.board_calendar_member_views (organization_id, updated_at desc);

create or replace function private.board_calendar_public_data(full_data jsonb)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'meetings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', meeting.value->>'id',
        'date', meeting.value->>'date',
        'type', meeting.value->>'type',
        'committee', meeting.value->>'committee',
        'time', meeting.value->>'time',
        'location', meeting.value->>'location',
        'virtual_link', meeting.value->>'virtual_link',
        'confirmed', meeting.value->>'confirmed'
      ) order by meeting.ordinality)
      from jsonb_array_elements(
        case when jsonb_typeof(full_data->'meetings') = 'array'
          then full_data->'meetings' else '[]'::jsonb end
      ) with ordinality as meeting(value, ordinality)
      where jsonb_typeof(meeting.value) = 'object'
    ), '[]'::jsonb),
    'annual_highlights', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', highlight.value->>'date',
        'title', highlight.value->>'title',
        'category', highlight.value->>'category'
      ) order by highlight.ordinality)
      from jsonb_array_elements(
        case when jsonb_typeof(full_data->'annual_highlights') = 'array'
          then full_data->'annual_highlights' else '[]'::jsonb end
      ) with ordinality as highlight(value, ordinality)
      where jsonb_typeof(highlight.value) = 'object'
    ), '[]'::jsonb)
  );
$$;

create or replace function private.sync_board_calendar_member_view()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.resources
    where id = new.resource_id and slug = 'board-calendar-operational-workflow'
  ) then
    return new;
  end if;

  insert into public.board_calendar_member_views (
    template_instance_id, organization_id, title, calendar_data, updated_at
  ) values (
    new.id, new.organization_id, new.title,
    private.board_calendar_public_data(new.form_data), now()
  )
  on conflict (template_instance_id) do update set
    organization_id = excluded.organization_id,
    title = excluded.title,
    calendar_data = excluded.calendar_data,
    updated_at = excluded.updated_at;
  return new;
end;
$$;

create trigger board_calendar_member_view_sync
  after insert or update of title, form_data on public.template_instances
  for each row execute function private.sync_board_calendar_member_view();

insert into public.board_calendar_member_views (
  template_instance_id, organization_id, title, calendar_data, updated_at
)
select instance.id, instance.organization_id, instance.title,
  private.board_calendar_public_data(instance.form_data), instance.updated_at
from public.template_instances as instance
join public.resources as resource on resource.id = instance.resource_id
where resource.slug = 'board-calendar-operational-workflow'
on conflict (template_instance_id) do update set
  calendar_data = excluded.calendar_data,
  title = excluded.title,
  updated_at = excluded.updated_at;

alter table public.board_calendar_member_views enable row level security;

create policy board_calendar_member_views_select_org
  on public.board_calendar_member_views for select to authenticated
  using (private.is_org_member(organization_id));

grant select on public.board_calendar_member_views to authenticated;

drop policy if exists "template_instances_select_member" on public.template_instances;

create policy template_instances_select_member
  on public.template_instances for select to authenticated
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

drop policy if exists "template_instances_update_member" on public.template_instances;

create policy template_instances_update_member
  on public.template_instances for update to authenticated
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
  )
  with check (
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

drop policy if exists "template_instances_insert_member" on public.template_instances;

create policy template_instances_insert_member
  on public.template_instances for insert to authenticated
  with check (
    created_by = auth.uid()
    and private.can_access_resource(resource_id, organization_id)
    and (
      not exists (
        select 1 from public.resources
        where id = resource_id and slug = 'board-calendar-operational-workflow'
      )
      or private.has_org_role(
        organization_id, array['owner', 'admin']::public.organization_member_role[]
      )
    )
  );

revoke all on function private.board_calendar_public_data(jsonb) from public;

revoke all on function private.sync_board_calendar_member_view() from public;
