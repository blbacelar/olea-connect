-- Anonymous ED/CEO feedback is intentionally modelled separately from
-- invitation delivery. A response has no user, recipient, device, or request
-- identity; campaign links are shared, high-entropy capabilities.

create type public.ed_review_cycle_status as enum (
  'draft',
  'open',
  'closed',
  'archived'
);

create type public.ed_review_campaign_kind as enum ('staff', 'partner');

create type public.ed_review_distribution_status as enum (
  'queued',
  'sent',
  'failed'
);

create type public.ed_review_reviewer_role as enum (
  'board_chair',
  'hr_reviewer',
  'privileged_auditor'
);

create table public.ed_review_cycles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null default 'ED/CEO annual review',
  review_year integer not null default extract(year from now())::integer,
  status public.ed_review_cycle_status not null default 'draft',
  minimum_response_count integer not null default 3,
  created_by uuid not null references auth.users(id) on delete restrict,
  opened_at timestamptz,
  closed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ed_review_cycles_title_length
    check (char_length(trim(title)) between 3 and 160),
  constraint ed_review_cycles_year_range
    check (review_year between 2000 and 2100),
  constraint ed_review_cycles_minimum_responses
    check (minimum_response_count between 3 and 1000),
  constraint ed_review_cycles_dates_consistent
    check (
      (opened_at is null or opened_at >= created_at)
      and (closed_at is null or opened_at is null or closed_at >= opened_at)
    )
);

create table public.ed_review_reviewer_assignments (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.ed_review_cycles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.ed_review_reviewer_role not null,
  granted_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (cycle_id, user_id, role)
);

create table public.ed_review_campaigns (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.ed_review_cycles(id) on delete cascade,
  kind public.ed_review_campaign_kind not null,
  title text not null,
  token_hash text not null unique,
  status public.ed_review_cycle_status not null default 'draft',
  opens_at timestamptz not null default now(),
  closes_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ed_review_campaigns_title_length
    check (char_length(trim(title)) between 3 and 160),
  constraint ed_review_campaigns_token_hash
    check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint ed_review_campaigns_dates
    check (closes_at is null or closes_at > opens_at)
);

-- Distribution records exist solely to deliver a generic shared link. Do not
-- add a response foreign key, token, IP, user agent, or respondent identity.
create table public.ed_review_survey_distributions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.ed_review_campaigns(id) on delete cascade,
  recipient_email text not null,
  recipient_name text,
  status public.ed_review_distribution_status not null default 'queued',
  provider_message_id text,
  sent_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint ed_review_distribution_email
    check (recipient_email = lower(trim(recipient_email))),
  constraint ed_review_distribution_email_format
    check (recipient_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint ed_review_distribution_name_length
    check (recipient_name is null or char_length(trim(recipient_name)) <= 160),
  constraint ed_review_distribution_failure_length
    check (failure_reason is null or char_length(failure_reason) <= 600)
);

-- answers is deidentified survey content only. The idempotency hash is a
-- browser-generated random value that prevents accidental duplicate submits;
-- it must never be derived from a recipient or device identifier.
create table public.ed_review_responses (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.ed_review_campaigns(id) on delete cascade,
  idempotency_hash text not null,
  answers jsonb not null,
  submitted_at timestamptz not null default now(),
  unique (campaign_id, idempotency_hash),
  constraint ed_review_responses_idempotency_hash
    check (idempotency_hash ~ '^[0-9a-f]{64}$'),
  constraint ed_review_responses_answers_object
    check (jsonb_typeof(answers) = 'object'),
  constraint ed_review_responses_answers_size
    check (pg_column_size(answers) <= 65536)
);

create table public.ed_review_compilations (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.ed_review_cycles(id) on delete cascade,
  version integer not null,
  response_count integer not null,
  summary jsonb not null,
  generated_by uuid not null references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle_id, version),
  constraint ed_review_compilations_version check (version >= 1),
  constraint ed_review_compilations_response_count check (response_count >= 3),
  constraint ed_review_compilations_summary_object check (jsonb_typeof(summary) = 'object')
);

create table public.ed_review_audit_events (
  id bigint generated always as identity primary key,
  cycle_id uuid not null references public.ed_review_cycles(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ed_review_audit_event_type check (char_length(trim(event_type)) between 3 and 100),
  constraint ed_review_audit_details_object check (jsonb_typeof(details) = 'object')
);

create index ed_review_cycles_organization_idx
  on public.ed_review_cycles(organization_id, review_year desc);
create index ed_review_reviewer_assignments_user_idx
  on public.ed_review_reviewer_assignments(user_id, cycle_id);
create index ed_review_campaigns_cycle_idx
  on public.ed_review_campaigns(cycle_id, kind);
create index ed_review_distributions_campaign_idx
  on public.ed_review_survey_distributions(campaign_id, created_at desc);
create index ed_review_responses_campaign_idx
  on public.ed_review_responses(campaign_id, submitted_at);
create index ed_review_compilations_cycle_idx
  on public.ed_review_compilations(cycle_id, version desc);
create index ed_review_audit_cycle_idx
  on public.ed_review_audit_events(cycle_id, created_at desc);

create trigger ed_review_cycles_set_updated_at
  before update on public.ed_review_cycles
  for each row execute function private.set_updated_at();

create trigger ed_review_campaigns_set_updated_at
  before update on public.ed_review_campaigns
  for each row execute function private.set_updated_at();

create trigger ed_review_compilations_set_updated_at
  before update on public.ed_review_compilations
  for each row execute function private.set_updated_at();

create or replace function private.is_ed_review_reviewer(target_cycle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.ed_review_reviewer_assignments assignments
    where assignments.cycle_id = target_cycle_id
      and assignments.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_ed_review_reviewer(uuid)
  from public, anon, authenticated;

-- Review data is not reachable by normal organization membership. The
-- application uses a server-side service client only after it verifies an
-- explicit assignment; the policies provide a second line of defence for any
-- authenticated direct Data API request.
alter table public.ed_review_cycles enable row level security;
alter table public.ed_review_reviewer_assignments enable row level security;
alter table public.ed_review_campaigns enable row level security;
alter table public.ed_review_survey_distributions enable row level security;
alter table public.ed_review_responses enable row level security;
alter table public.ed_review_compilations enable row level security;
alter table public.ed_review_audit_events enable row level security;

revoke all on public.ed_review_cycles from public, anon;
revoke all on public.ed_review_reviewer_assignments from public, anon;
revoke all on public.ed_review_campaigns from public, anon;
revoke all on public.ed_review_survey_distributions from public, anon;
revoke all on public.ed_review_responses from public, anon;
revoke all on public.ed_review_compilations from public, anon;
revoke all on public.ed_review_audit_events from public, anon;

grant select on public.ed_review_cycles,
  public.ed_review_reviewer_assignments,
  public.ed_review_campaigns,
  public.ed_review_compilations,
  public.ed_review_audit_events to authenticated;

create policy ed_review_cycles_select_assigned
  on public.ed_review_cycles for select to authenticated
  using ((select private.is_ed_review_reviewer(id)));

create policy ed_review_assignments_select_assigned
  on public.ed_review_reviewer_assignments for select to authenticated
  using ((select private.is_ed_review_reviewer(cycle_id)));

create policy ed_review_campaigns_select_assigned
  on public.ed_review_campaigns for select to authenticated
  using ((select private.is_ed_review_reviewer(cycle_id)));

create policy ed_review_compilations_select_assigned
  on public.ed_review_compilations for select to authenticated
  using ((select private.is_ed_review_reviewer(cycle_id)));

create policy ed_review_audit_select_assigned
  on public.ed_review_audit_events for select to authenticated
  using ((select private.is_ed_review_reviewer(cycle_id)));

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
    when 'partner' then '^(A|B)[1-4]$|^(C|D)[1-3]$'
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

create or replace function public.submit_ed_review_response(
  p_token_hash text,
  p_idempotency_hash text,
  p_answers jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  campaign_row public.ed_review_campaigns%rowtype;
  cycle_row public.ed_review_cycles%rowtype;
  response_id uuid;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$'
    or p_idempotency_hash !~ '^[0-9a-f]{64}$'
  then
    raise exception 'The survey request is invalid.' using errcode = 'P0001';
  end if;

  select *
    into campaign_row
    from public.ed_review_campaigns
   where token_hash = p_token_hash
   for update;

  if not found then
    raise exception 'This survey link is unavailable.' using errcode = 'P0001';
  end if;

  select *
    into cycle_row
    from public.ed_review_cycles
   where id = campaign_row.cycle_id;

  if cycle_row.status <> 'open'
    or campaign_row.status <> 'open'
    or campaign_row.opens_at > now()
    or (campaign_row.closes_at is not null and campaign_row.closes_at <= now())
  then
    raise exception 'This survey is not currently accepting responses.' using errcode = 'P0001';
  end if;

  perform private.validate_ed_review_answer_payload(campaign_row.kind, p_answers);

  insert into public.ed_review_responses (
    campaign_id,
    idempotency_hash,
    answers
  ) values (
    campaign_row.id,
    p_idempotency_hash,
    p_answers
  )
  on conflict (campaign_id, idempotency_hash)
  do update set idempotency_hash = excluded.idempotency_hash
  returning id into response_id;

  return response_id;
end;
$$;

revoke all on function public.submit_ed_review_response(text, text, jsonb)
  from public;
grant execute on function public.submit_ed_review_response(text, text, jsonb)
  to anon, authenticated;
