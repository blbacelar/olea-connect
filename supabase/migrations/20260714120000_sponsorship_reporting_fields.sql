alter table public.sponsorships
  add column if not exists recognition_preferences jsonb not null default '{}'::jsonb,
  add column if not exists private_terms text,
  add column if not exists financial_notes text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sponsorships_recognition_preferences_object'
      and conrelid = 'public.sponsorships'::regclass
  ) then
    alter table public.sponsorships
      add constraint sponsorships_recognition_preferences_object
      check (jsonb_typeof(recognition_preferences) = 'object') not valid;
  end if;
end $$;

alter table public.sponsorships
  validate constraint sponsorships_recognition_preferences_object;

alter table public.grant_program_contributions
  add column if not exists grant_round_id uuid references public.grant_rounds(id) on delete set null;

create index if not exists grant_program_contributions_grant_round_id_idx
  on public.grant_program_contributions(grant_round_id);
