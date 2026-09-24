-- Retain grant history, but stop new Olea applications and award decisions.
revoke insert, update, delete on public.grant_applications from authenticated;
drop policy if exists "grant_applications_insert_member" on public.grant_applications;
drop policy if exists "grant_applications_update_member" on public.grant_applications;
drop policy if exists "grant_applications_delete_draft" on public.grant_applications;
revoke execute on function public.create_grant_award(uuid, integer) from authenticated;
