create or replace function private.prevent_locked_resource_selection_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Tenant deletion and operational cleanup run through privileged database
  -- roles. The lock protects member-driven selection changes, not cascades.
  if current_user in ('postgres', 'service_role', 'supabase_admin') then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if old.access_kind = 'selection'
    and old.locked_until is not null
    and old.locked_until > now()
  then
    raise exception 'Template selection is locked until %', old.locked_until;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.prevent_locked_resource_selection_change()
  from public;
