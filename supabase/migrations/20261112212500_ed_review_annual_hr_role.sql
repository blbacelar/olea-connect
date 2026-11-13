-- Match the annual ED review template's Director, HR / People & Culture access role.
alter table public.ed_review_annual_access
  drop constraint if exists ed_review_annual_access_role_check;

alter table public.ed_review_annual_access
  add constraint ed_review_annual_access_role_check
  check (role in ('ed', 'admin', 'hr', 'cfo', 'full'));
