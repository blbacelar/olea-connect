-- Recovered from development Supabase schema_migrations on 2026-11-12.
create table public.board_calendar_rsvps (
  id uuid primary key default gen_random_uuid(),
  template_instance_id uuid not null references public.template_instances(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  meeting_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  response text not null check (response in ('attending', 'tentative', 'not_attending')),
  responded_at timestamptz not null default now(),
  unique (template_instance_id, meeting_id, user_id),
  constraint board_calendar_rsvps_meeting_id_length check (char_length(meeting_id) between 1 and 120)
);

create index board_calendar_rsvps_org_meeting_idx
  on public.board_calendar_rsvps (organization_id, template_instance_id, meeting_id);

create or replace function private.validate_board_calendar_rsvp()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  calendar public.template_instances%rowtype;
begin
  select * into calendar
  from public.template_instances
  where id = new.template_instance_id;

  if calendar.id is null or calendar.organization_id <> new.organization_id
    or not exists (
      select 1 from public.resources
      where id = calendar.resource_id and slug = 'board-calendar-operational-workflow'
    ) then
    raise exception 'Board calendar is unavailable';
  end if;

  if not exists (
    select 1 from jsonb_array_elements(
      case when jsonb_typeof(calendar.form_data->'meetings') = 'array'
        then calendar.form_data->'meetings' else '[]'::jsonb end
    ) as meeting
    where meeting->>'id' = new.meeting_id
  ) then
    raise exception 'Meeting is unavailable';
  end if;

  return new;
end;
$$;

create trigger board_calendar_rsvps_validate
  before insert or update on public.board_calendar_rsvps
  for each row execute function private.validate_board_calendar_rsvp();

alter table public.board_calendar_rsvps enable row level security;

create policy board_calendar_rsvps_select_org
  on public.board_calendar_rsvps for select to authenticated
  using (private.is_org_member(organization_id));

create policy board_calendar_rsvps_insert_self
  on public.board_calendar_rsvps for insert to authenticated
  with check (user_id = auth.uid() and private.is_org_member(organization_id));

create policy board_calendar_rsvps_update_self
  on public.board_calendar_rsvps for update to authenticated
  using (user_id = auth.uid() and private.is_org_member(organization_id))
  with check (user_id = auth.uid() and private.is_org_member(organization_id));

grant select, insert, update on public.board_calendar_rsvps to authenticated;

revoke all on function private.validate_board_calendar_rsvp() from public;
