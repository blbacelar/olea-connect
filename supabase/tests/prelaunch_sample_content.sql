begin;

select plan(4);

select is(
  (select status::text from public.events where id = '20000000-0000-4000-8000-000000000001'),
  'archived',
  'prelaunch sample webinar one is archived'
);

select is(
  (select status::text from public.events where id = '20000000-0000-4000-8000-000000000002'),
  'archived',
  'prelaunch sample webinar two is archived'
);

select is(
  (select recording_url from public.events where id = '20000000-0000-4000-8000-000000000002'),
  null,
  'prelaunch sample recording URL is removed'
);

select is(
  (select status::text from public.grant_rounds where id = '30000000-0000-4000-8000-000000000001'),
  'draft',
  'prelaunch sample grant round is not member-visible'
);

select * from finish();

rollback;
