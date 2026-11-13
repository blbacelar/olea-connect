-- Recovered from development Supabase schema_migrations on 2026-11-12.
-- Remember each organization's last published question selection. The
-- configuration contains question IDs only, never respondent data.
create table public.board_evaluation_toolkit_configs (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  annual_question_ids jsonb not null default '[]'::jsonb
    check (jsonb_typeof(annual_question_ids) = 'array'),
  annual_open_question_ids text[] not null default array['0', '1', '2', '3']::text[],
  meeting_question_ids jsonb not null default '[]'::jsonb
    check (jsonb_typeof(meeting_question_ids) = 'array'),
  updated_at timestamptz not null default now(),
  constraint board_evaluation_config_open_question_ids_valid
    check (annual_open_question_ids <@ array['0', '1', '2', '3']::text[])
);

create or replace function private.sync_board_evaluation_question_config()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.board_evaluation_toolkit_configs (
    organization_id, annual_question_ids, annual_open_question_ids,
    meeting_question_ids, updated_at
  ) values (
    new.organization_id,
    case when new.kind = 'annual' then new.question_ids else '[]'::jsonb end,
    case when new.kind = 'annual' then new.open_question_ids
      else array['0', '1', '2', '3']::text[] end,
    case when new.kind = 'meeting' then new.question_ids else '[]'::jsonb end,
    now()
  )
  on conflict (organization_id) do update set
    annual_question_ids = case when new.kind = 'annual'
      then excluded.annual_question_ids
      else public.board_evaluation_toolkit_configs.annual_question_ids end,
    annual_open_question_ids = case when new.kind = 'annual'
      then excluded.annual_open_question_ids
      else public.board_evaluation_toolkit_configs.annual_open_question_ids end,
    meeting_question_ids = case when new.kind = 'meeting'
      then excluded.meeting_question_ids
      else public.board_evaluation_toolkit_configs.meeting_question_ids end,
    updated_at = now();
  return new;
end;
$$;

create trigger board_evaluation_question_config_sync
  after insert on public.board_evaluation_toolkit_surveys
  for each row execute function private.sync_board_evaluation_question_config();

alter table public.board_evaluation_toolkit_configs enable row level security;

revoke all on public.board_evaluation_toolkit_configs from public, anon, authenticated;

grant select, insert, update, delete on public.board_evaluation_toolkit_configs to service_role;

revoke all on function private.sync_board_evaluation_question_config() from public;
