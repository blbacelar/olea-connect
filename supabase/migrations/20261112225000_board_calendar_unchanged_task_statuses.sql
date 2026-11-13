-- A generated task may have a blank status, and older calendars may have a
-- custom status. Preserve untouched rows while validating any new status.
create or replace function private.board_calendar_status_only_change(
  before_data jsonb,
  after_data jsonb
)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  before_tasks jsonb := coalesce(before_data->'tasks', '[]'::jsonb);
  after_tasks jsonb := coalesce(after_data->'tasks', '[]'::jsonb);
  before_shape jsonb;
  after_shape jsonb;
begin
  if before_data - 'tasks' <> after_data - 'tasks'
    or jsonb_typeof(before_tasks) <> 'array'
    or jsonb_typeof(after_tasks) <> 'array'
    or jsonb_array_length(before_tasks) <> jsonb_array_length(after_tasks) then
    return false;
  end if;
  if exists (
    select 1 from jsonb_array_elements(before_tasks) as rows(task)
    where jsonb_typeof(rows.task) <> 'object'
  ) or exists (
    select 1 from jsonb_array_elements(after_tasks) as rows(task)
    where jsonb_typeof(rows.task) <> 'object'
  ) then
    return false;
  end if;
  select coalesce(jsonb_agg(task - 'status' order by position), '[]'::jsonb)
    into before_shape
  from jsonb_array_elements(before_tasks) with ordinality as rows(task, position);
  select coalesce(jsonb_agg(task - 'status' order by position), '[]'::jsonb)
    into after_shape
  from jsonb_array_elements(after_tasks) with ordinality as rows(task, position);
  if before_shape <> after_shape then return false; end if;
  if exists (
    select 1
    from jsonb_array_elements(before_tasks) with ordinality as previous(task, position)
    join jsonb_array_elements(after_tasks) with ordinality as next(task, position)
      using (position)
    where previous.task->'status' is distinct from next.task->'status'
      and (next.task->>'status' not in ('Not Started', 'In Progress', 'Complete')
        or next.task->>'status' is null)
  ) then return false; end if;
  return true;
end;
$$;
