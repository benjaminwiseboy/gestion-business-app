-- =====================================================================
-- Push subscriptions (Web Push API)
--
-- Un user peut avoir plusieurs subscriptions (une par appareil/navigateur).
-- endpoint est unique côté Push Service (FCM/APNs/Mozilla), donc utilisé
-- comme clé naturelle pour les upserts. p256dh et auth sont les clés
-- nécessaires au chiffrement du payload via web-push.
-- =====================================================================

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  last_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index push_subscriptions_endpoint_idx
  on public.push_subscriptions (endpoint) where deleted_at is null;
create index push_subscriptions_owner_idx
  on public.push_subscriptions (owner_id) where deleted_at is null;

alter table public.push_subscriptions enable row level security;
create policy "push_subscriptions_owner_all" on public.push_subscriptions
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create trigger push_subscriptions_set_updated_at
  before update on public.push_subscriptions
  for each row execute function public.set_updated_at();
