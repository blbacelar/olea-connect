begin;

select plan(6);

select ok(
  not has_function_privilege('authenticated', 'public.update_grant_planning_draft(uuid,uuid,text,text,text,integer,date)', 'EXECUTE'),
  'workspace members cannot invoke the draft update function directly'
);
select ok(
  not has_function_privilege('authenticated', 'public.delete_grant_planning_draft(uuid,uuid)', 'EXECUTE'),
  'workspace members cannot invoke the draft delete function directly'
);
select ok(
  has_function_privilege('service_role', 'public.update_grant_planning_draft(uuid,uuid,text,text,text,integer,date)', 'EXECUTE'),
  'server actions can invoke the draft update function'
);
select ok(
  has_function_privilege('service_role', 'public.delete_grant_planning_draft(uuid,uuid)', 'EXECUTE'),
  'server actions can invoke the draft delete function'
);
select throws_ok(
  $$select public.update_grant_planning_draft('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'No grant', '', '', 100, '2027-01-01')$$,
  'This workspace draft cannot be edited.',
  'a missing or cross-workspace application cannot be edited'
);
select throws_ok(
  $$select public.delete_grant_planning_draft('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002')$$,
  'This workspace draft cannot be deleted.',
  'a missing or cross-workspace application cannot be deleted'
);

select * from finish();
rollback;
