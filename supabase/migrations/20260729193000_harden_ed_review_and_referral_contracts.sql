-- RLS policies that call a private SECURITY DEFINER helper still require the
-- invoking role to have EXECUTE. The helper remains schema-private and exposes
-- only a boolean authorization decision.
grant execute on function private.is_ed_review_reviewer(uuid) to authenticated;

-- Referral codes are generated after an organization is created. Do not assume
-- that UUID prefixes are unique: retry with random bytes when a code collision
-- occurs while preserving an already-created code for idempotent trigger runs.
create or replace function private.create_organization_referral_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  generated_code text;
  attempts integer := 0;
begin
  loop
    attempts := attempts + 1;
    if attempts > 8 then
      raise exception 'Could not generate a unique referral code.' using errcode = '23505';
    end if;

    generated_code := 'OLEA-' || upper(left(replace(gen_random_uuid()::text, '-', ''), 16));

    begin
      insert into public.referral_codes (organization_id, code)
      values (new.id, generated_code)
      on conflict (organization_id) do nothing;
      return new;
    exception
      when unique_violation then
        -- A collision on code is safe to retry. An organization conflict is
        -- handled above, so retries never overwrite an existing referral code.
        null;
    end;
  end loop;
end;
$$;
