create type public.sponsor_status as enum ('prospect', 'active', 'paused', 'former', 'declined');
create type public.sponsorship_status as enum (
  'draft',
  'proposed',
  'active',
  'completed',
  'canceled'
);
create type public.contribution_status as enum ('pledged', 'invoiced', 'received', 'allocated');
create type public.grant_program_type as enum ('quarterly', 'summit', 'named_sponsor');
create type public.grant_round_status as enum (
  'draft',
  'upcoming',
  'open',
  'reviewing',
  'awarded',
  'closed'
);
create type public.grant_focus_area as enum (
  'operational_capacity',
  'governance_strengthening',
  'program_rollout',
  'communications_outreach'
);
create type public.grant_application_status as enum (
  'draft',
  'submitted',
  'in_review',
  'shortlisted',
  'approved',
  'declined',
  'withdrawn'
);
create type public.grant_award_status as enum ('approved', 'scheduled', 'paid', 'canceled');

create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status public.sponsor_status not null default 'prospect',
  category text,
  website_url text,
  logo_path text,
  short_description text,
  directory_description text,
  directory_email text,
  directory_phone text,
  directory_visible boolean not null default false,
  values_reviewed_at timestamptz,
  attio_record_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsors_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint sponsors_directory_email_normalized check (
    directory_email is null or directory_email = lower(trim(directory_email))
  )
);

create table public.sponsor_contacts (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  full_name text not null,
  title text,
  email text,
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsor_contacts_email_normalized check (
    email is null or email = lower(trim(email))
  )
);

create table public.sponsorship_packages (
  id text primary key,
  name text not null,
  annual_price_cents integer not null,
  olea_gives_contribution_cents integer not null,
  currency char(3) not null default 'CAD',
  category_exclusivity boolean not null default false,
  benefits jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsorship_packages_id_format check (id ~ '^[a-z0-9_]+$'),
  constraint sponsorship_packages_amounts_nonnegative check (
    annual_price_cents >= 0
    and olea_gives_contribution_cents >= 0
    and olea_gives_contribution_cents <= annual_price_cents
  ),
  constraint sponsorship_packages_benefits_array check (jsonb_typeof(benefits) = 'array')
);

create table public.sponsorships (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  package_id text not null references public.sponsorship_packages(id),
  status public.sponsorship_status not null default 'draft',
  starts_on date not null,
  ends_on date not null,
  contract_amount_cents integer not null,
  committed_contribution_cents integer not null,
  currency char(3) not null default 'CAD',
  category_exclusivity text,
  contract_storage_path text,
  stripe_customer_id text,
  quickbooks_customer_id text,
  attio_record_id text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsorships_date_window check (ends_on >= starts_on),
  constraint sponsorships_amounts_nonnegative check (
    contract_amount_cents >= 0
    and committed_contribution_cents >= 0
    and committed_contribution_cents <= contract_amount_cents
  )
);

create table public.sponsor_contributions (
  id uuid primary key default gen_random_uuid(),
  sponsorship_id uuid not null references public.sponsorships(id) on delete cascade,
  status public.contribution_status not null default 'pledged',
  amount_cents integer not null,
  currency char(3) not null default 'CAD',
  pledged_on date not null default current_date,
  received_on date,
  allocated_on date,
  quickbooks_transaction_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsor_contributions_amount_positive check (amount_cents > 0)
);

create table public.event_sponsors (
  event_id uuid not null references public.events(id) on delete cascade,
  sponsorship_id uuid not null references public.sponsorships(id) on delete cascade,
  role text not null default 'sponsor',
  created_at timestamptz not null default now(),
  primary key (event_id, sponsorship_id)
);

create table public.grant_programs (
  id uuid primary key default gen_random_uuid(),
  type public.grant_program_type not null,
  name text not null,
  slug text not null unique,
  description text not null,
  default_award_cents integer not null,
  currency char(3) not null default 'CAD',
  sponsor_id uuid references public.sponsors(id) on delete set null,
  focus_area public.grant_focus_area,
  eligibility_rules jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grant_programs_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint grant_programs_award_positive check (default_award_cents > 0),
  constraint grant_programs_named_sponsor_present check (
    type <> 'named_sponsor' or sponsor_id is not null
  )
);

create table public.grant_rounds (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.grant_programs(id) on delete cascade,
  name text not null,
  status public.grant_round_status not null default 'draft',
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  decision_at timestamptz,
  award_amount_cents integer not null,
  available_awards integer not null default 1,
  budget_cents integer not null,
  public_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grant_rounds_application_window check (closes_at > opens_at),
  constraint grant_rounds_award_positive check (award_amount_cents > 0),
  constraint grant_rounds_available_awards_positive check (available_awards > 0),
  constraint grant_rounds_budget_sufficient check (
    budget_cents >= award_amount_cents
    and budget_cents >= award_amount_cents * available_awards
  )
);

create table public.grant_applications (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.grant_rounds(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  applicant_user_id uuid not null references auth.users(id) on delete restrict,
  status public.grant_application_status not null default 'draft',
  focus_area public.grant_focus_area not null,
  funding_request text not null,
  expected_outcome text not null,
  requested_amount_cents integer not null,
  annual_revenue_cents bigint,
  cra_good_standing boolean not null,
  registered_in_canada boolean not null,
  eligibility_snapshot jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (round_id, organization_id),
  constraint grant_applications_request_words check (
    status = 'draft'
    or array_length(
        regexp_split_to_array(trim(funding_request), '\s+'),
        1
      ) between 150 and 250
  ),
  constraint grant_applications_outcome_present check (
    status = 'draft' or char_length(trim(expected_outcome)) >= 20
  ),
  constraint grant_applications_amount_positive check (requested_amount_cents > 0),
  constraint grant_applications_revenue_nonnegative check (
    annual_revenue_cents is null or annual_revenue_cents >= 0
  ),
  constraint grant_applications_submission_timestamp check (
    status = 'draft' or submitted_at is not null
  )
);

create table public.grant_application_reviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.grant_applications(id) on delete cascade,
  reviewer_user_id uuid not null references auth.users(id) on delete restrict,
  score smallint,
  recommendation text,
  internal_notes text,
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id, reviewer_user_id),
  constraint grant_application_reviews_score_range check (
    score is null or score between 1 and 5
  )
);

create table public.grant_awards (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.grant_applications(id) on delete cascade,
  status public.grant_award_status not null default 'approved',
  amount_cents integer not null,
  currency char(3) not null default 'CAD',
  awarded_on date not null default current_date,
  paid_on date,
  payment_reference text,
  public_announced_at timestamptz,
  impact_story text,
  impact_story_consent boolean not null default false,
  outcome_received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grant_awards_amount_positive check (amount_cents > 0),
  constraint grant_awards_paid_date_required check (
    status <> 'paid' or paid_on is not null
  )
);

create table public.grant_program_contributions (
  grant_program_id uuid not null references public.grant_programs(id) on delete cascade,
  contribution_id uuid not null references public.sponsor_contributions(id) on delete cascade,
  amount_cents integer not null,
  allocated_at timestamptz not null default now(),
  primary key (grant_program_id, contribution_id),
  constraint grant_program_contributions_amount_positive check (amount_cents > 0)
);

create index sponsor_contacts_sponsor_id_idx on public.sponsor_contacts(sponsor_id);
create unique index sponsor_contacts_one_primary_idx
  on public.sponsor_contacts(sponsor_id)
  where is_primary;
create index sponsorships_sponsor_id_idx on public.sponsorships(sponsor_id);
create index sponsorships_package_id_idx on public.sponsorships(package_id);
create index sponsorships_created_by_idx on public.sponsorships(created_by);
create index sponsorships_active_dates_idx
  on public.sponsorships(starts_on, ends_on)
  where status = 'active';
create index sponsor_contributions_sponsorship_id_idx
  on public.sponsor_contributions(sponsorship_id);
create index event_sponsors_sponsorship_id_idx on public.event_sponsors(sponsorship_id);
create index grant_programs_sponsor_id_idx on public.grant_programs(sponsor_id);
create index grant_rounds_program_id_idx on public.grant_rounds(program_id);
create index grant_rounds_open_idx
  on public.grant_rounds(opens_at, closes_at)
  where status in ('upcoming', 'open', 'reviewing');
create index grant_applications_organization_id_idx
  on public.grant_applications(organization_id);
create index grant_applications_applicant_user_id_idx
  on public.grant_applications(applicant_user_id);
create index grant_applications_status_idx on public.grant_applications(status);
create index grant_application_reviews_application_id_idx
  on public.grant_application_reviews(application_id);
create index grant_application_reviews_reviewer_user_id_idx
  on public.grant_application_reviews(reviewer_user_id);
create index grant_program_contributions_contribution_id_idx
  on public.grant_program_contributions(contribution_id);

create trigger sponsors_set_updated_at
  before update on public.sponsors
  for each row execute function private.set_updated_at();
create trigger sponsor_contacts_set_updated_at
  before update on public.sponsor_contacts
  for each row execute function private.set_updated_at();
create trigger sponsorship_packages_set_updated_at
  before update on public.sponsorship_packages
  for each row execute function private.set_updated_at();
create trigger sponsorships_set_updated_at
  before update on public.sponsorships
  for each row execute function private.set_updated_at();
create trigger sponsor_contributions_set_updated_at
  before update on public.sponsor_contributions
  for each row execute function private.set_updated_at();
create trigger grant_programs_set_updated_at
  before update on public.grant_programs
  for each row execute function private.set_updated_at();
create trigger grant_rounds_set_updated_at
  before update on public.grant_rounds
  for each row execute function private.set_updated_at();
create trigger grant_applications_set_updated_at
  before update on public.grant_applications
  for each row execute function private.set_updated_at();
create trigger grant_application_reviews_set_updated_at
  before update on public.grant_application_reviews
  for each row execute function private.set_updated_at();
create trigger grant_awards_set_updated_at
  before update on public.grant_awards
  for each row execute function private.set_updated_at();

alter table public.sponsors enable row level security;
alter table public.sponsor_contacts enable row level security;
alter table public.sponsorship_packages enable row level security;
alter table public.sponsorships enable row level security;
alter table public.sponsor_contributions enable row level security;
alter table public.event_sponsors enable row level security;
alter table public.grant_programs enable row level security;
alter table public.grant_rounds enable row level security;
alter table public.grant_applications enable row level security;
alter table public.grant_application_reviews enable row level security;
alter table public.grant_awards enable row level security;
alter table public.grant_program_contributions enable row level security;

create policy "sponsors_read_directory"
  on public.sponsors for select to authenticated
  using (
    (status = 'active' and directory_visible)
    or (select private.is_platform_admin(null))
  );
create policy "sponsorship_packages_read_active"
  on public.sponsorship_packages for select to authenticated
  using (is_active or (select private.is_platform_admin(null)));
create policy "event_sponsors_read"
  on public.event_sponsors for select to authenticated
  using (true);

create policy "grant_programs_read_active"
  on public.grant_programs for select to authenticated
  using (is_active or (select private.is_platform_admin(null)));
create policy "grant_rounds_read_visible"
  on public.grant_rounds for select to authenticated
  using (status <> 'draft' or (select private.is_platform_admin(null)));

create policy "grant_applications_select_org"
  on public.grant_applications for select to authenticated
  using (
    (select private.is_org_member(organization_id))
    or (select private.is_platform_admin(
      array['super_admin', 'grants_admin']::public.platform_role[]
    ))
  );
create policy "grant_applications_insert_member"
  on public.grant_applications for insert to authenticated
  with check (
    applicant_user_id = (select auth.uid())
    and status in ('draft', 'submitted')
    and (select private.is_org_member(organization_id))
  );
create policy "grant_applications_update_member"
  on public.grant_applications for update to authenticated
  using (
    applicant_user_id = (select auth.uid())
    and status in ('draft', 'submitted')
  )
  with check (
    applicant_user_id = (select auth.uid())
    and status in ('draft', 'submitted', 'withdrawn')
    and (select private.is_org_member(organization_id))
  );
create policy "grant_applications_delete_draft"
  on public.grant_applications for delete to authenticated
  using (
    applicant_user_id = (select auth.uid())
    and status = 'draft'
  );

create policy "grant_reviews_admin"
  on public.grant_application_reviews for all to authenticated
  using (
    (select private.is_platform_admin(
      array['super_admin', 'grants_admin']::public.platform_role[]
    ))
  )
  with check (
    reviewer_user_id = (select auth.uid())
    and (select private.is_platform_admin(
      array['super_admin', 'grants_admin']::public.platform_role[]
    ))
  );

create policy "grant_awards_read"
  on public.grant_awards for select to authenticated
  using (
    public_announced_at is not null
    or exists (
      select 1
      from public.grant_applications applications
      where applications.id = application_id
        and (select private.is_org_member(applications.organization_id))
    )
    or (select private.is_platform_admin(
      array['super_admin', 'grants_admin', 'finance_admin']::public.platform_role[]
    ))
  );

grant select on public.sponsors, public.sponsorship_packages, public.event_sponsors,
  public.grant_programs, public.grant_rounds, public.grant_awards to authenticated;
grant select, insert, update, delete on public.grant_applications to authenticated;
grant select, insert, update, delete on public.grant_application_reviews to authenticated;
