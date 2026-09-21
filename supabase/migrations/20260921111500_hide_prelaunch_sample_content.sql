-- Remove prelaunch sample content from member-facing catalogs while preserving
-- real customer-owned and platform-admin-created records.

update public.events
set
  status = 'archived',
  recording_url = null
where
  (id = '20000000-0000-4000-8000-000000000001'
    and slug = 'governance-best-practices-small-nonprofits')
  or
  (id = '20000000-0000-4000-8000-000000000002'
    and slug = 'board-composition-101');

update public.grant_rounds
set status = 'draft'
where id = '30000000-0000-4000-8000-000000000001'
  and name = 'Q3 2026 Community Grant';
