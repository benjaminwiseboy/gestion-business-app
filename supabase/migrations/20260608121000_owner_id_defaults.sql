-- =====================================================================
-- Auto-fill owner_id with auth.uid() so clients don't need to send it
-- on insert (the column is still NOT NULL and protected by RLS WITH CHECK)
-- =====================================================================

alter table public.persons      alter column owner_id set default auth.uid();
alter table public.loans        alter column owner_id set default auth.uid();
alter table public.transactions alter column owner_id set default auth.uid();
