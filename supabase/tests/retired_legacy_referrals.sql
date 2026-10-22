begin;

select plan(3);

select is(
  (select count(*)::integer from public.referral_codes where active),
  0,
  'legacy organization referral codes are inactive'
);
select ok(
  position(
    'insert into public.referral_rewards' in lower(
      pg_get_functiondef('public.finalize_signup_referral(uuid,uuid)'::regprocedure)
    )
  ) = 0,
  'legacy signup finalization cannot credit grant or coaching rewards'
);
select ok(
  not has_function_privilege('authenticated', 'public.finalize_signup_referral(uuid, uuid)', 'EXECUTE'),
  'members cannot call the legacy finalizer directly'
);

select * from finish();
rollback;
