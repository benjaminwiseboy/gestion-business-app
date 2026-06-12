-- =====================================================================
-- Rename XOF → XAF
--
-- XOF (West African CFA) and XAF (Central African CFA) are both
-- displayed as "FCFA" but have different ISO codes. Switch the pivot
-- currency to XAF for Central African use.
-- =====================================================================

-- 1. Rename the column on currencies before adding the new row
alter table public.currencies
  rename column default_rate_to_xof to default_rate_to_xaf;

-- 2. Add XAF (using a temporary code first to satisfy FK ordering,
--    actually XAF doesn't exist yet so insert is safe)
insert into public.currencies (code, symbol, decimals, default_rate_to_xaf)
values ('XAF', 'FCFA', 0, 1);

-- 3. Migrate every foreign reference from XOF → XAF
update public.loans
  set principal_currency = 'XAF'
  where principal_currency = 'XOF';

update public.transactions
  set currency = 'XAF'
  where currency = 'XOF';

update public.land_projects
  set price_per_m2_currency = 'XAF'
  where price_per_m2_currency = 'XOF';

update public.user_settings
  set default_currency = 'XAF'
  where default_currency = 'XOF';

-- 4. Drop XOF (no FK references left)
delete from public.currencies where code = 'XOF';

-- 5. Rename user_settings column + flip the default for new users
alter table public.user_settings
  rename column usd_to_xof_rate to usd_to_xaf_rate;

alter table public.user_settings
  alter column default_currency set default 'XAF';
