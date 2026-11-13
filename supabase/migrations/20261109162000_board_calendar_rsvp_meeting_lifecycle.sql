-- Recovered from development Supabase schema_migrations on 2026-11-12.
update public.template_instances as calendar
set form_data = jsonb_set(
  calendar.form_data,
  '{meetings}',
  (
    select jsonb_agg(
      case when jsonb_typeof(meeting.value) = 'object'
        and nullif(meeting.value->>'id', '') is null
      then meeting.value || jsonb_build_object('id', 'meeting-' || gen_random_uuid()::text)
      else meeting.value end
      order by meeting.ordinality
    )
    from jsonb_array_elements(calendar.form_data->'meetings') with ordinality as meeting(value, ordinality)
  )
)
where jsonb_typeof(calendar.form_data->'meetings') = 'array'
  and exists (
    select 1 from public.resources
    where id = calendar.resource_id and slug = 'board-calendar-operational-workflow'
  )
  and exists (
    select 1 from jsonb_array_elements(calendar.form_data->'meetings') as meeting(value)
    where jsonb_typeof(meeting.value) = 'object'
      and nullif(meeting.value->>'id', '') is null
  );

create or replace function private.purge_deleted_board_calendar_rsvps()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.form_data->'meetings' is not distinct from new.form_data->'meetings' then
    return new;
  end if;

  delete from public.board_calendar_rsvps as rsvp
  where rsvp.template_instance_id = new.id
    and not exists (
      select 1 from jsonb_array_elements(
        case when jsonb_typeof(new.form_data->'meetings') = 'array'
          then new.form_data->'meetings' else '[]'::jsonb end
      ) as meeting(value)
      where meeting.value->>'id' = rsvp.meeting_id
    );
  return new;
end;
$$;

create trigger board_calendar_rsvps_purge_deleted_meetings
  after update of form_data on public.template_instances
  for each row execute function private.purge_deleted_board_calendar_rsvps();

revoke all on function private.purge_deleted_board_calendar_rsvps() from public;
