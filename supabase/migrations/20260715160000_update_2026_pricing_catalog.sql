update public.membership_plans
set
  description = 'Core governance operations, branded resources, and community access for organizations under $500k annual budget.',
  monthly_price_cents = 20000,
  annual_price_cents = 80000,
  included_seats = 5,
  features = '[
    "Board calendar, meetings, workflows, and packages",
    "Board HR directory, roles, and term tracking",
    "Grant checklists, templates, dashboard, and deadlines",
    "Olea Connects Community, webinars, and forums",
    "Branded templates and quarterly Olea Gives applications",
    "48-hour email support"
  ]'::jsonb
where id = 'seedling';

update public.membership_plans
set
  description = 'Deeper governance, recruitment, impact tracking, and learning support for organizations with $500k-$2M annual budget.',
  monthly_price_cents = 80000,
  annual_price_cents = 320000,
  included_seats = 10,
  features = '[
    "Everything in Seedling",
    "Board recruitment toolkit and skills matrix",
    "KPI and impact dashboard",
    "Quarterly Impact Accelerator Cohorts",
    "Sponsor webinars",
    "Priority email support within 48 hours"
  ]'::jsonb
where id = 'roots';

update public.membership_plans
set
  description = 'Complete governance systems, executive review, and strategy tools for organizations with $2M-$5M annual budget.',
  monthly_price_cents = 150000,
  annual_price_cents = 600000,
  included_seats = 15,
  features = '[
    "Everything in Roots",
    "Board evaluation system",
    "ED/CEO 360 review",
    "Strategic planning module",
    "Board training modules",
    "Community leadership opportunities",
    "10% off coaching and admin add-ons",
    "Priority phone and email support"
  ]'::jsonb
where id = 'canopy';

update public.membership_plans
set
  description = 'Enterprise support, facilitation, thought leadership, and introductions for organizations with $5M+ annual budget.',
  monthly_price_cents = 240000,
  annual_price_cents = 960000,
  included_seats = 20,
  features = '[
    "Everything in Canopy",
    "Annual onboarding and board training facilitation",
    "Board retreat facilitation support",
    "Thought leader positioning",
    "Peer networking and board-level introductions",
    "Olea Connects summit speaking slot",
    "10% off coaching and admin add-ons"
  ]'::jsonb
where id = 'harvest';
