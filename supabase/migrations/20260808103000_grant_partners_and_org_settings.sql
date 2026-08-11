create table if not exists public.grant_organization_settings (
	organization_id uuid primary key references public.organizations(id) on delete cascade,
	organization_type text not null default 'Growing ($250K-$1M)',
	current_annual_revenue_cents bigint,
	funding_sources text[] not null default '{}'::text[],
	updated_by uuid references auth.users(id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint grant_organization_settings_revenue_nonnegative check (
		current_annual_revenue_cents is null or current_annual_revenue_cents >= 0
	)
);

create table if not exists public.grant_partners (
	id uuid primary key default gen_random_uuid(),
	organization_id uuid not null references public.organizations(id) on delete cascade,
	name text not null,
	partner_type text not null,
	contact_name text not null,
	email text not null,
	phone text not null,
	focus_areas text not null,
	status text not null,
	notes text not null default '',
	last_collaboration text,
	added_note text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint grant_partners_name_length check (char_length(name) between 1 and 180),
	constraint grant_partners_contact_name_length check (char_length(contact_name) between 1 and 180),
	constraint grant_partners_email_length check (char_length(email) between 3 and 180),
	constraint grant_partners_phone_length check (char_length(phone) between 3 and 60)
);

create index if not exists grant_partners_org_idx
	on public.grant_partners(organization_id);

create index if not exists grant_partners_status_idx
	on public.grant_partners(status);

create index if not exists grant_organization_settings_updated_at_idx
	on public.grant_organization_settings(updated_at);

alter table public.grant_organization_settings enable row level security;
alter table public.grant_partners enable row level security;

create trigger grant_organization_settings_set_updated_at
	before update on public.grant_organization_settings
	for each row execute function private.set_updated_at();

create trigger grant_partners_set_updated_at
	before update on public.grant_partners
	for each row execute function private.set_updated_at();

drop policy if exists "grant_organization_settings_select_member" on public.grant_organization_settings;
create policy "grant_organization_settings_select_member"
	on public.grant_organization_settings for select to authenticated
	using (
		(select private.is_org_member(organization_id))
		or (select private.is_platform_admin(null))
	);

drop policy if exists "grant_organization_settings_insert_admin" on public.grant_organization_settings;
create policy "grant_organization_settings_insert_admin"
	on public.grant_organization_settings for insert to authenticated
	with check (
		(select private.has_org_role(
			organization_id,
			array['owner', 'admin']::public.organization_member_role[]
		))
		or (select private.is_platform_admin(null))
	);

drop policy if exists "grant_organization_settings_update_admin" on public.grant_organization_settings;
create policy "grant_organization_settings_update_admin"
	on public.grant_organization_settings for update to authenticated
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

drop policy if exists "grant_partners_select_member" on public.grant_partners;
create policy "grant_partners_select_member"
	on public.grant_partners for select to authenticated
	using (
		(select private.is_org_member(organization_id))
		or (select private.is_platform_admin(null))
	);

drop policy if exists "grant_partners_insert_admin" on public.grant_partners;
create policy "grant_partners_insert_admin"
	on public.grant_partners for insert to authenticated
	with check (
		(select private.has_org_role(
			organization_id,
			array['owner', 'admin']::public.organization_member_role[]
		))
		or (select private.is_platform_admin(null))
	);

drop policy if exists "grant_partners_update_admin" on public.grant_partners;
create policy "grant_partners_update_admin"
	on public.grant_partners for update to authenticated
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

drop policy if exists "grant_partners_delete_admin" on public.grant_partners;
create policy "grant_partners_delete_admin"
	on public.grant_partners for delete to authenticated
	using (
		(select private.has_org_role(
			organization_id,
			array['owner', 'admin']::public.organization_member_role[]
		))
		or (select private.is_platform_admin(null))
	);

grant select, insert, update, delete on public.grant_organization_settings to authenticated;
grant select, insert, update, delete on public.grant_partners to authenticated;
