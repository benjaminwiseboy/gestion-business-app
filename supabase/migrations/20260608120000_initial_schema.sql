-- =====================================================================
-- Initial schema for gestion-business-app
-- =====================================================================
-- Tables: currencies, user_settings, persons, loans, transactions, change_log
-- Views: loan_remaining
-- Triggers: audit (change_log), updated_at maintenance, new user bootstrap
-- =====================================================================

create extension if not exists "pgcrypto";

-- =====================================================================
-- 1. CURRENCIES (global reference data)
-- =====================================================================
create table public.currencies (
  code text primary key,
  symbol text not null,
  decimals smallint not null default 0,
  default_rate_to_xof numeric(20, 6) not null default 1,
  created_at timestamptz not null default now()
);

insert into public.currencies (code, symbol, decimals, default_rate_to_xof) values
  ('XOF', 'FCFA', 0, 1),
  ('USD', '$', 2, 600);

alter table public.currencies enable row level security;
create policy "currencies_select_all" on public.currencies
  for select using (true);

-- =====================================================================
-- 2. UPDATED_AT TRIGGER (reusable)
-- =====================================================================
create or replace function public.set_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- =====================================================================
-- 3. USER_SETTINGS (per-user preferences, incl. USD/XOF rate override)
-- =====================================================================
create table public.user_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  usd_to_xof_rate numeric(20, 6) not null default 600,
  default_currency text not null default 'XOF' references public.currencies(code),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;
create policy "user_settings_owner_all" on public.user_settings
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

-- Bootstrap a settings row for every new auth user (including anonymous)
create or replace function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_settings (owner_id) values (new.id)
  on conflict (owner_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- 4. PERSONS
-- =====================================================================
create table public.persons (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  roles text[] not null default '{}',
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index persons_owner_idx
  on public.persons (owner_id) where deleted_at is null;
create index persons_name_search_idx
  on public.persons using gin (to_tsvector('french', full_name))
  where deleted_at is null;

alter table public.persons enable row level security;
create policy "persons_owner_all" on public.persons
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create trigger persons_set_updated_at
  before update on public.persons
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 5. LOANS
-- =====================================================================
create table public.loans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references public.persons(id) on delete restrict,
  direction text not null check (direction in ('lent', 'borrowed')),
  principal_amount numeric(20, 6) not null check (principal_amount > 0),
  principal_currency text not null references public.currencies(code),
  interest_rate numeric(8, 4),
  interest_type text check (interest_type in ('simple', 'compound', 'none')),
  issue_date date not null,
  due_date date,
  status text not null default 'active'
    check (status in ('active', 'repaid', 'overdue', 'partial')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index loans_owner_idx
  on public.loans (owner_id) where deleted_at is null;
create index loans_person_idx
  on public.loans (person_id) where deleted_at is null;
create index loans_status_idx
  on public.loans (status) where deleted_at is null;

alter table public.loans enable row level security;
create policy "loans_owner_all" on public.loans
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create trigger loans_set_updated_at
  before update on public.loans
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 6. TRANSACTIONS (central journal)
-- =====================================================================
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in (
    'loan_disbursement',
    'repayment',
    'land_payment',
    'investment_in',
    'investment_out',
    'fee',
    'adjustment'
  )),
  amount numeric(20, 6) not null check (amount > 0),
  currency text not null references public.currencies(code),
  exchange_rate_snapshot numeric(20, 6) not null default 1,
  occurred_at date not null,
  person_id uuid references public.persons(id) on delete set null,
  linked_entity_type text
    check (linked_entity_type in ('loan', 'land_project', 'admin_file', 'investment')),
  linked_entity_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint transactions_entity_required
    check (person_id is not null or linked_entity_id is not null),
  constraint transactions_linked_entity_consistent
    check (
      (linked_entity_type is null and linked_entity_id is null) or
      (linked_entity_type is not null and linked_entity_id is not null)
    )
);

create index transactions_owner_idx
  on public.transactions (owner_id) where deleted_at is null;
create index transactions_person_idx
  on public.transactions (person_id) where deleted_at is null;
create index transactions_occurred_idx
  on public.transactions (occurred_at desc) where deleted_at is null;
create index transactions_linked_idx
  on public.transactions (linked_entity_type, linked_entity_id) where deleted_at is null;

alter table public.transactions enable row level security;
create policy "transactions_owner_all" on public.transactions
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 7. CHANGE_LOG (audit)
-- =====================================================================
create table public.change_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  diff jsonb,
  changed_at timestamptz not null default now()
);

create index change_log_entity_idx
  on public.change_log (entity_type, entity_id);
create index change_log_changed_idx
  on public.change_log (changed_at desc);
create index change_log_owner_idx
  on public.change_log (owner_id);

alter table public.change_log enable row level security;
create policy "change_log_owner_select" on public.change_log
  for select using (owner_id = auth.uid());

-- Generic audit trigger function
create or replace function public.audit_change() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_entity_id uuid;
  v_diff jsonb;
begin
  if (tg_op = 'INSERT') then
    v_owner_id := new.owner_id;
    v_entity_id := new.id;
    v_diff := to_jsonb(new);
  elsif (tg_op = 'UPDATE') then
    v_owner_id := new.owner_id;
    v_entity_id := new.id;
    v_diff := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
  elsif (tg_op = 'DELETE') then
    v_owner_id := old.owner_id;
    v_entity_id := old.id;
    v_diff := to_jsonb(old);
  end if;

  insert into public.change_log (owner_id, entity_type, entity_id, action, diff)
  values (v_owner_id, tg_table_name, v_entity_id, lower(tg_op), v_diff);

  return coalesce(new, old);
end;
$$;

create trigger persons_audit
  after insert or update or delete on public.persons
  for each row execute function public.audit_change();

create trigger loans_audit
  after insert or update or delete on public.loans
  for each row execute function public.audit_change();

create trigger transactions_audit
  after insert or update or delete on public.transactions
  for each row execute function public.audit_change();

-- =====================================================================
-- 8. VIEWS
-- =====================================================================
-- loan_remaining: live computation of remaining balance per loan
-- security_invoker = on so the underlying tables' RLS applies (per-user isolation)
create view public.loan_remaining
with (security_invoker = on)
as
select
  l.id as loan_id,
  l.owner_id,
  l.principal_currency as currency,
  l.principal_amount,
  coalesce(sum(t.amount), 0) as repaid_amount,
  l.principal_amount - coalesce(sum(t.amount), 0) as remaining_amount
from public.loans l
left join public.transactions t
  on t.linked_entity_id = l.id
  and t.linked_entity_type = 'loan'
  and t.kind = 'repayment'
  and t.deleted_at is null
where l.deleted_at is null
group by l.id, l.owner_id, l.principal_currency, l.principal_amount;

grant select on public.loan_remaining to authenticated;
