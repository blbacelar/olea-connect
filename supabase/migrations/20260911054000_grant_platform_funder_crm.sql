alter table public.grant_organization_settings
	add column if not exists society_number text,
	add column if not exists charity_registration_number text,
	add column if not exists board_chair_user_id uuid references auth.users(id) on delete set null,
	add column if not exists board_chair_name text,
	add column if not exists board_chair_email text,
	add column if not exists board_chair_phone text;

alter table public.grant_organization_settings
	drop constraint if exists grant_organization_settings_society_number_length,
	add constraint grant_organization_settings_society_number_length check (
		society_number is null or char_length(society_number) between 2 and 80
	);

alter table public.grant_organization_settings
	drop constraint if exists grant_organization_settings_charity_registration_length,
	add constraint grant_organization_settings_charity_registration_length check (
		charity_registration_number is null or char_length(charity_registration_number) between 9 and 40
	);

alter table public.grant_organization_settings
	drop constraint if exists grant_organization_settings_board_chair_name_length,
	add constraint grant_organization_settings_board_chair_name_length check (
		board_chair_name is null or char_length(board_chair_name) between 1 and 180
	);

alter table public.grant_organization_settings
	drop constraint if exists grant_organization_settings_board_chair_email_length,
	add constraint grant_organization_settings_board_chair_email_length check (
		board_chair_email is null or char_length(board_chair_email) between 3 and 254
	);

alter table public.grant_organization_settings
	drop constraint if exists grant_organization_settings_board_chair_phone_length,
	add constraint grant_organization_settings_board_chair_phone_length check (
		board_chair_phone is null or char_length(board_chair_phone) between 7 and 24
	);

create table if not exists public.grant_funder_interactions (
	id uuid primary key default gen_random_uuid(),
	organization_id uuid not null references public.organizations(id) on delete cascade,
	partner_id uuid not null references public.grant_partners(id) on delete cascade,
	interaction_date date not null,
	contact_method text not null,
	contact_name text not null,
	summary text not null,
	next_action text not null default '',
	follow_up_date date,
	created_by uuid references auth.users(id) on delete set null,
	updated_by uuid references auth.users(id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint grant_funder_interactions_contact_method check (
		contact_method in ('email', 'phone', 'meeting', 'portal', 'other')
	),
	constraint grant_funder_interactions_contact_name_length check (
		char_length(contact_name) between 1 and 180
	),
	constraint grant_funder_interactions_summary_length check (
		char_length(summary) between 1 and 2000
	),
	constraint grant_funder_interactions_next_action_length check (
		char_length(next_action) <= 500
	)
);

create index if not exists grant_funder_interactions_org_idx
	on public.grant_funder_interactions(organization_id);

create index if not exists grant_funder_interactions_partner_idx
	on public.grant_funder_interactions(partner_id);

create index if not exists grant_funder_interactions_date_idx
	on public.grant_funder_interactions(interaction_date desc);

alter table public.grant_funder_interactions enable row level security;

drop trigger if exists grant_funder_interactions_set_updated_at on public.grant_funder_interactions;
create trigger grant_funder_interactions_set_updated_at
	before update on public.grant_funder_interactions
	for each row execute function private.set_updated_at();

drop policy if exists "grant_funder_interactions_select_member" on public.grant_funder_interactions;
create policy "grant_funder_interactions_select_member"
	on public.grant_funder_interactions for select to authenticated
	using (
		(select private.is_org_member(organization_id))
		or (select private.is_platform_admin(null))
	);

drop policy if exists "grant_funder_interactions_insert_admin" on public.grant_funder_interactions;
create policy "grant_funder_interactions_insert_admin"
	on public.grant_funder_interactions for insert to authenticated
	with check (
		(select private.has_org_role(
			organization_id,
			array['owner', 'admin']::public.organization_member_role[]
		))
		or (select private.is_platform_admin(null))
	);

drop policy if exists "grant_funder_interactions_update_admin" on public.grant_funder_interactions;
create policy "grant_funder_interactions_update_admin"
	on public.grant_funder_interactions for update to authenticated
	using (
		(select private.has_org_role(
			organization_id,
			array['owner', 'admin']::public.organization_member_role[]
		))
		or (select private.is_platform_admin(null))
	)
	with check (
		(select private.has_org_role(
			organization_id,
			array['owner', 'admin']::public.organization_member_role[]
		))
		or (select private.is_platform_admin(null))
	);

drop policy if exists "grant_funder_interactions_delete_admin" on public.grant_funder_interactions;
create policy "grant_funder_interactions_delete_admin"
	on public.grant_funder_interactions for delete to authenticated
	using (
		(select private.has_org_role(
			organization_id,
			array['owner', 'admin']::public.organization_member_role[]
		))
		or (select private.is_platform_admin(null))
	);

grant select, insert, update, delete on public.grant_funder_interactions to authenticated;
