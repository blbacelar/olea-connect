-- Each funded board receives the plan appropriate to its annual budget.
-- These are the per-board sponsor rates already offered on the public site.
insert into public.sponsorship_board_targets
  (package_id, plan_id, board_count, allocation_cents)
values
  ('seedkeeper', 'seedling', 2, 100000),
  ('root_keeper', 'seedling', 2, 100000),
  ('root_keeper', 'roots', 2, 300000),
  ('resilience_builder', 'seedling', 6, 100000),
  ('resilience_builder', 'roots', 2, 300000),
  ('legacy_guardian', 'seedling', 12, 100000),
  ('legacy_guardian', 'roots', 3, 300000),
  ('catalyst', 'seedling', 16, 100000),
  ('catalyst', 'roots', 4, 300000)
on conflict (package_id, plan_id) do update set
  board_count = excluded.board_count,
  allocation_cents = excluded.allocation_cents;
