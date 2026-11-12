-- Recovered from development Supabase schema_migrations on 2026-11-12.
-- Allow the fourth Inclusion and Community Engagement item from the final partner survey.
-- Existing responses remain valid; missing C4 answers remain excluded from averages.
create or replace function private.validate_ed_review_answer_payload(
  campaign_kind public.ed_review_campaign_kind,
  payload jsonb
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  allowed_rating_pattern text;
  allowed_comment_pattern text;
begin
  if jsonb_typeof(payload) <> 'object'
    or jsonb_typeof(payload -> 'ratings') <> 'object'
    or jsonb_typeof(payload -> 'comments') <> 'object'
    or jsonb_typeof(payload -> 'overall') <> 'object'
  then
    raise exception 'The survey response is invalid.' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(payload) key
    where key not in ('ratings', 'comments', 'overall', 'context')
  ) then
    raise exception 'The survey response is invalid.' using errcode = 'P0001';
  end if;

  if pg_column_size(payload) > 65536 then
    raise exception 'The survey response is too large.' using errcode = 'P0001';
  end if;

  allowed_rating_pattern := case campaign_kind
    when 'staff' then '^S[1-6][a-c]$'
    when 'partner' then '^(A|B|C)[1-4]$|^D[1-3]$'
  end;
  allowed_comment_pattern := case campaign_kind
    when 'staff' then '^S[1-6]$'
    when 'partner' then '^[A-D]$'
  end;

  if not exists (select 1 from jsonb_each(payload -> 'ratings'))
    or exists (
      select 1
      from jsonb_each(payload -> 'ratings') answer
      where answer.key !~ allowed_rating_pattern
         or jsonb_typeof(answer.value) <> 'number'
         or (answer.value #>> '{}')::integer not between 1 and 5
    )
  then
    raise exception 'The survey ratings are invalid.' using errcode = 'P0001';
  end if;

  if exists (
      select 1
      from jsonb_each(payload -> 'comments') comment
      where comment.key !~ allowed_comment_pattern
       or jsonb_typeof(comment.value) <> 'string'
       or char_length(comment.value #>> '{}') > 2000
  ) then
    raise exception 'The survey comments are invalid.' using errcode = 'P0001';
  end if;

  if exists (
      select 1
      from jsonb_each(payload -> 'overall') answer
      where answer.key not in ('greatest_strength', 'important_change', 'additional_comments')
       or jsonb_typeof(answer.value) <> 'string'
       or char_length(answer.value #>> '{}') > 2000
  ) then
    raise exception 'The survey comments are invalid.' using errcode = 'P0001';
  end if;

  if payload ? 'context' and (
    campaign_kind <> 'partner'
    or jsonb_typeof(payload -> 'context') <> 'object'
    or exists (
      select 1
      from jsonb_each(payload -> 'context') context_item
      where context_item.key <> 'relationship_type'
         or jsonb_typeof(context_item.value) <> 'string'
         or context_item.value #>> '{}' not in ('funder', 'partner', 'community_member', 'other', 'prefer_not_to_say')
    )
  ) then
    raise exception 'The survey context is invalid.' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function private.validate_ed_review_answer_payload(
  public.ed_review_campaign_kind,
  jsonb
) from public, anon, authenticated;
