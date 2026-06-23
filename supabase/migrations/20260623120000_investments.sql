-- =====================================================================
-- Investments
--
-- Models any kind of personal investment: equity stake in a business
-- ("capital"), rotating savings club ("tontine"), term deposit / savings
-- ("savings"), or "other". Money in/out is recorded as transactions of
-- kind 'investment_in' (apport) and 'investment_out' (retour) linked to
-- the investment via linked_entity_type='investment'.
--
-- The `investment_balance` view aggregates apports vs returns and exposes
-- the net P/L per investment in its own currency.
-- =====================================================================

create table public.investments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  counterparty_person_id uuid references public.persons(id) on delete restrict,
  title text not null,
  type text not null default 'capital'
    check (type in ('capital', 'tontine', 'savings', 'other')),
  principal_amount numeric(20, 6) not null check (principal_amount > 0),
  principal_currency text not null references public.currencies(code),
  expected_return_pct numeric(6, 3),
  start_date date not null,
  end_date date,
  status text not null default 'active'
    check (status in ('active', 'closed', 'lost')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index investments_owner_idx
  on public.investments (owner_id) where deleted_at is null;
create index investments_counterparty_idx
  on public.investments (counterparty_person_id) where deleted_at is null;
create index investments_status_idx
  on public.investments (status) where deleted_at is null;
create index investments_type_idx
  on public.investments (type) where deleted_at is null;

alter table public.investments enable row level security;
create policy "investments_owner_all" on public.investments
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create trigger investments_set_updated_at
  before update on public.investments
  for each row execute function public.set_updated_at();

create trigger investments_audit
  after insert or update or delete on public.investments
  for each row execute function public.audit_change();

-- Vue: agrégation des apports / retours par investissement
create view public.investment_balance
with (security_invoker = on)
as
select
  i.id as investment_id,
  i.owner_id,
  i.principal_currency as currency,
  coalesce(sum(t.amount) filter (where t.kind = 'investment_in'), 0)
    as contributed_amount,
  coalesce(sum(t.amount) filter (where t.kind = 'investment_out'), 0)
    as returned_amount,
  coalesce(sum(t.amount) filter (where t.kind = 'investment_out'), 0)
    - coalesce(sum(t.amount) filter (where t.kind = 'investment_in'), 0)
    as net_amount
from public.investments i
left join public.transactions t
  on t.linked_entity_id = i.id
  and t.linked_entity_type = 'investment'
  and t.kind in ('investment_in', 'investment_out')
  and t.deleted_at is null
where i.deleted_at is null
group by i.id, i.owner_id, i.principal_currency;

grant select on public.investment_balance to authenticated;
