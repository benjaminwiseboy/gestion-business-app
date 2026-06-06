# 📋 Plan de tâches — gestion-business-app

> Décomposition par phases. Chaque tâche : **ID · titre · estimation · dépendances · critères d'acceptation**.
>
> Légende estimations : `XS` ≤ 2h · `S` ≤ 1j · `M` 1-3j · `L` 3-5j · `XL` > 5j
>
> **Stack** : Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui + Supabase + PWA. Déploiement Vercel.

---

## 📦 PHASE 0 — Setup & fondations _(préalable à toute phase MVP)_

### 0.1 Initialisation du projet Next.js

| ID    | Tâche                                                                                                                                                                                           | Est. | Dép.  |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ----- |
| 0.1.1 | `npx create-next-app@latest` avec TypeScript, Tailwind, App Router, ESLint, src/ dir                                                                                                            | XS   | —     |
| 0.1.2 | Initialiser Git + premier commit                                                                                                                                                                | XS   | 0.1.1 |
| 0.1.3 | Configurer ESLint + Prettier (règles strictes, format on save)                                                                                                                                  | XS   | 0.1.1 |
| 0.1.4 | Initialiser shadcn/ui (`npx shadcn@latest init`)                                                                                                                                                | XS   | 0.1.1 |
| 0.1.5 | Ajouter les composants shadcn de base (button, input, card, dialog, table, select, calendar, form, sonner)                                                                                      | XS   | 0.1.4 |
| 0.1.6 | Installer les dépendances métier : `@supabase/supabase-js`, `@supabase/ssr`, `@tanstack/react-query`, `zustand`, `react-hook-form`, `zod`, `decimal.js`, `date-fns`, `lucide-react`, `recharts` | XS   | 0.1.1 |
| 0.1.7 | Mettre en place la structure de dossiers (`src/lib/`, `src/domain/`, `src/hooks/`, `src/stores/`, `src/components/{ui,forms,dashboard,layout}/`)                                                | XS   | 0.1.1 |

**Critère :** `npm run dev` démarre, page d'accueil affichable avec un bouton shadcn.

### 0.2 Setup Supabase

| ID    | Tâche                                                                                        | Est. | Dép.  |
| ----- | -------------------------------------------------------------------------------------------- | ---- | ----- |
| 0.2.1 | Créer un compte Supabase + nouveau projet `gestion-business-app`                             | XS   | —     |
| 0.2.2 | Récupérer `URL` + `anon key` + les mettre dans `.env.local` (gitignoré)                      | XS   | 0.2.1 |
| 0.2.3 | Installer Supabase CLI (`npm i -g supabase`) + `supabase init`                               | S    | 0.2.1 |
| 0.2.4 | Activer **Anonymous Sign-ins** dans Authentication > Providers                               | XS   | 0.2.1 |
| 0.2.5 | Créer `src/lib/supabase/client.ts` (client browser) et `server.ts` (client SSR)              | S    | 0.2.2 |
| 0.2.6 | Créer `src/middleware.ts` : si pas de session, appelle `signInAnonymously()` automatiquement | M    | 0.2.5 |
| 0.2.7 | Tester : ouvrir l'app → vérifier qu'un user anonyme existe dans Supabase Dashboard           | XS   | 0.2.6 |

**Critère :** ouvrir le site → 1 utilisateur anonyme créé silencieusement, persisté entre rafraîchissements.

### 0.3 PWA installable

| ID    | Tâche                                                                                               | Est. | Dép.  |
| ----- | --------------------------------------------------------------------------------------------------- | ---- | ----- |
| 0.3.1 | Créer `public/manifest.json` (name, icons, theme_color, display: standalone, orientation: portrait) | S    | 0.1.1 |
| 0.3.2 | Générer les icônes PWA (192, 512, maskable) à partir d'un logo simple                               | S    | 0.3.1 |
| 0.3.3 | Lier le manifest dans `app/layout.tsx` + meta tags iOS                                              | XS   | 0.3.1 |
| 0.3.4 | Installer **Serwist** + configurer le service worker (cache assets statiques)                       | M    | 0.3.1 |
| 0.3.5 | Tester l'install : Chrome desktop "Installer l'app" + Android "Ajouter à l'écran d'accueil"         | S    | 0.3.4 |

**Critère :** sur Chrome mobile, l'app est installable et s'ouvre en plein écran sans barre URL.

### 0.4 CI/CD (GitHub + Vercel)

| ID    | Tâche                                                                          | Est. | Dép.  |
| ----- | ------------------------------------------------------------------------------ | ---- | ----- |
| 0.4.1 | Créer le repo GitHub `gestion-business-app` + push initial                     | XS   | 0.1.2 |
| 0.4.2 | Connecter le repo à Vercel + configurer les variables d'env (Supabase URL/key) | XS   | 0.4.1 |
| 0.4.3 | Workflow GitHub Actions : `lint` + `typecheck` + `test` sur chaque PR          | S    | 0.4.1 |
| 0.4.4 | Vérifier le **preview deployment** automatique Vercel sur une PR               | XS   | 0.4.2 |

**Critère :** push sur `main` → URL publique mise à jour automatiquement.

### 0.5 Design system minimal

| ID    | Tâche                                                                                                              | Est. | Dép.  |
| ----- | ------------------------------------------------------------------------------------------------------------------ | ---- | ----- |
| 0.5.1 | Définir palette dans `globals.css` (variables CSS shadcn) — primaire, accent, destructive, warning, success        | S    | 0.1.4 |
| 0.5.2 | Créer composants métier : `MoneyDisplay`, `MoneyInput`, `CurrencyBadge`, `StatusBadge`, `EmptyState`, `ErrorState` | M    | 0.5.1 |
| 0.5.3 | Layout responsive : `<AppShell>` avec sidebar desktop + bottom nav mobile                                          | M    | 0.1.5 |
| 0.5.4 | Page de démo composants (route `/dev/ui`, retirée en prod)                                                         | S    | 0.5.2 |

**Critère :** page démo affiche tous les composants en versions desktop + mobile.

---

## 🚀 PHASE 1 — MVP : Dashboard + Prêts/Dettes + Transactions

> Objectif : utilisateur peut **enregistrer un prêt accordé/reçu**, **saisir un remboursement**, **voir son journal de transactions** et **un dashboard de synthèse**. Auth anonyme transparente.

### 1.1 Schéma Postgres + migrations

| ID    | Tâche                                                                                                                       | Est. | Dép.         |
| ----- | --------------------------------------------------------------------------------------------------------------------------- | ---- | ------------ |
| 1.1.1 | Migration : table `currencies` + seed (XOF taux 1, USD taux 600)                                                            | XS   | 0.2          |
| 1.1.2 | Migration : table `persons` avec `owner_id`, rôles, timestamps, `deleted_at`                                                | S    | 1.1.1        |
| 1.1.3 | Migration : table `loans` (id, person_id, direction, principal, devise, taux, dates, statut)                                | S    | 1.1.1, 1.1.2 |
| 1.1.4 | Migration : table `transactions` (kind, amount, currency, exchange*rate_snapshot, occurred_at, person_id, linked_entity*\*) | S    | 1.1.1, 1.1.2 |
| 1.1.5 | Migration : table `change_log` (entity_type, entity_id, action, diff jsonb)                                                 | XS   | —            |
| 1.1.6 | RLS policies : `owner_id = auth.uid()` sur toutes les tables                                                                | S    | 1.1.2-1.1.5  |
| 1.1.7 | Vue `loan_remaining` (reste à payer dynamique)                                                                              | S    | 1.1.3, 1.1.4 |
| 1.1.8 | Trigger générique d'audit → `change_log` (INSERT/UPDATE/DELETE)                                                             | M    | 1.1.5        |
| 1.1.9 | Générer les types TypeScript depuis le schéma (`supabase gen types`)                                                        | XS   | 1.1.6        |

**Critère :** depuis l'app, on peut créer une personne, un prêt, une transaction et lire la vue `loan_remaining`. Les données sont bien isolées par user anonyme.

### 1.2 Couche domaine (logique pure)

| ID    | Tâche                                                                                              | Est. | Dép.  |
| ----- | -------------------------------------------------------------------------------------------------- | ---- | ----- |
| 1.2.1 | Module `lib/money.ts` : type Money (amount Decimal + currency) + opérations + formatage Intl       | S    | —     |
| 1.2.2 | Module `lib/currency.ts` : conversion FCFA ↔ USD avec snapshot du taux                             | S    | 1.2.1 |
| 1.2.3 | Schémas Zod : `LoanSchema`, `PersonSchema`, `TransactionSchema` dans `domain/validators.ts`        | S    | 1.1.9 |
| 1.2.4 | Fonctions calcul : `calculateLoanRemaining(loan, repayments)`, `calculateLoanInterest(loan, asOf)` | M    | 1.2.1 |
| 1.2.5 | Tests Vitest exhaustifs sur les calculs financiers (cas FCFA sans décimales + USD avec)            | M    | 1.2.4 |

**Critère :** couverture > 90% sur `domain/` et `lib/money.ts`. Aucun calcul financier sur `number`.

### 1.3 Hooks data (TanStack Query + Supabase)

| ID    | Tâche                                                                                 | Est. | Dép.       |
| ----- | ------------------------------------------------------------------------------------- | ---- | ---------- |
| 1.3.1 | Setup `<QueryClientProvider>` dans `app/layout.tsx`                                   | XS   | 0.1        |
| 1.3.2 | Hook `usePersons()` : list + filtres (role) + recherche                               | S    | 1.1, 1.3.1 |
| 1.3.3 | Hook `useCreatePerson()` / `useUpdatePerson()` / `useDeletePerson()` (soft delete)    | S    | 1.3.2      |
| 1.3.4 | Hooks équivalents pour `loans` et `transactions`                                      | M    | 1.3.3      |
| 1.3.5 | Invalidation cache croisée (créer transaction → invalider loan_remaining + dashboard) | S    | 1.3.4      |

**Critère :** une action UI déclenche update Supabase + re-render des écrans concernés sans rafraîchissement manuel.

### 1.4 Feature : Persons (annuaire)

| ID    | Tâche                                                                                  | Est. | Dép.  |
| ----- | -------------------------------------------------------------------------------------- | ---- | ----- |
| 1.4.1 | Page `/persons` : liste responsive (table desktop, cards mobile) + recherche + filtres | M    | 1.3   |
| 1.4.2 | Page `/persons/new` et `/persons/[id]/edit` : formulaire react-hook-form + zod         | M    | 1.4.1 |
| 1.4.3 | Page `/persons/[id]` : détail + onglets (prêts liés, transactions liées)               | M    | 1.4.1 |
| 1.4.4 | Suppression avec confirmation (Dialog shadcn) → soft delete                            | S    | 1.4.1 |

**Critère :** CRUD complet personnes, responsive desktop + mobile.

### 1.5 Feature : Prêts & dettes

| ID    | Tâche                                                                                                      | Est. | Dép.  |
| ----- | ---------------------------------------------------------------------------------------------------------- | ---- | ----- |
| 1.5.1 | Page `/loans` : onglets « Accordés » / « Reçus », filtres statut, recherche                                | S    | 1.4   |
| 1.5.2 | Page `/loans/new` : formulaire (personne, direction, montant, devise, dates, taux)                         | M    | 1.5.1 |
| 1.5.3 | Page `/loans/[id]` : détail + reste à payer + historique remboursements + bouton « Ajouter remboursement » | M    | 1.5.2 |
| 1.5.4 | Dialog « Saisir remboursement » : montant, date, devise, notes → crée transaction + recalcul statut        | M    | 1.5.3 |
| 1.5.5 | Affichage des intérêts calculés (si taux défini)                                                           | S    | 1.2.4 |
| 1.5.6 | Badges visuels : en cours / remboursé / en retard / partiel                                                | XS   | 1.5.3 |
| 1.5.7 | Édition + suppression d'un prêt (soft delete + confirmation)                                               | S    | 1.5.3 |

**Critère :** flux complet : créer prêt 100 000 FCFA → remboursement 30 000 → reste = 70 000 affiché partout, cohérent dans le journal.

### 1.6 Feature : Transactions (journal central)

| ID    | Tâche                                                                                     | Est. | Dép.  |
| ----- | ----------------------------------------------------------------------------------------- | ---- | ----- |
| 1.6.1 | Page `/transactions` : liste groupée par jour, pagination ou scroll infini                | S    | 1.3   |
| 1.6.2 | Filtres avancés : type, période, personne, projet, montant min/max                        | M    | 1.6.1 |
| 1.6.3 | Recherche full-text (notes, nom personne) — Postgres `to_tsvector` ou simple ILIKE au MVP | S    | 1.6.1 |
| 1.6.4 | Page `/transactions/[id]` : détail + lien vers entité liée                                | S    | 1.6.1 |
| 1.6.5 | Création manuelle d'une transaction (cas frais, ajustement)                               | S    | 1.6.1 |
| 1.6.6 | Affichage par devise + équivalent FCFA en gris dessous                                    | S    | 1.2.2 |

**Critère :** toutes les opérations effectuées dans la feature Prêts apparaissent dans le journal avec le bon `kind`.

### 1.7 Feature : Dashboard

| ID    | Tâche                                                                                   | Est. | Dép.     |
| ----- | --------------------------------------------------------------------------------------- | ---- | -------- |
| 1.7.1 | Cards synthèse en FCFA : Total créances · Total dettes · Cash immobilisé · Cash attendu | M    | 1.5, 1.6 |
| 1.7.2 | Section « Échéances proches » (7 jours à venir)                                         | S    | 1.5      |
| 1.7.3 | Section « Retards » (échéances dépassées non remboursées)                               | S    | 1.5      |
| 1.7.4 | Indicateur : taux de remboursement global                                               | S    | 1.2.4    |
| 1.7.5 | Graphique : évolution mensuelle (créances/dettes/net) avec `recharts`                   | M    | 1.6      |
| 1.7.6 | Pull-to-refresh sur mobile (TanStack Query refetch)                                     | XS   | 1.3      |

**Critère :** dashboard charge en < 1s sur connexion 3G simulée, valeurs cohérentes avec les données.

### 1.8 Settings + polish MVP

| ID    | Tâche                                                                                    | Est. | Dép.   |
| ----- | ---------------------------------------------------------------------------------------- | ---- | ------ |
| 1.8.1 | Page `/settings` : taux USD → FCFA modifiable (persisté en base, propre à l'utilisateur) | S    | 1.1    |
| 1.8.2 | Page `/settings` : reset DB (utile pour démos) — confirmation forte                      | XS   | 1.1    |
| 1.8.3 | i18n FR par défaut (next-intl si besoin, sinon simple constantes)                        | S    | toutes |
| 1.8.4 | Format nombres : FCFA `1 500 000 FCFA`, USD `$1,500.00` (Intl.NumberFormat)              | S    | 1.2.1  |
| 1.8.5 | Gestion erreurs : toasts (`sonner`) sur erreurs Supabase, états vides cohérents          | S    | toutes |
| 1.8.6 | Tests E2E Playwright des 2 flux critiques : créer prêt, enregistrer remboursement        | M    | toutes |
| 1.8.7 | Test sur navigateur mobile réel (Android Chrome + iOS Safari) + install PWA              | S    | 0.3    |
| 1.8.8 | Déploiement Vercel production + URL partageable                                          | XS   | 0.4    |

**Critère final MVP :** URL publique installable comme PWA sur mobile, dashboard et CRUD prêts/dettes/transactions fonctionnels de bout en bout.

---

## 🏠 PHASE 2 — Foncier + Dossiers techniques

### 2.1 Schéma foncier

| ID    | Tâche                                                               | Est. | Dép.  |
| ----- | ------------------------------------------------------------------- | ---- | ----- |
| 2.1.1 | Migrations : `land_projects`, `land_payment_schedule` + RLS + audit | M    | 1.1   |
| 2.1.2 | Vue `land_project_remaining` (reste à payer dynamique)              | S    | 2.1.1 |

### 2.2 Feature : Foncier

| ID    | Tâche                                                                             | Est. | Dép.  |
| ----- | --------------------------------------------------------------------------------- | ---- | ----- |
| 2.2.1 | Page liste projets fonciers (filtres statut, client)                              | S    | 2.1   |
| 2.2.2 | Page création projet (client, localisation, surface, prix/m², total auto-calculé) | M    | 2.2.1 |
| 2.2.3 | Page détail projet : infos, paiements, échéancier, restes                         | L    | 2.2.2 |
| 2.2.4 | Modal génération échéancier (nb tranches, fréquence, premier paiement)            | M    | 2.2.3 |
| 2.2.5 | Saisie paiement foncier → crée transaction liée                                   | S    | 2.2.3 |
| 2.2.6 | Ajustement de surface (cas terrain remesuré) → recalcul total                     | M    | 2.2.3 |
| 2.2.7 | Types : vente directe / échelonnée / réservation (statut différent)               | S    | 2.2.3 |

### 2.3 Schéma dossiers techniques

| ID    | Tâche                                                          | Est. | Dép.  |
| ----- | -------------------------------------------------------------- | ---- | ----- |
| 2.3.1 | Migrations : `admin_files`, `documents` + RLS                  | M    | 1.1   |
| 2.3.2 | Setup Supabase Storage : bucket privé `documents` + policies   | S    | 0.2   |
| 2.3.3 | Wrapper `lib/storage.ts` pour upload/download/delete documents | S    | 2.3.2 |

### 2.4 Feature : Dossiers techniques

| ID    | Tâche                                                                                                           | Est. | Dép.  |
| ----- | --------------------------------------------------------------------------------------------------------------- | ---- | ----- |
| 2.4.1 | Page liste dossiers (filtres : type, statut, géomètre)                                                          | S    | 2.3   |
| 2.4.2 | Page création dossier (bénéficiaire, type, surface, géomètre, coûts)                                            | M    | 2.4.1 |
| 2.4.3 | Page détail dossier : infos, statut workflow, paiements, pièces jointes                                         | L    | 2.4.2 |
| 2.4.4 | Upload de documents (drag & drop + bouton, support photo mobile via input file accept)                          | M    | 2.3.3 |
| 2.4.5 | Sous-feature « Géomètres » : fiche géomètre (= personne avec rôle `surveyor`) + agrégation dossiers + paiements | M    | 2.4.3 |
| 2.4.6 | Workflow statuts : en cours / attente docs / attente paiement / finalisé / bloqué                               | S    | 2.4.3 |

### 2.5 Dashboard étendu phase 2

| ID    | Tâche                                                       | Est. | Dép. |
| ----- | ----------------------------------------------------------- | ---- | ---- |
| 2.5.1 | Cards : projets fonciers actifs, montant immobilisé foncier | S    | 2.2  |
| 2.5.2 | Section « Dossiers bloqués »                                | S    | 2.4  |

---

## 📈 PHASE 3 — Investissements + Alertes + Exports

### 3.1 Schéma investissements

| ID    | Tâche                                   | Est. | Dép.  |
| ----- | --------------------------------------- | ---- | ----- |
| 3.1.1 | Migration : `investments` + RLS + audit | S    | 1.1   |
| 3.1.2 | Fonctions de calcul gains/échéances     | M    | 3.1.1 |

### 3.2 Feature : Investissements

| ID    | Tâche                                                            | Est. | Dép.  |
| ----- | ---------------------------------------------------------------- | ---- | ----- |
| 3.2.1 | Page liste investissements (filtres type, statut, investisseur)  | S    | 3.1   |
| 3.2.2 | Page création (type, investisseur, montant, taux, échéance)      | M    | 3.2.1 |
| 3.2.3 | Page détail : gains estimés, échéances, distributions effectuées | L    | 3.2.2 |
| 3.2.4 | Saisie distribution → transaction liée                           | S    | 3.2.3 |
| 3.2.5 | Cas spécifique « Tontine » (cycle, rang, montant par tour)       | M    | 3.2.3 |

### 3.3 Alertes

| ID    | Tâche                                                                                        | Est. | Dép.          |
| ----- | -------------------------------------------------------------------------------------------- | ---- | ------------- |
| 3.3.1 | Vues SQL : `upcoming_due_dates`, `overdue_items`, `blocked_files`                            | M    | 1.5, 2.2, 2.4 |
| 3.3.2 | Page `/alerts` centralisée avec actions rapides                                              | M    | 3.3.1         |
| 3.3.3 | Badge avec compteur d'alertes dans le header                                                 | S    | 3.3.1         |
| 3.3.4 | Préférences alertes (paramètres : seuils)                                                    | S    | 3.3.2         |
| 3.3.5 | (Optionnel) Web Push notifications (Supabase Edge Functions + VAPID) — Android only au début | L    | 3.3.2         |

### 3.4 Exports & rapports

| ID    | Tâche                                                            | Est. | Dép.     |
| ----- | ---------------------------------------------------------------- | ---- | -------- |
| 3.4.1 | Export PDF fiche prêt (React PDF ou Puppeteer via Edge Function) | M    | 1.5      |
| 3.4.2 | Export PDF projet foncier                                        | S    | 2.2      |
| 3.4.3 | Export Excel journal transactions (`exceljs`)                    | M    | 1.6      |
| 3.4.4 | Rapport financier mensuel auto-généré (PDF)                      | L    | 1.7, 2.5 |
| 3.4.5 | Partage natif (Web Share API : email, WhatsApp, etc.)            | S    | 3.4.1    |

### 3.5 Recherche globale

| ID    | Tâche                                                                                   | Est. | Dép.   |
| ----- | --------------------------------------------------------------------------------------- | ---- | ------ |
| 3.5.1 | Index Postgres `tsvector` + triggers de maintenance                                     | M    | toutes |
| 3.5.2 | Composant `<CommandPalette>` (shadcn `command`) déclenché par Ctrl+K / bouton recherche | M    | 3.5.1  |
| 3.5.3 | Résultats catégorisés (personnes / prêts / projets / transactions)                      | S    | 3.5.2  |

### 3.6 Multi-devises avancé

| ID    | Tâche                                                                                  | Est. | Dép.  |
| ----- | -------------------------------------------------------------------------------------- | ---- | ----- |
| 3.6.1 | Historique des taux (table `exchange_rates_history`)                                   | M    | 1.2.2 |
| 3.6.2 | (Optionnel) Sync auto via API externe (exchangerate-api) via Edge Function quotidienne | M    | 3.6.1 |

### 3.7 Compensation de dettes

| ID    | Tâche                                                          | Est. | Dép.  |
| ----- | -------------------------------------------------------------- | ---- | ----- |
| 3.7.1 | Fonction `offsetDebts(personId)` : crée 2 transactions miroirs | M    | 1.5   |
| 3.7.2 | UI sur fiche personne : « Compenser positions »                | S    | 3.7.1 |

---

## 🔐 PHASE V1 — Auth visible + Multi-device

> Activée quand le MVP est validé en usage réel. Permet de "réclamer" le compte anonyme pour l'utiliser sur plusieurs appareils.

| ID   | Tâche                                                                                                      | Est. |
| ---- | ---------------------------------------------------------------------------------------------------------- | ---- |
| V1.1 | Écran « Sauvegarder mon compte » : ajout email + password sur le user anonyme (`supabase.auth.updateUser`) | M    |
| V1.2 | Écran login email + OTP pour se reconnecter sur un autre appareil                                          | M    |
| V1.3 | Bannière persistante : « Vous êtes en mode invité, sauvegardez votre compte »                              | S    |
| V1.4 | Politique de purge des comptes anonymes inactifs (Edge Function nightly)                                   | S    |
| V1.5 | Multi-user / partage de données (RBAC, invitations)                                                        | XL   |

---

## 🎁 PHASE 4 — Hardening & nice-to-have

| ID  | Tâche                                                 | Est. |
| --- | ----------------------------------------------------- | ---- |
| 4.1 | Audit log visible dans l'app                          | M    |
| 4.2 | Corbeille (restauration soft delete)                  | M    |
| 4.3 | Export complet du compte (RGPD)                       | M    |
| 4.4 | Mode sombre                                           | S    |
| 4.5 | Internationalisation EN                               | S    |
| 4.6 | Crash reporting (Sentry)                              | S    |
| 4.7 | Analytics anonymisée (PostHog)                        | S    |
| 4.8 | Lighthouse > 90 sur toutes les pages                  | M    |
| 4.9 | Optimisation bundle (analyse `@next/bundle-analyzer`) | S    |

---

## 📊 Récapitulatif

| Phase       | Contenu                                                 | Estimation   | Livrable                              |
| ----------- | ------------------------------------------------------- | ------------ | ------------------------------------- |
| **0**       | Setup Next.js + Supabase + PWA + Vercel + design system | ~4-6 j       | App déployée, vide mais fonctionnelle |
| **1 (MVP)** | Persons · Prêts/Dettes · Transactions · Dashboard       | **~15-22 j** | App utilisable et démontrable         |
| **2**       | Foncier · Dossiers techniques                           | ~20-25 j     | Module foncier complet                |
| **3**       | Investissements · Alertes · Exports · Recherche         | ~25-30 j     | App complète                          |
| **V1**      | Auth visible + Multi-device                             | ~5-7 j       | Comptes pérennes, multi-device        |
| **4**       | Hardening                                               | ~10-15 j     | Production-grade                      |

**Total MVP (Phase 0 + 1) :** ~**19-28 jours-homme** (1 développeur full-time).

**Gain vs version Flutter native :** ~10-15 j sur le MVP (pas d'install lourde, pas de signature APK, pas de double cible).

---

## 🎯 Définition de « MVP livré »

- ✅ URL publique HTTPS déployée sur Vercel
- ✅ App installable comme PWA sur Android & iOS
- ✅ Auth anonyme silencieuse fonctionnelle
- ✅ CRUD complet personnes / prêts / transactions
- ✅ Calculs financiers (reste, intérêts) corrects et testés (couverture > 80% `domain/`)
- ✅ Dashboard avec 4 indicateurs principaux en FCFA
- ✅ Multi-devises FCFA + USD avec taux configurable
- ✅ Responsive desktop + mobile
- ✅ Tests E2E des flux critiques verts
- ✅ Lighthouse mobile > 80
