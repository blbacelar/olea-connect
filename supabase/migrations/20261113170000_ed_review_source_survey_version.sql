-- Existing anonymous campaigns keep their original agreement-scale instrument.
-- Newly created campaigns use the standalone HTML's performance-scale instrument.
alter table public.ed_review_campaigns
  add column instrument_version integer not null default 1;
alter table public.ed_review_campaigns
  alter column instrument_version set default 2;
alter table public.ed_review_campaigns
  add constraint ed_review_campaigns_instrument_version
  check (instrument_version in (1, 2));

update public.ed_review_campaigns campaign
set instrument_version = 2
where not exists (
  select 1 from public.ed_review_responses response
  where response.campaign_id = campaign.id
);

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
  instrument integer;
begin
  if jsonb_typeof(payload) <> 'object'
    or jsonb_typeof(payload -> 'ratings') <> 'object'
    or jsonb_typeof(payload -> 'comments') <> 'object'
    or jsonb_typeof(payload -> 'overall') <> 'object'
  then
    raise exception 'The survey response is invalid.' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from jsonb_object_keys(payload) key
    where key not in ('ratings', 'comments', 'overall', 'context', 'meta', 'instrument_version')
  ) or pg_column_size(payload) > 65536 then
    raise exception 'The survey response is invalid.' using errcode = 'P0001';
  end if;

  if payload ? 'instrument_version' then
    if jsonb_typeof(payload -> 'instrument_version') <> 'number'
      or payload ->> 'instrument_version' <> '2'
    then
      raise exception 'The survey instrument is invalid.' using errcode = 'P0001';
    end if;
    instrument := 2;
  else
    instrument := 1;
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
      select 1 from jsonb_each(payload -> 'ratings') answer
      where answer.key !~ allowed_rating_pattern
        or jsonb_typeof(answer.value) <> 'number'
        or answer.value #>> '{}' not in ('1', '2', '3', '4', '5')
    )
  then
    raise exception 'The survey ratings are invalid.' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from jsonb_each(payload -> 'comments') comment
    where comment.key !~ allowed_comment_pattern
      or jsonb_typeof(comment.value) <> 'string'
      or char_length(comment.value #>> '{}') > 2000
  ) or exists (
    select 1 from jsonb_each(payload -> 'overall') answer
    where answer.key not in ('greatest_strength', 'important_change', 'additional_comments')
      or jsonb_typeof(answer.value) <> 'string'
      or char_length(answer.value #>> '{}') > 2000
  ) then
    raise exception 'The survey comments are invalid.' using errcode = 'P0001';
  end if;

  if payload ? 'context' then
    if campaign_kind <> 'partner'
      or jsonb_typeof(payload -> 'context') <> 'object'
    then
      raise exception 'The survey context is invalid.' using errcode = 'P0001';
    end if;
    if instrument = 1 and exists (
      select 1 from jsonb_each(payload -> 'context') context_item
      where context_item.key <> 'relationship_type'
        or jsonb_typeof(context_item.value) <> 'string'
        or context_item.value #>> '{}' not in
          ('funder', 'partner', 'community_member', 'other', 'prefer_not_to_say')
    ) then
      raise exception 'The survey context is invalid.' using errcode = 'P0001';
    end if;
    if instrument = 2 and exists (
      select 1 from jsonb_each(payload -> 'context') context_item
      where context_item.key not in
        ('sector_type', 'engagement_length', 'engagement_nature')
        or jsonb_typeof(context_item.value) <> 'string'
        or char_length(context_item.value #>> '{}') > case context_item.key
          when 'engagement_length' then 60 else 80 end
    ) then
      raise exception 'The survey context is invalid.' using errcode = 'P0001';
    end if;
  end if;

  if payload ? 'meta' then
    if instrument <> 2 or jsonb_typeof(payload -> 'meta') <> 'object'
      or exists (
        select 1 from jsonb_each(payload -> 'meta') item
        where item.key not in ('review_period', 'reply_by')
          or jsonb_typeof(item.value) <> 'string'
          or char_length(item.value #>> '{}') > 120
      )
    then
      raise exception 'The survey metadata is invalid.' using errcode = 'P0001';
    end if;
  end if;
end;
$$;

revoke all on function private.validate_ed_review_answer_payload(
  public.ed_review_campaign_kind, jsonb
) from public, anon, authenticated;

-- The RPC calls the validator. This trigger also prevents a direct privileged
-- write from assigning answers to a campaign with another scale.
create function private.ed_review_response_instrument_guard()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  expected_version integer;
  submitted_version integer;
begin
  select instrument_version into expected_version
  from public.ed_review_campaigns where id = new.campaign_id;
  if not found then
    raise exception 'This survey campaign is unavailable.' using errcode = 'P0001';
  end if;
  perform private.validate_ed_review_answer_payload(
    (select kind from public.ed_review_campaigns where id = new.campaign_id),
    new.answers
  );
  submitted_version := case
    when new.answers ? 'instrument_version' then 2 else 1 end;
  if submitted_version <> expected_version then
    raise exception 'This survey questionnaire version has changed.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function private.ed_review_response_instrument_guard()
  from public, anon, authenticated;

create trigger ed_review_response_instrument_guard
before insert or update of campaign_id, answers on public.ed_review_responses
for each row execute function private.ed_review_response_instrument_guard();
