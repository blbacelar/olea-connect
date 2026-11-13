-- Recovered from development Supabase schema_migrations on 2026-11-12.
-- Members may RSVP while the full calendar row remains hidden by RLS.
-- The trigger reads only to validate the referenced meeting; insert/update
-- policies still enforce that a user can write only their own RSVP.
alter function private.validate_board_calendar_rsvp() security definer;
