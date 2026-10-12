update public.membership_plans
set
  annual_price_cents = case id
    when 'seedling' then 118000
    when 'roots' then 353000
    when 'canopy' then 706000
  end,
  monthly_price_cents = case id
    when 'seedling' then 32500
    when 'roots' then 97500
    when 'canopy' then 195000
  end,
  features = case id
    when 'seedling' then '[
      "Board calendar, meetings, workflows, and packages",
      "Grant checklists, templates, dashboard, and deadlines",
      "Olea Connects Community, webinars, and forums",
      "48-hour email support"
    ]'::jsonb
    when 'roots' then '[
      "Everything in Seedling",
      "Board recruitment toolkit and skills matrix",
      "KPI and impact dashboard",
      "Board evaluation system",
      "Priority email support within 48 hours"
    ]'::jsonb
    when 'canopy' then '[
      "Everything in Roots",
      "ED/CEO 360 review",
      "Strategic planning module",
      "Board governance training",
      "Community leadership opportunities",
      "Priority phone and email support"
    ]'::jsonb
  end
where id in ('seedling', 'roots', 'canopy');
