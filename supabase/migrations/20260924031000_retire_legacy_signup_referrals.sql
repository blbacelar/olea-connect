-- Preserve historical organization referral records while ending grant/coaching rewards.
update public.referral_codes set active = false where active;

create or replace function public.finalize_signup_referral(
  target_request_id uuid,
  target_organization_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.workspace_provisioning_requests
  set referral_status = 'rejected'
  where id = target_request_id
    and referral_code is not null
    and btrim(referral_code) <> '';

  return jsonb_build_object('status', 'retired');
end;
$$;
