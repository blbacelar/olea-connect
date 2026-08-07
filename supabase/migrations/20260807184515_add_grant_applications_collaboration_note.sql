alter table public.grant_applications
add column if not exists collaboration_note text;
