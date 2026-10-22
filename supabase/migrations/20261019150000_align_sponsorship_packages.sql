-- Align the admin sponsorship catalog with the five packages offered publicly
-- and in the October 2026 MNP founding partnership proposal. Historical
-- packages stay in place for existing agreements and reporting.
insert into public.sponsorship_packages (
  id, name, annual_price_cents, olea_gives_contribution_cents,
  currency, category_exclusivity, benefits, is_active, sort_order
)
values
  ('seedkeeper', 'Seedkeeper', 200000, 0, 'CAD', false,
   '["Funds 2 Seedling boards for one year", "Sponsor wall", "Newsletter mention", "Quarterly impact stories", "Circle of Generosity", "Year-end gala invitation"]'::jsonb, true, 10),
  ('root_keeper', 'Root Keeper', 800000, 0, 'CAD', false,
   '["Funds 2 Roots and 2 Seedling boards for one year", "Seedkeeper benefits", "Website feature", "Quarterly webinar invitations", "Member directory access"]'::jsonb, true, 20),
  ('resilience_builder', 'Resilience Builder', 1444400, 0, 'CAD', true,
   '["Funds 2 Roots and 6 Seedling boards for one year", "Root Keeper benefits", "Finance sector expert role", "Quarterly workshop and webinar", "Consent-based introductions", "Featured newsletter placement"]'::jsonb, true, 30),
  ('legacy_guardian', 'Legacy Guardian', 3300000, 0, 'CAD', true,
   '["Funds 3 Roots and 12 Seedling boards for one year", "Resilience Builder benefits", "Governance training and board calendar for up to 5 sponsor leaders", "Legacy Guardian Roundtable", "Premium website profile", "Speaking opportunities"]'::jsonb, true, 40),
  ('catalyst', 'Catalyst', 4400000, 0, 'CAD', true,
   '["Funds 4 Roots and 16 Seedling boards for one year", "Legacy Guardian benefits", "Quarterly Impact Circle", "Quarterly strategy calls", "Consent-based board conversations", "Featured gala speaking"]'::jsonb, true, 50)
on conflict (id) do update set
  name = excluded.name,
  annual_price_cents = excluded.annual_price_cents,
  olea_gives_contribution_cents = excluded.olea_gives_contribution_cents,
  currency = excluded.currency,
  category_exclusivity = excluded.category_exclusivity,
  benefits = excluded.benefits,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;

update public.sponsorship_packages
set is_active = false
where id in ('bronze', 'silver', 'gold', 'platinum')
  and is_active = true;

-- Event-only packages remain available for existing webinar and summit deals.
