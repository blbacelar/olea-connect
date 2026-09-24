begin;

select plan(4);

select ok(
  not has_table_privilege('authenticated', 'public.grant_applications', 'INSERT'),
  'members cannot create Olea grant applications'
);
select ok(
  not has_table_privilege('authenticated', 'public.grant_applications', 'UPDATE'),
  'members cannot reopen or edit old applications directly'
);
select ok(
  has_table_privilege('authenticated', 'public.grant_applications', 'SELECT'),
  'members retain access to historical applications'
);
select ok(
  not has_function_privilege('authenticated', 'public.create_grant_award(uuid, integer)', 'EXECUTE'),
  'members cannot create new Olea grant awards'
);

select * from finish();
rollback;
