-- Anonymous evaluation collection is separate from the legacy identity-linked
-- response table. No account, email, IP, device, or per-respondent token is kept.
alter table public.board_evaluation_cycles
  add column if not exists public_token uuid not null default gen_random_uuid(),
  add column if not exists question_selection jsonb not null default '{}'::jsonb
    check (jsonb_typeof(question_selection) = 'object'),
  add column if not exists invited_count integer not null default 0 check (invited_count >= 0),
  add column if not exists summary_report jsonb not null default '{}'::jsonb
    check (jsonb_typeof(summary_report) = 'object'),
  add column if not exists thank_you_copy jsonb not null default '{}'::jsonb
    check (jsonb_typeof(thank_you_copy) = 'object');
create unique index if not exists board_evaluation_cycles_public_token_idx
  on public.board_evaluation_cycles(public_token);

create table public.board_evaluation_anonymous_ratings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  cycle_id uuid not null,
  ratings jsonb not null check (jsonb_typeof(ratings) = 'object'),
  foreign key (cycle_id, organization_id)
    references public.board_evaluation_cycles(id, organization_id) on delete cascade
);
create index board_evaluation_anonymous_ratings_cycle_idx
  on public.board_evaluation_anonymous_ratings(cycle_id);

-- Free text is deliberately stored without a response ID, so it cannot be
-- joined back to an individual's ratings. Only approved themes leave the admin area.
create table public.board_evaluation_open_text (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  cycle_id uuid not null,
  question_id text not null check (char_length(question_id) between 1 and 40),
  body text not null check (char_length(body) between 1 and 4000),
  redacted_body text check (redacted_body is null or char_length(redacted_body) <= 4000),
  approved_for_report boolean not null default false,
  foreign key (cycle_id, organization_id)
    references public.board_evaluation_cycles(id, organization_id) on delete cascade
);
create index board_evaluation_open_text_cycle_idx
  on public.board_evaluation_open_text(cycle_id);

alter table public.template_instances
  add constraint template_instances_id_org_unique unique (id, organization_id);

create table public.board_evaluation_meeting_surveys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  template_instance_id uuid not null,
  meeting_id text not null check (char_length(meeting_id) between 1 and 200),
  meeting_title text not null check (char_length(meeting_title) between 1 and 200),
  meeting_date date not null,
  public_token uuid not null default gen_random_uuid() unique,
  status text not null default 'open' check (status in ('open', 'closed')),
  question_selection jsonb not null default '{}'::jsonb
    check (jsonb_typeof(question_selection) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, template_instance_id, meeting_id),
  unique (id, organization_id),
  foreign key (template_instance_id, organization_id)
    references public.template_instances(id, organization_id) on delete cascade
);
create index board_evaluation_meeting_surveys_org_idx
  on public.board_evaluation_meeting_surveys(organization_id, meeting_date desc);

create table public.board_evaluation_meeting_ratings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  survey_id uuid not null,
  ratings jsonb not null check (jsonb_typeof(ratings) = 'object'),
  foreign key (survey_id, organization_id)
    references public.board_evaluation_meeting_surveys(id, organization_id) on delete cascade
);
create index board_evaluation_meeting_ratings_survey_idx
  on public.board_evaluation_meeting_ratings(survey_id);

create table public.board_evaluation_meeting_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  survey_id uuid not null,
  body text not null check (char_length(body) between 1 and 4000),
  redacted_body text check (redacted_body is null or char_length(redacted_body) <= 4000),
  approved_for_report boolean not null default false,
  foreign key (survey_id, organization_id)
    references public.board_evaluation_meeting_surveys(id, organization_id) on delete cascade
);
create index board_evaluation_meeting_comments_survey_idx
  on public.board_evaluation_meeting_comments(survey_id);

alter table public.board_evaluation_anonymous_ratings enable row level security;
alter table public.board_evaluation_open_text enable row level security;
alter table public.board_evaluation_meeting_surveys enable row level security;
alter table public.board_evaluation_meeting_ratings enable row level security;
alter table public.board_evaluation_meeting_comments enable row level security;
revoke all on public.board_evaluation_anonymous_ratings,
  public.board_evaluation_open_text,
  public.board_evaluation_meeting_surveys,
  public.board_evaluation_meeting_ratings,
  public.board_evaluation_meeting_comments from anon, authenticated;
grant all on public.board_evaluation_anonymous_ratings,
  public.board_evaluation_open_text,
  public.board_evaluation_meeting_surveys,
  public.board_evaluation_meeting_ratings,
  public.board_evaluation_meeting_comments to service_role;

create function private.guard_anonymous_annual_submission()
returns trigger language plpgsql set search_path = '' as $$
declare v_cycle public.board_evaluation_cycles%rowtype;
begin
  select * into v_cycle from public.board_evaluation_cycles
  where id = new.cycle_id and organization_id = new.organization_id;
  if not found or v_cycle.status <> 'open' or
    (v_cycle.closes_on is not null and v_cycle.closes_on < current_date) then
    raise exception 'The annual evaluation is closed.';
  end if;
  return new;
end;
$$;
create trigger board_evaluation_anonymous_ratings_open_cycle
  before insert on public.board_evaluation_anonymous_ratings
  for each row execute function private.guard_anonymous_annual_submission();
create trigger board_evaluation_open_text_open_cycle
  before insert on public.board_evaluation_open_text
  for each row execute function private.guard_anonymous_annual_submission();

create function private.guard_anonymous_meeting_submission()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from public.board_evaluation_meeting_surveys
    where id = new.survey_id and organization_id = new.organization_id and status = 'open'
  ) then
    raise exception 'The meeting evaluation is closed.';
  end if;
  return new;
end;
$$;
create trigger board_evaluation_meeting_ratings_open_survey
  before insert on public.board_evaluation_meeting_ratings
  for each row execute function private.guard_anonymous_meeting_submission();
create trigger board_evaluation_meeting_comments_open_survey
  before insert on public.board_evaluation_meeting_comments
  for each row execute function private.guard_anonymous_meeting_submission();

-- Atomic collection prevents a ratings-only partial submission if free text
-- fails validation. These functions are callable only by the server service role.
create function public.submit_board_evaluation_annual(
  p_token uuid, p_ratings jsonb, p_open_ended jsonb
) returns void language plpgsql security definer set search_path = '' as $$
declare v_cycle public.board_evaluation_cycles%rowtype;
begin
  if jsonb_typeof(p_ratings) <> 'object' or jsonb_typeof(p_open_ended) <> 'object' then
    raise exception 'Invalid evaluation payload.';
  end if;
  select * into v_cycle from public.board_evaluation_cycles
  where public_token = p_token and status = 'open'
    and (closes_on is null or closes_on >= current_date)
  for share;
  if not found then raise exception 'This annual evaluation is closed.'; end if;
  insert into public.board_evaluation_anonymous_ratings(organization_id, cycle_id, ratings)
  values (v_cycle.organization_id, v_cycle.id, p_ratings);
  insert into public.board_evaluation_open_text(organization_id, cycle_id, question_id, body)
  select v_cycle.organization_id, v_cycle.id, answer.key, trim(answer.value)
  from jsonb_each_text(p_open_ended) answer
  where trim(answer.value) <> '';
end;
$$;
revoke all on function public.submit_board_evaluation_annual(uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.submit_board_evaluation_annual(uuid, jsonb, jsonb) to service_role;

create function public.submit_board_evaluation_meeting(
  p_token uuid, p_ratings jsonb, p_comment text
) returns void language plpgsql security definer set search_path = '' as $$
declare v_survey public.board_evaluation_meeting_surveys%rowtype;
begin
  if jsonb_typeof(p_ratings) <> 'object' or char_length(p_comment) > 4000 then
    raise exception 'Invalid evaluation payload.';
  end if;
  select * into v_survey from public.board_evaluation_meeting_surveys
  where public_token = p_token and status = 'open' for share;
  if not found then raise exception 'This meeting evaluation is closed.'; end if;
  insert into public.board_evaluation_meeting_ratings(organization_id, survey_id, ratings)
  values (v_survey.organization_id, v_survey.id, p_ratings);
  if trim(p_comment) <> '' then
    insert into public.board_evaluation_meeting_comments(organization_id, survey_id, body)
    values (v_survey.organization_id, v_survey.id, trim(p_comment));
  end if;
end;
$$;
revoke all on function public.submit_board_evaluation_meeting(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.submit_board_evaluation_meeting(uuid, jsonb, text) to service_role;

-- The old response table is retained for historical records. Administrators can
-- close a cycle at the deadline; low-count scores remain suppressed in reports.
create or replace function private.guard_board_evaluation_close()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'open' and new.status = 'closed' then
    new.closed_at := now();
  end if;
  return new;
end;
$$;
