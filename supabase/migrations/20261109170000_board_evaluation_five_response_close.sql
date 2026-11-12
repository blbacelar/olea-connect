-- Recovered from development Supabase schema_migrations on 2026-11-12.
-- Match the board evaluation privacy threshold enforced in application code.
create or replace function private.guard_board_evaluation_close()
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
    if v_responses < 5 then
      raise exception 'At least 5 board members must respond before you can close the evaluation.';
    end if;
    new.closed_at := now();
  end if;
  return new;
end;
$$;
