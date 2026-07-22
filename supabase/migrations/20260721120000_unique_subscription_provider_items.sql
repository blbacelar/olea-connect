-- Provider item identifiers are the idempotency boundary for billing syncs.
-- Keep legacy rows without a provider id valid while preventing duplicate
-- Stripe subscription items and one-time seat purchase entitlements.
create unique index if not exists subscription_items_provider_item_id_uidx
  on public.subscription_items(provider_item_id)
  where provider_item_id is not null;
