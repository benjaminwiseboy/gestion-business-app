-- =====================================================================
-- Refactor Foncier : un Terrain peut avoir N Ventes + N Dossiers admin
--
-- Avant : land_projects = 1 terrain = 1 vente à 1 client (modèle figé).
-- Après : land_projects (table conservée pour stabilité des FK) représente
-- le Terrain ; les ventes vivent dans land_sales ; les dossiers admin
-- pointent en option vers un terrain via admin_files.land_id.
--
-- Données existantes : chaque ancien land_project ayant un client devient
-- 1 terrain + 1 vente (id préservé côté terrain). Les transactions
-- land_payment migrent de linked_entity_type='land_project' vers
-- 'land_sale' (linked_entity_id mappé sur la nouvelle vente).
--
-- Acquisition : champ informatif sur land_projects (prix prévu / payé),
-- pas de tracking des paiements vendeur (hors-scope).
-- =====================================================================

-- 1. Étendre land_projects avec acquisition + total_surface ----------

alter table public.land_projects
  add column total_surface_m2 numeric(12, 2),
  add column acquisition_status text not null default 'owned'
    check (acquisition_status in ('owned', 'planned')),
  add column acquisition_amount numeric(20, 6),
  add column acquisition_currency text references public.currencies(code),
  add column acquisition_date date,
  add column acquisition_seller_person_id uuid
    references public.persons(id) on delete restrict;

-- Backfill : surface_m2 ancien (était la surface vendue) devient la
-- surface totale du terrain par défaut (cas 1 terrain = 1 vente complète).
update public.land_projects
  set total_surface_m2 = surface_m2
  where total_surface_m2 is null;

alter table public.land_projects
  alter column total_surface_m2 set not null;
alter table public.land_projects
  add constraint land_projects_total_surface_check
  check (total_surface_m2 > 0);

create index land_projects_seller_idx
  on public.land_projects (acquisition_seller_person_id)
  where deleted_at is null;

-- 2. Créer land_sales ------------------------------------------------

create table public.land_sales (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  land_id uuid not null
    references public.land_projects(id) on delete restrict,
  buyer_person_id uuid references public.persons(id) on delete restrict,
  surface_m2 numeric(12, 2) not null check (surface_m2 > 0),
  price_per_m2_amount numeric(20, 6) not null check (price_per_m2_amount > 0),
  price_per_m2_currency text not null references public.currencies(code),
  total_amount numeric(20, 6) generated always as
    (surface_m2 * price_per_m2_amount) stored,
  sale_date date not null default current_date,
  status text not null default 'active'
    check (status in ('active', 'settled', 'blocked')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index land_sales_owner_idx
  on public.land_sales (owner_id) where deleted_at is null;
create index land_sales_land_idx
  on public.land_sales (land_id) where deleted_at is null;
create index land_sales_buyer_idx
  on public.land_sales (buyer_person_id) where deleted_at is null;
create index land_sales_status_idx
  on public.land_sales (status) where deleted_at is null;

alter table public.land_sales enable row level security;
create policy "land_sales_owner_all" on public.land_sales
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create trigger land_sales_set_updated_at
  before update on public.land_sales
  for each row execute function public.set_updated_at();

create trigger land_sales_audit
  after insert or update or delete on public.land_sales
  for each row execute function public.audit_change();

-- 3. Migration des ventes existantes -----------------------------------

-- Pour chaque land_project avec client → 1 nouvelle vente
create temp table _project_to_sale_mapping (
  project_id uuid not null,
  sale_id uuid not null default gen_random_uuid()
);

insert into _project_to_sale_mapping (project_id)
  select id from public.land_projects
  where client_person_id is not null and deleted_at is null;

insert into public.land_sales (
  id, owner_id, land_id, buyer_person_id, surface_m2,
  price_per_m2_amount, price_per_m2_currency, sale_date, status,
  notes, created_at, updated_at
)
select
  m.sale_id,
  p.owner_id,
  p.id,
  p.client_person_id,
  p.surface_m2,
  p.price_per_m2_amount,
  p.price_per_m2_currency,
  coalesce(p.created_at::date, current_date),
  p.status,
  p.notes,
  p.created_at,
  p.updated_at
from public.land_projects p
join _project_to_sale_mapping m on m.project_id = p.id;

-- 4. Re-router les transactions land_payment vers la nouvelle vente ---
-- La CHECK existante sur transactions.linked_entity_type n'inclut pas encore
-- 'land_sale'. On la drop, on update, on la recrée avec la nouvelle liste.

alter table public.transactions
  drop constraint if exists transactions_linked_entity_type_check;

update public.transactions t
set
  linked_entity_type = 'land_sale',
  linked_entity_id = m.sale_id
from _project_to_sale_mapping m
where t.linked_entity_type = 'land_project'
  and t.linked_entity_id = m.project_id
  and t.kind = 'land_payment';

alter table public.transactions
  add constraint transactions_linked_entity_type_check
  check (
    linked_entity_type is null
    or linked_entity_type in ('loan', 'land_sale', 'admin_file', 'investment')
  );

drop table _project_to_sale_mapping;

-- 5. Nettoyer land_projects des colonnes "vente" -----------------------

drop view if exists public.land_project_remaining;

alter table public.land_projects
  drop column client_person_id,
  drop column surface_m2,
  drop column price_per_m2_amount,
  drop column price_per_m2_currency,
  drop column total_amount;

-- 6. Lier admin_files à un terrain (optionnel) ------------------------

alter table public.admin_files
  add column land_id uuid
  references public.land_projects(id) on delete set null;

create index admin_files_land_idx
  on public.admin_files (land_id) where deleted_at is null;

-- 7. Vues calculées ----------------------------------------------------

-- Reste à payer par vente
create view public.land_sale_remaining
with (security_invoker = on)
as
select
  s.id as sale_id,
  s.owner_id,
  s.land_id,
  s.price_per_m2_currency as currency,
  s.total_amount,
  coalesce(sum(t.amount), 0) as paid_amount,
  s.total_amount - coalesce(sum(t.amount), 0) as remaining_amount
from public.land_sales s
left join public.transactions t
  on t.linked_entity_id = s.id
  and t.linked_entity_type = 'land_sale'
  and t.kind = 'land_payment'
  and t.deleted_at is null
where s.deleted_at is null
group by s.id, s.owner_id, s.land_id, s.price_per_m2_currency, s.total_amount;

grant select on public.land_sale_remaining to authenticated;

-- Inventaire par terrain : surface vendue / restante
create view public.land_inventory
with (security_invoker = on)
as
select
  l.id as land_id,
  l.owner_id,
  l.total_surface_m2,
  coalesce(sum(s.surface_m2), 0) as sold_surface_m2,
  l.total_surface_m2 - coalesce(sum(s.surface_m2), 0) as remaining_surface_m2
from public.land_projects l
left join public.land_sales s
  on s.land_id = l.id and s.deleted_at is null
where l.deleted_at is null
group by l.id, l.owner_id, l.total_surface_m2;

grant select on public.land_inventory to authenticated;
