-- Both existing environments have only one anonymous SELECT policy:
-- membership_plans. Older production default ACLs nevertheless granted anon
-- SELECT on other tables. Remove those unused grants without touching writes.
do $$
declare relation record;
begin
  for relation in
    select n.nspname, c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p', 'v', 'm', 'f')
      and c.relname <> 'membership_plans'
  loop
    execute format('revoke select on table %I.%I from anon', relation.nspname, relation.relname);
  end loop;
end $$;
