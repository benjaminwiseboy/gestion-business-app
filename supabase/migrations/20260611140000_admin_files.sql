-- =====================================================================
-- Admin files (dossiers techniques)
--
-- Tracks administrative procedures around land: technical files, land
-- titles, linking procedures, surveying work, legal proceedings.
-- A dossier has a beneficiary (the land owner) and an optional surveyor
-- (the geometre doing the field work). Costs are paid out as
-- admin_payment transactions linked to the file.
-- =====================================================================

-- 1. Add 'admin_payment' to the transactions.kind enum
alter table public.transactions
  drop constraint transactions_kind_check;

alter table public.transactions
  add constraint transactions_kind_check
  check (
    kind in (
      'loan_disbursement',
      'repayment',
      'land_payment',
      'admin_payment',
      'investment_in',
      'investment_out',
      'fee',
      'adjustment'
    )
  );

-- 2. The admin_files table
create table public.admin_files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  title text not null,
  type text not null check (
    type in ('technical', 'title', 'linking', 'survey', 'legal')
  ),
  beneficiary_person_id uuid
    references public.persons(id) on delete restrict,
  surveyor_person_id uuid
    references public.persons(id) on delete set null,
  surface_m2 numeric(12, 2),
  total_cost_amount numeric(20, 6),
  total_cost_currency text references public.currencies(code),
  status text not null default 'processing' check (
    status in (
      'processing',
      'awaiting_docs',
      'awaiting_payment',
      'done',
      'blocked'
    )
  ),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index admin_files_owner_idx
  on public.admin_files (owner_id) where deleted_at is null;
create index admin_files_status_idx
  on public.admin_files (status) where deleted_at is null;
create index admin_files_type_idx
  on public.admin_files (type) where deleted_at is null;
create index admin_files_surveyor_idx
  on public.admin_files (surveyor_person_id) where deleted_at is null;
create index admin_files_beneficiary_idx
  on public.admin_files (beneficiary_person_id) where deleted_at is null;

alter table public.admin_files enable row level security;
create policy "admin_files_owner_all" on public.admin_files
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create trigger admin_files_set_updated_at
  before update on public.admin_files
  for each row execute function public.set_updated_at();

create trigger admin_files_audit
  after insert or update or delete on public.admin_files
  for each row execute function public.audit_change();

-- 3. Remaining-cost view
create view public.admin_file_remaining
with (security_invoker = on)
as
select
  f.id as file_id,
  f.owner_id,
  f.total_cost_currency as currency,
  coalesce(f.total_cost_amount, 0) as total_amount,
  coalesce(sum(t.amount), 0) as paid_amount,
  coalesce(f.total_cost_amount, 0) - coalesce(sum(t.amount), 0)
    as remaining_amount
from public.admin_files f
left join public.transactions t
  on t.linked_entity_id = f.id
  and t.linked_entity_type = 'admin_file'
  and t.kind = 'admin_payment'
  and t.deleted_at is null
where f.deleted_at is null
group by f.id, f.owner_id, f.total_cost_currency, f.total_cost_amount;

grant select on public.admin_file_remaining to authenticated;
