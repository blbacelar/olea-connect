-- Production's older default privileges granted browser roles table access
-- even where these server-owned tables have no browser RLS policies. Keep the
-- ACL aligned with their existing service-only access model.
revoke all privileges on table
  public.grant_program_contributions,
  public.integration_events,
  public.sponsor_contacts,
  public.sponsor_contributions,
  public.sponsorships,
  public.webhook_events,
  public.ed_review_responses,
  public.ed_review_survey_distributions
from public, anon, authenticated;

-- A legacy waitlist exists only in production. It accepts public submissions
-- but has no read policy. Remove inherited reads without changing intake.
do $$
begin
  if to_regclass('public.waitlist') is not null then
    revoke all privileges on table public.waitlist from public, anon, authenticated;
    grant insert on table public.waitlist to anon, authenticated;
  end if;
end $$;
