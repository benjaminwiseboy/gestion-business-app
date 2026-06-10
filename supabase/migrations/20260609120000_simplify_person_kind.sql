-- =====================================================================
-- Simplify persons: replace the per-person "roles" array (borrower,
-- lender, client, investor, surveyor) with a single "kind" column.
--
-- Rationale: a person's relationship to the user changes over time
-- (today's borrower can be tomorrow's lender). That relationship is
-- already captured per-loan / per-transaction. What is intrinsic to
-- the person is *what kind of party* they are:
--   - individual: personne physique
--   - entity    : personne morale (banque, tontine, association, ...)
-- =====================================================================

alter table public.persons
  add column kind text not null default 'individual'
    check (kind in ('individual', 'entity'));

alter table public.persons drop column roles;
