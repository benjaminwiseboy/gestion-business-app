-- =====================================================================
-- Land projects (terrains)
--
-- Models a sale of land to a client/acquéreur. The total amount is
-- generated from surface × price/m². Payments are recorded as
-- transactions of kind 'land_payment' linked to the project.
-- =====================================================================

create table public.land_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  client_person_id uuid references public.persons(id) on delete restrict,
  title text not null,
  location text,
  surface_m2 numeric(12, 2) not null check (surface_m2 > 0),
  price_per_m2_amount numeric(20, 6) not null check (price_per_m2_amount > 0),
  price_per_m2_currency text not null references public.currencies(code),
  total_amount numeric(20, 6) generated always as
    (surface_m2 * price_per_m2_amount) stored,
  status text not null default 'active'
    check (status in ('active', 'settled', 'blocked')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index land_projects_owner_idx
  on public.land_projects (owner_id) where deleted_at is null;
create index land_projects_client_idx
  on public.land_projects (client_person_id) where deleted_at is null;
create index land_projects_status_idx
  on public.land_projects (status) where deleted_at is null;
create index land_projects_title_search_idx
  on public.land_projects using gin (to_tsvector('french', coalesce(title, '') || ' ' || coalesce(location, '')))
  where deleted_at is null;

alter table public.land_projects enable row level security;
create policy "land_projects_owner_all" on public.land_projects
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create trigger land_projects_set_updated_at
  before update on public.land_projects
  for each row execute function public.set_updated_at();

create trigger land_projects_audit
  after insert or update or delete on public.land_projects
  for each row execute function public.audit_change();

-- Vue: paid_amount = sum land_payment transactions linked to project
create view public.land_project_remaining
with (security_invoker = on)
as
select
  l.id as project_id,
  l.owner_id,
  l.price_per_m2_currency as currency,
  l.total_amount,
  coalesce(sum(t.amount), 0) as paid_amount,
  l.total_amount - coalesce(sum(t.amount), 0) as remaining_amount
from public.land_projects l
left join public.transactions t
  on t.linked_entity_id = l.id
  and t.linked_entity_type = 'land_project'
  and t.kind = 'land_payment'
  and t.deleted_at is null
where l.deleted_at is null
group by l.id, l.owner_id, l.price_per_m2_currency, l.total_amount;

grant select on public.land_project_remaining to authenticated;
