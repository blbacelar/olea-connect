create type public.resource_type as enum (
  'template',
  'ebook',
  'video',
  'module',
  'guide',
  'grant_alert'
);
create type public.resource_status as enum ('draft', 'published', 'archived');
create type public.resource_access_kind as enum ('selection', 'purchase', 'grant', 'promotion');
create type public.template_instance_status as enum ('draft', 'completed', 'archived');
create type public.survey_status as enum ('draft', 'open', 'closed', 'archived');
create type public.survey_respondent_status as enum ('invited', 'started', 'submitted', 'expired');

create table public.resource_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.resource_categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resource_categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.resource_categories(id) on delete set null,
  type public.resource_type not null,
  status public.resource_status not null default 'draft',
  slug text not null unique,
  title text not null,
  summary text not null,
  description text,
  default_locale text not null default 'en-CA',
  estimated_minutes integer,
  published_at timestamptz,
  is_featured boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resources_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint resources_title_length check (char_length(title) between 1 and 200),
  constraint resources_estimated_minutes_positive check (
    estimated_minutes is null or estimated_minutes > 0
  ),
  constraint resources_published_at_required check (
    status <> 'published' or published_at is not null
  )
);

create table public.resource_versions (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  version_number integer not null,
  locale text not null default 'en-CA',
  title text not null,
  changelog text,
  storage_path text,
  external_url text,
  content jsonb not null default '{}'::jsonb,
  is_current boolean not null default false,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (resource_id, version_number, locale),
  constraint resource_versions_number_positive check (version_number > 0),
  constraint resource_versions_location_present check (
    storage_path is not null
    or external_url is not null
    or content <> '{}'::jsonb
  )
);

create table public.resource_plan_access (
  resource_id uuid not null references public.resources(id) on delete cascade,
  plan_id text not null references public.membership_plans(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (resource_id, plan_id)
);

create table public.organization_resource_access (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  access_kind public.resource_access_kind not null,
  granted_by uuid references auth.users(id) on delete set null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, resource_id, access_kind),
  constraint organization_resource_access_window check (
    ends_at is null or ends_at > starts_at
  )
);

create table public.template_definitions (
  resource_id uuid primary key references public.resources(id) on delete cascade,
  renderer_key text not null,
  schema_version integer not null default 1,
  field_schema jsonb not null,
  default_values jsonb not null default '{}'::jsonb,
  supports_pdf boolean not null default true,
  supports_docx boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint template_definitions_renderer_key_format check (
    renderer_key ~ '^[a-z0-9_]+$'
  ),
  constraint template_definitions_schema_version_positive check (schema_version > 0),
  constraint template_definitions_field_schema_object check (
    jsonb_typeof(field_schema) = 'object'
  )
);

create table public.template_instances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  resource_id uuid not null references public.resources(id),
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null,
  status public.template_instance_status not null default 'draft',
  form_data jsonb not null default '{}'::jsonb,
  branding_snapshot jsonb not null default '{}'::jsonb,
  output_storage_path text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint template_instances_title_length check (char_length(title) between 1 and 240),
  constraint template_instances_form_data_object check (jsonb_typeof(form_data) = 'object'),
  constraint template_instances_branding_object check (
    jsonb_typeof(branding_snapshot) = 'object'
  )
);

create table public.surveys (
  id uuid primary key default gen_random_uuid(),
  template_instance_id uuid references public.template_instances(id) on delete set null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null,
  status public.survey_status not null default 'draft',
  opens_at timestamptz,
  closes_at timestamptz,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint surveys_window check (
    closes_at is null or opens_at is null or closes_at > opens_at
  )
);

create table public.survey_respondents (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text,
  display_name text,
  token_hash text unique,
  status public.survey_respondent_status not null default 'invited',
  started_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint survey_respondents_identity_present check (
    user_id is not null or email is not null
  ),
  constraint survey_respondents_email_normalized check (
    email is null or email = lower(trim(email))
  )
);

create table public.survey_answers (
  id uuid primary key default gen_random_uuid(),
  respondent_id uuid not null references public.survey_respondents(id) on delete cascade,
  question_key text not null,
  score smallint,
  is_not_applicable boolean not null default false,
  text_answer text,
  value jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (respondent_id, question_key),
  constraint survey_answers_score_range check (score is null or score between 1 and 5),
  constraint survey_answers_single_value check (
    num_nonnulls(score, text_answer, value) <= 1
    and not (is_not_applicable and num_nonnulls(score, text_answer, value) > 0)
  )
);

create index resource_categories_parent_id_idx on public.resource_categories(parent_id);
create index resources_category_id_idx on public.resources(category_id);
create index resources_created_by_idx on public.resources(created_by);
create index resources_published_type_idx
  on public.resources(type, published_at desc)
  where status = 'published';
create index resource_versions_resource_id_idx on public.resource_versions(resource_id);
create index resource_versions_created_by_idx on public.resource_versions(created_by);
create unique index resource_versions_one_current_locale_idx
  on public.resource_versions(resource_id, locale)
  where is_current;
create index resource_plan_access_plan_id_idx on public.resource_plan_access(plan_id);
create index organization_resource_access_organization_id_idx
  on public.organization_resource_access(organization_id);
create index organization_resource_access_resource_id_idx
  on public.organization_resource_access(resource_id);
create index organization_resource_access_granted_by_idx
  on public.organization_resource_access(granted_by);
create index template_instances_organization_updated_idx
  on public.template_instances(organization_id, updated_at desc);
create index template_instances_resource_id_idx on public.template_instances(resource_id);
create index template_instances_created_by_idx on public.template_instances(created_by);
create index surveys_organization_id_idx on public.surveys(organization_id);
create index surveys_template_instance_id_idx on public.surveys(template_instance_id);
create index surveys_created_by_idx on public.surveys(created_by);
create index survey_respondents_survey_id_idx on public.survey_respondents(survey_id);
create index survey_respondents_user_id_idx on public.survey_respondents(user_id);
create index survey_answers_respondent_id_idx on public.survey_answers(respondent_id);

create or replace function private.can_access_resource(
  target_resource_id uuid,
  target_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_platform_admin(null)
    or (
      private.is_org_member(target_organization_id)
      and (
        exists (
          select 1
          from public.organization_resource_access direct_access
          where direct_access.organization_id = target_organization_id
            and direct_access.resource_id = target_resource_id
            and direct_access.starts_at <= now()
            and (direct_access.ends_at is null or direct_access.ends_at > now())
        )
        or exists (
          select 1
          from public.subscriptions subscriptions
          join public.resource_plan_access plan_access
            on plan_access.plan_id = subscriptions.plan_id
          where subscriptions.organization_id = target_organization_id
            and subscriptions.status in ('trialing', 'active')
            and plan_access.resource_id = target_resource_id
        )
      )
    );
$$;

create or replace function private.can_access_resource_for_any_org(target_resource_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_platform_admin(null)
    or exists (
      select 1
      from public.organization_members memberships
      where memberships.user_id = (select auth.uid())
        and memberships.status = 'active'
        and private.can_access_resource(target_resource_id, memberships.organization_id)
    );
$$;

create or replace function private.enforce_resource_selection_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selection_limit integer;
  current_selections integer;
begin
  if new.access_kind <> 'selection' then
    return new;
  end if;

  select plans.template_selection_limit
  into selection_limit
  from public.subscriptions subscriptions
  join public.membership_plans plans on plans.id = subscriptions.plan_id
  where subscriptions.organization_id = new.organization_id
    and subscriptions.status in ('trialing', 'active')
  order by subscriptions.created_at desc
  limit 1;

  if selection_limit is null then
    raise exception 'The active plan does not use resource selections';
  end if;

  select count(*)
  into current_selections
  from public.organization_resource_access access
  where access.organization_id = new.organization_id
    and access.access_kind = 'selection'
    and access.id <> new.id
    and (access.ends_at is null or access.ends_at > now());

  if current_selections >= selection_limit then
    raise exception 'The organization has reached its resource selection limit';
  end if;

  return new;
end;
$$;

grant execute on function private.can_access_resource(uuid, uuid) to authenticated;
grant execute on function private.can_access_resource_for_any_org(uuid) to authenticated;

create trigger resource_categories_set_updated_at
  before update on public.resource_categories
  for each row execute function private.set_updated_at();
create trigger resources_set_updated_at
  before update on public.resources
  for each row execute function private.set_updated_at();
create trigger template_definitions_set_updated_at
  before update on public.template_definitions
  for each row execute function private.set_updated_at();
create trigger template_instances_set_updated_at
  before update on public.template_instances
  for each row execute function private.set_updated_at();
create trigger surveys_set_updated_at
  before update on public.surveys
  for each row execute function private.set_updated_at();
create trigger survey_respondents_set_updated_at
  before update on public.survey_respondents
  for each row execute function private.set_updated_at();
create trigger survey_answers_set_updated_at
  before update on public.survey_answers
  for each row execute function private.set_updated_at();
create trigger organization_resource_access_enforce_limit
  before insert or update on public.organization_resource_access
  for each row execute function private.enforce_resource_selection_limit();

alter table public.resource_categories enable row level security;
alter table public.resources enable row level security;
alter table public.resource_versions enable row level security;
alter table public.resource_plan_access enable row level security;
alter table public.organization_resource_access enable row level security;
alter table public.template_definitions enable row level security;
alter table public.template_instances enable row level security;
alter table public.surveys enable row level security;
alter table public.survey_respondents enable row level security;
alter table public.survey_answers enable row level security;

create policy "resource_categories_read"
  on public.resource_categories for select to authenticated
  using (is_active or (select private.is_platform_admin(null)));
create policy "resources_read_catalog"
  on public.resources for select to authenticated
  using (status = 'published' or (select private.is_platform_admin(null)));
create policy "resource_versions_read_entitled"
  on public.resource_versions for select to authenticated
  using (
    (select private.can_access_resource_for_any_org(resource_id))
    or (select private.is_platform_admin(null))
  );
create policy "resource_plan_access_read"
  on public.resource_plan_access for select to authenticated
  using (true);

create policy "organization_resource_access_select_member"
  on public.organization_resource_access for select to authenticated
  using (
    (select private.is_org_member(organization_id))
    or (select private.is_platform_admin(null))
  );
create policy "organization_resource_access_insert_admin"
  on public.organization_resource_access for insert to authenticated
  with check (
    (select private.has_org_role(
      organization_id,
      array['owner', 'admin']::public.organization_member_role[]
    ))
    or (select private.is_platform_admin(null))
  );

create policy "template_definitions_read_entitled"
  on public.template_definitions for select to authenticated
  using (
    (select private.can_access_resource_for_any_org(resource_id))
    or (select private.is_platform_admin(null))
  );

create policy "template_instances_select_member"
  on public.template_instances for select to authenticated
  using (
    (select private.is_org_member(organization_id))
    or (select private.is_platform_admin(null))
  );
create policy "template_instances_insert_member"
  on public.template_instances for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (select private.can_access_resource(resource_id, organization_id))
  );
create policy "template_instances_update_member"
  on public.template_instances for update to authenticated
  using (
    (select private.is_org_member(organization_id))
    or (select private.is_platform_admin(null))
  )
  with check (
    (select private.is_org_member(organization_id))
    or (select private.is_platform_admin(null))
  );
create policy "template_instances_delete_admin"
  on public.template_instances for delete to authenticated
  using (
    (select private.has_org_role(
      organization_id,
      array['owner', 'admin']::public.organization_member_role[]
    ))
    or created_by = (select auth.uid())
    or (select private.is_platform_admin(null))
  );

create policy "surveys_select_member"
  on public.surveys for select to authenticated
  using (
    (select private.is_org_member(organization_id))
    or (select private.is_platform_admin(null))
  );
create policy "surveys_insert_member"
  on public.surveys for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (select private.is_org_member(organization_id))
  );
create policy "surveys_update_member"
  on public.surveys for update to authenticated
  using (
    (select private.is_org_member(organization_id))
    or (select private.is_platform_admin(null))
  )
  with check (
    (select private.is_org_member(organization_id))
    or (select private.is_platform_admin(null))
  );

create policy "survey_respondents_select_org"
  on public.survey_respondents for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.surveys surveys
      where surveys.id = survey_id
        and (
          (select private.is_org_member(surveys.organization_id))
          or (select private.is_platform_admin(null))
        )
    )
  );
create policy "survey_respondents_insert_org"
  on public.survey_respondents for insert to authenticated
  with check (
    exists (
      select 1
      from public.surveys surveys
      where surveys.id = survey_id
        and (
          (select private.is_org_member(surveys.organization_id))
          or (select private.is_platform_admin(null))
        )
    )
  );
create policy "survey_respondents_update_org"
  on public.survey_respondents for update to authenticated
  using (
    exists (
      select 1
      from public.surveys surveys
      where surveys.id = survey_id
        and (
          (select private.is_org_member(surveys.organization_id))
          or (select private.is_platform_admin(null))
        )
    )
  )
  with check (
    exists (
      select 1
      from public.surveys surveys
      where surveys.id = survey_id
        and (
          (select private.is_org_member(surveys.organization_id))
          or (select private.is_platform_admin(null))
        )
    )
  );
create policy "survey_respondents_delete_org"
  on public.survey_respondents for delete to authenticated
  using (
    exists (
      select 1
      from public.surveys surveys
      where surveys.id = survey_id
        and (
          (select private.is_org_member(surveys.organization_id))
          or (select private.is_platform_admin(null))
        )
    )
  );

create policy "survey_answers_select_org"
  on public.survey_answers for select to authenticated
  using (
    exists (
      select 1
      from public.survey_respondents respondents
      join public.surveys surveys on surveys.id = respondents.survey_id
      where respondents.id = respondent_id
        and (
          respondents.user_id = (select auth.uid())
          or (select private.is_org_member(surveys.organization_id))
          or (select private.is_platform_admin(null))
        )
    )
  );
create policy "survey_answers_insert_respondent"
  on public.survey_answers for insert to authenticated
  with check (
    exists (
      select 1
      from public.survey_respondents respondents
      join public.surveys surveys on surveys.id = respondents.survey_id
      where respondents.id = respondent_id
        and (
          respondents.user_id = (select auth.uid())
          or (select private.is_org_member(surveys.organization_id))
          or (select private.is_platform_admin(null))
        )
    )
  );
create policy "survey_answers_update_respondent"
  on public.survey_answers for update to authenticated
  using (
    exists (
      select 1
      from public.survey_respondents respondents
      join public.surveys surveys on surveys.id = respondents.survey_id
      where respondents.id = respondent_id
        and (
          respondents.user_id = (select auth.uid())
          or (select private.is_org_member(surveys.organization_id))
          or (select private.is_platform_admin(null))
        )
    )
  )
  with check (
    exists (
      select 1
      from public.survey_respondents respondents
      join public.surveys surveys on surveys.id = respondents.survey_id
      where respondents.id = respondent_id
        and (
          respondents.user_id = (select auth.uid())
          or (select private.is_org_member(surveys.organization_id))
          or (select private.is_platform_admin(null))
        )
    )
  );
create policy "survey_answers_delete_respondent"
  on public.survey_answers for delete to authenticated
  using (
    exists (
      select 1
      from public.survey_respondents respondents
      join public.surveys surveys on surveys.id = respondents.survey_id
      where respondents.id = respondent_id
        and (
          respondents.user_id = (select auth.uid())
          or (select private.is_org_member(surveys.organization_id))
          or (select private.is_platform_admin(null))
        )
    )
  );

grant select on public.resource_categories, public.resources, public.resource_versions,
  public.resource_plan_access, public.template_definitions to authenticated;
grant select, insert on public.organization_resource_access to authenticated;
grant select, insert, update, delete on public.template_instances, public.surveys,
  public.survey_respondents, public.survey_answers to authenticated;
