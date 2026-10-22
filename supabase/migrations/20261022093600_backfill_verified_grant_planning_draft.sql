-- Production provenance reviewed on 2026-10-22: this exact application was
-- created 0.07 seconds after its draft round by the Grant Platform create
-- flow. The organization name snapshot and requested/round amounts matched,
-- and it was the only application for the round. Do not infer ownership for
-- any other legacy draft from a client-controlled source marker alone.
-- Every guard must still match at migration time; otherwise this is a no-op.
update public.grant_rounds as round
set planning_organization_id = application.organization_id
from public.grant_applications as application
join public.organizations as organization
  on organization.id = application.organization_id
where round.id = 'd73c6672-9c5b-4099-9556-eb2490aeaa25'::uuid
  and application.id = '542c0d5c-4dbc-46bd-970f-297bf0faef61'::uuid
  and application.round_id = round.id
  and round.status = 'draft'
  and round.planning_organization_id is null
  and application.status = 'draft'
  and application.eligibility_snapshot ->> 'source' = 'module_create'
  and application.eligibility_snapshot ->> 'organization_name' = organization.name
  and application.requested_amount_cents = round.award_amount_cents
  and application.requested_amount_cents = round.budget_cents
  and round.available_awards = 1
  and abs(extract(epoch from application.created_at - round.created_at)) < 1
  and abs(extract(epoch from round.opens_at - round.created_at)) < 1
  and not exists (
    select 1
    from public.grant_applications as other_application
    where other_application.round_id = round.id
      and other_application.id <> application.id
  );
