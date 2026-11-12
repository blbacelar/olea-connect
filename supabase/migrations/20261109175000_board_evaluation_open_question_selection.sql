-- Recovered from development Supabase schema_migrations on 2026-11-12.
-- Keep the four optional annual prompts configurable per survey. Existing
-- published surveys retain all four prompts, matching their original form.
alter table public.board_evaluation_toolkit_surveys
  add column open_question_ids text[] not null default array['0', '1', '2', '3']::text[];

alter table public.board_evaluation_toolkit_surveys
  add constraint board_evaluation_toolkit_open_question_ids_valid
  check (
    open_question_ids <@ array['0', '1', '2', '3']::text[]
    and cardinality(open_question_ids) <= 4
  );
