-- New annual catalog prices. Existing Stripe subscriptions retain their own price IDs.
update public.membership_plans
set annual_price_cents = case id
  when 'seedling' then 117500
  when 'roots' then 353000
  when 'canopy' then 706000
end
where id in ('seedling', 'roots', 'canopy');
