-- An approval is a Board Chair decision, not a draft state. Prevent service
-- code or an accidental direct update from changing an approved summary.
create or replace function private.protect_approved_ed_review_compilation()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  if old.approved_at is not null and (
    new.summary is distinct from old.summary
    or new.response_count is distinct from old.response_count
    or new.generated_by is distinct from old.generated_by
    or new.cycle_id is distinct from old.cycle_id
  ) then
    raise exception 'Approved ED review summaries are immutable.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger ed_review_compilations_protect_approved
  before update on public.ed_review_compilations
  for each row execute function private.protect_approved_ed_review_compilation();
