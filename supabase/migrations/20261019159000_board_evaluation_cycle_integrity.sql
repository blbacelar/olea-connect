-- Response submission and cycle closing must contend for the same row lock.
-- A response waiting behind a close sees the closed cycle and fails; a close
-- waiting behind a response counts that committed response before finishing.
create function private.guard_board_evaluation_response()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cycle public.board_evaluation_cycles%rowtype;
begin
  if tg_op = 'UPDATE' and (
    new.cycle_id is distinct from old.cycle_id
    or new.organization_id is distinct from old.organization_id
    or new.respondent_id is distinct from old.respondent_id
  ) then
    raise exception 'A board evaluation response cannot change its cycle or respondent.';
  end if;

  select * into v_cycle
  from public.board_evaluation_cycles
  where id = new.cycle_id and organization_id = new.organization_id
  for update;
  if not found or v_cycle.status <> 'open'
    or (v_cycle.closes_on is not null and v_cycle.closes_on < current_date) then
    raise exception 'This board evaluation is closed.';
  end if;
  return new;
end;
$$;

create trigger board_evaluation_responses_require_open_cycle
before insert or update on public.board_evaluation_responses
for each row execute function private.guard_board_evaluation_response();

create function private.guard_board_evaluation_close()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_responses integer;
begin
  if old.status = 'open' and new.status = 'closed' then
    select count(*) into v_responses
    from public.board_evaluation_responses
    where cycle_id = new.id and organization_id = new.organization_id;
    if v_responses < 3 then
      raise exception 'At least 3 board members must respond before you can close the evaluation.';
    end if;
    new.closed_at := now();
  end if;
  return new;
end;
$$;

create trigger board_evaluation_cycles_require_responses
before update of status on public.board_evaluation_cycles
for each row execute function private.guard_board_evaluation_close();
