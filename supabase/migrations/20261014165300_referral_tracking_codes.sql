-- Tracking-only codes attribute signups without creating referral commissions.
create table public.referral_tracking_codes (
  code text primary key,
  label text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint referral_tracking_codes_format check (code ~ '^OLEA-[A-Z0-9]{6,16}$'),
  constraint referral_tracking_codes_label_length check (char_length(btrim(label)) between 2 and 160)
);

alter table public.referral_tracking_codes enable row level security;
revoke all on public.referral_tracking_codes from public, anon, authenticated;
grant select, insert, update, delete on public.referral_tracking_codes to service_role;

do $$
begin
  if exists (select 1 from public.referral_links where code = 'OLEA-JESSICA') then
    raise exception 'OLEA-JESSICA is already assigned to a commission-bearing referral link';
  end if;
end;
$$;

insert into public.referral_tracking_codes (code, label)
values ('OLEA-JESSICA', 'Jessica');
