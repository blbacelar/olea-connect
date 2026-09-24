-- Preserve the billed organization's identifier in financial audit history
-- even if the workspace is later deleted.
alter table public.referral_payouts
  drop constraint if exists referral_payouts_referred_organization_id_fkey;
