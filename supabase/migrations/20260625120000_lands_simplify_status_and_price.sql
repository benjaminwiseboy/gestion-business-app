-- =====================================================================
-- Simplification du modèle Terrain :
--  - Un seul champ statut (acquisition_status) avec 3 valeurs explicites
--    'planned' (en cours d'acquisition) / 'owned' (acquis) / 'blocked'
--  - Le prix d'acquisition devient prix au m² (le total est calculé côté
--    UI). Renommage acquisition_amount → acquisition_price_per_m2.
-- =====================================================================

-- 1. Migrer toute valeur 'blocked' du status vers acquisition_status
update public.land_projects
  set acquisition_status = 'blocked'
  where status = 'blocked';

-- 2. Drop la colonne status (obsolète maintenant que tout passe par
--    acquisition_status)
alter table public.land_projects drop column status;

-- 3. Étendre la CHECK acquisition_status pour autoriser 'blocked'
alter table public.land_projects
  drop constraint if exists land_projects_acquisition_status_check;
alter table public.land_projects
  add constraint land_projects_acquisition_status_check
  check (acquisition_status in ('planned', 'owned', 'blocked'));

-- 4. Renommer acquisition_amount → acquisition_price_per_m2 (l'utilisateur
--    saisit désormais le prix au m², le total est dérivé en UI)
alter table public.land_projects
  rename column acquisition_amount to acquisition_price_per_m2;
