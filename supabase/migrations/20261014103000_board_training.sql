-- Canopy board training. All writes and sensitive reads go through the
-- authenticated server service after checking membership and plan access.
create table public.board_training_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  jurisdiction text not null default 'other' check (jurisdiction in ('bc','ab','sk','mb','on','qc','nb','ns','pe','nl','yt','nt','nu','fed','other')),
  default_locale text not null default 'en' check (default_locale in ('en','fr')),
  chair_user_id uuid,
  notify_chair boolean not null default false,
  updated_at timestamptz not null default now(),
  foreign key (organization_id, chair_user_id) references public.organization_members(organization_id, user_id) on delete set null (chair_user_id)
);

create table public.board_training_enrollments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  course_id text not null check (course_id in ('essentials','refresher')),
  locale text not null default 'en' check (locale in ('en','fr')),
  completed_lessons text[] not null default '{}',
  confidence_before jsonb not null default '{}'::jsonb,
  confidence_after jsonb not null default '{}'::jsonb,
  action_plan jsonb not null default '[]'::jsonb,
  follow_up jsonb not null default '{}'::jsonb,
  before_completed_at timestamptz,
  test_out_used boolean not null default false,
  passed_at timestamptz,
  score integer,
  total_questions integer,
  organization_signed_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, course_id),
  foreign key (user_id) references auth.users(id) on delete cascade
);

create table public.board_training_attempts (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.board_training_enrollments(id) on delete cascade,
  score integer not null check (score >= 0),
  total_questions integer not null check (total_questions > 0),
  passed boolean not null,
  test_out boolean not null default false,
  topic_scores jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now()
);
create unique index board_training_one_test_out on public.board_training_attempts(enrollment_id) where test_out;

create table public.board_training_declarations (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null unique references public.board_training_enrollments(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  no_interests boolean not null,
  interests text,
  reviewed_documents boolean not null default false,
  conduct_confirmed boolean not null,
  signed_name text not null check (char_length(trim(signed_name)) between 2 and 160),
  signed_at timestamptz not null default now(),
  check (no_interests or char_length(trim(coalesce(interests, ''))) >= 4)
);

create table public.board_training_certificates (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null unique references public.board_training_enrollments(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  certificate_number text not null unique,
  display_name text not null check (char_length(trim(display_name)) between 2 and 160),
  course_id text not null check (course_id in ('essentials','refresher')),
  locale text not null check (locale in ('en','fr')),
  score integer not null,
  total_questions integer not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  email_claimed_at timestamptz,
  emailed_at timestamptz
);

create table public.board_training_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  course_id text not null check (course_id in ('essentials','refresher')),
  locale text not null default 'en' check (locale in ('en','fr')),
  due_date date,
  token_hash text not null unique,
  expires_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  invited_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);
create index board_training_invitations_org on public.board_training_invitations(organization_id, status);

create table public.board_training_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null check (kind in ('bylaws','strategic_plan','financials','code_of_conduct','coi_policy','minutes','other')),
  title text not null check (char_length(trim(title)) between 2 and 160),
  object_path text not null unique,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Keep each multi-table transition in one transaction. Only the authenticated
-- server's service role can call these functions after its membership checks.
create function public.board_training_record_assessment(
  p_enrollment_id uuid, p_organization_id uuid, p_user_id uuid,
  p_score integer, p_total integer, p_passed boolean, p_test_out boolean,
  p_topic_scores jsonb
) returns void language plpgsql set search_path = '' as $$
declare current_enrollment public.board_training_enrollments%rowtype;
begin
  select * into current_enrollment from public.board_training_enrollments
    where id = p_enrollment_id and organization_id = p_organization_id and user_id = p_user_id for update;
  if not found then raise exception 'Training enrollment was not found.'; end if;
  if current_enrollment.passed_at is not null then raise exception 'You have already passed this assessment.'; end if;
  if p_test_out and (current_enrollment.test_out_used or cardinality(current_enrollment.completed_lessons) > 0) then
    raise exception 'The test-out attempt is no longer available.';
  end if;
  if not p_test_out and current_enrollment.organization_signed_at is null then
    raise exception 'Sign the organization declaration before the assessment.';
  end if;
  insert into public.board_training_attempts (enrollment_id, score, total_questions, passed, test_out, topic_scores)
    values (p_enrollment_id, p_score, p_total, p_passed, p_test_out, p_topic_scores);
  update public.board_training_enrollments set
    test_out_used = test_out_used or p_test_out,
    passed_at = case when p_passed then now() else null end,
    score = case when p_passed then p_score else null end,
    total_questions = case when p_passed then p_total else null end,
    updated_at = now()
    where id = p_enrollment_id;
end;
$$;

create function public.board_training_sign_organization(
  p_enrollment_id uuid, p_organization_id uuid, p_user_id uuid,
  p_no_interests boolean, p_interests text, p_reviewed boolean,
  p_conduct boolean, p_signature text
) returns void language plpgsql set search_path = '' as $$
declare current_enrollment public.board_training_enrollments%rowtype;
begin
  select * into current_enrollment from public.board_training_enrollments
    where id = p_enrollment_id and organization_id = p_organization_id and user_id = p_user_id for update;
  if not found then raise exception 'Training enrollment was not found.'; end if;
  if current_enrollment.organization_signed_at is not null then raise exception 'This declaration has already been signed.'; end if;
  insert into public.board_training_declarations (
    enrollment_id, organization_id, user_id, no_interests, interests,
    reviewed_documents, conduct_confirmed, signed_name
  ) values (
    p_enrollment_id, p_organization_id, p_user_id, p_no_interests, p_interests,
    p_reviewed, p_conduct, p_signature
  );
  update public.board_training_enrollments set organization_signed_at = now(), updated_at = now()
    where id = p_enrollment_id;
end;
$$;

create function public.board_training_issue_certificate(
  p_enrollment_id uuid, p_organization_id uuid, p_user_id uuid,
  p_certificate_number text, p_display_name text, p_issued_at timestamptz,
  p_expires_at timestamptz
) returns uuid language plpgsql set search_path = '' as $$
declare
  current_enrollment public.board_training_enrollments%rowtype;
  certificate_id uuid;
begin
  select * into current_enrollment from public.board_training_enrollments
    where id = p_enrollment_id and organization_id = p_organization_id and user_id = p_user_id for update;
  if not found then raise exception 'Training enrollment was not found.'; end if;
  select id into certificate_id from public.board_training_certificates where enrollment_id = p_enrollment_id;
  if found then return certificate_id; end if;
  if current_enrollment.passed_at is null or current_enrollment.organization_signed_at is null or
     jsonb_array_length(current_enrollment.action_plan) = 0 then
    raise exception 'Complete the assessment, organization declaration, and action plan first.';
  end if;
  insert into public.board_training_certificates (
    enrollment_id, organization_id, user_id, certificate_number, display_name,
    course_id, locale, score, total_questions, issued_at, expires_at
  ) values (
    p_enrollment_id, p_organization_id, p_user_id, p_certificate_number, p_display_name,
    current_enrollment.course_id, current_enrollment.locale, current_enrollment.score,
    current_enrollment.total_questions, p_issued_at, p_expires_at
  ) returning id into certificate_id;
  update public.board_training_enrollments set acknowledged_at = p_issued_at, updated_at = now()
    where id = p_enrollment_id;
  return certificate_id;
end;
$$;

revoke all on function public.board_training_record_assessment(uuid, uuid, uuid, integer, integer, boolean, boolean, jsonb) from public, anon, authenticated;
revoke all on function public.board_training_sign_organization(uuid, uuid, uuid, boolean, text, boolean, boolean, text) from public, anon, authenticated;
revoke all on function public.board_training_issue_certificate(uuid, uuid, uuid, text, text, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.board_training_record_assessment(uuid, uuid, uuid, integer, integer, boolean, boolean, jsonb) to service_role;
grant execute on function public.board_training_sign_organization(uuid, uuid, uuid, boolean, text, boolean, boolean, text) to service_role;
grant execute on function public.board_training_issue_certificate(uuid, uuid, uuid, text, text, timestamptz, timestamptz) to service_role;

alter table public.board_training_settings enable row level security;
alter table public.board_training_enrollments enable row level security;
alter table public.board_training_attempts enable row level security;
alter table public.board_training_declarations enable row level security;
alter table public.board_training_certificates enable row level security;
alter table public.board_training_invitations enable row level security;
alter table public.board_training_documents enable row level security;

-- No direct authenticated-client policy: the service always checks the
-- active subscription, organization membership and role before each query.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('board-training-documents', 'board-training-documents', false, 5242880, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['application/pdf'];
