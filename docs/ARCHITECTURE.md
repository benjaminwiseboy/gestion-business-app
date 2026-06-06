# 🏗️ Architecture Technique

> Document de référence technique pour l'application **gestion-business-app**

## 1. Contexte & contraintes

| Contrainte       | Choix retenu                                                                                 | Impact                                                            |
| ---------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Forme**        | **Web app (PWA)** installable sur mobile                                                     | Une seule base de code, accessible partout via URL                |
| **Plateformes**  | Tous navigateurs modernes · Installable sur Android/iOS via "Ajouter à l'écran d'accueil"    | Pas de Play Store, pas de signature Apple                         |
| **Connectivité** | Online-first avec cache local (PWA)                                                          | App reste consultable hors-ligne sur les données déjà chargées    |
| **Auth**         | **MVP** : auth anonyme Supabase (transparente, pas d'écran) · **V1** : email + OTP optionnel | Zéro friction utilisateur, données quand même persistées en cloud |
| **Utilisateurs** | 1 (MVP) → extensible                                                                         | RLS sur user_id, multi-user en ajoutant un login                  |
| **Données**      | Fortement relationnelles                                                                     | PostgreSQL via Supabase                                           |
| **Devises**      | FCFA (pivot) + USD                                                                           | Tous les totaux affichés en FCFA                                  |
| **Audit**        | Historisation obligatoire                                                                    | Triggers PostgreSQL → table `change_log`                          |
| **Documents**    | Titres fonciers, dossiers (Phase 2)                                                          | Supabase Storage                                                  |
| **Distribution** | URL publique (Vercel)                                                                        | Aucun store, mise à jour instantanée                              |

## 2. Stack technique

### 🌐 Frontend — **Next.js 15** (App Router) + TypeScript

**Pourquoi Next.js :**

- **PWA installable** sur mobile (icône sur l'écran d'accueil → ressemble à une app native)
- **App Router** : architecture moderne, server components → moins de JS envoyé au client
- **SSR + streaming** : premier rendu rapide même sur mobile bas/moyen de gamme (cas Afrique)
- **Server actions** : appels backend sans API REST manuelle
- **Vercel** : déploiement gratuit, CDN global, URL HTTPS instantanée
- Écosystème React massif → composants prêts pour tous les besoins

**Pourquoi pas SPA pure (Vite + React) :** plus rapide à coder, mais SEO moins bon et premier rendu plus lent sur mobile. Next.js coche les deux cases.

**Pourquoi pas SvelteKit :** excellent aussi, mais écosystème moins riche pour les composants (formulaires, tables, charts). Next.js minimise les surprises.

### 🎨 UI — **Tailwind CSS 4** + **shadcn/ui**

| Couche     | Outil                      | Rôle                                                                                                      |
| ---------- | -------------------------- | --------------------------------------------------------------------------------------------------------- |
| Styling    | **Tailwind CSS 4**         | Utility-first, responsive natif                                                                           |
| Composants | **shadcn/ui**              | Composants copiés dans le projet (pas de dépendance), accessibles (Radix UI sous le capot), customisables |
| Icônes     | **lucide-react**           | Cohérent avec shadcn/ui                                                                                   |
| Charts     | **recharts** ou **tremor** | Dashboards, indicateurs                                                                                   |

**Pourquoi shadcn/ui :** code copié dans le repo (`components/ui/`) = pas de boîte noire, on peut tout personnaliser. Construit sur Radix UI = accessible (a11y) par défaut.

### ☁️ Backend — **Supabase** (PostgreSQL managed)

| Service Supabase       | Usage                                                        |
| ---------------------- | ------------------------------------------------------------ |
| **Postgres**           | Schéma relationnel complet (clés étrangères, triggers, vues) |
| **Auth**               | Anonyme au MVP, email/OTP en V1                              |
| **Storage**            | Documents fonciers, scans (Phase 2)                          |
| **Row Level Security** | Sécurité au niveau ligne, multi-user-ready                   |
| **Edge Functions**     | (Optionnel) calculs serveur lourds, génération PDF           |

**Auth anonyme au MVP** — le détail :

- Au premier chargement, l'app appelle `supabase.auth.signInAnonymously()`
- Le token est persisté en `localStorage` par le SDK Supabase
- L'utilisateur ne voit **aucun** écran de login → ouverture directe sur le dashboard
- Toutes les données sont liées à `auth.uid()` via RLS → isolation propre
- **V1** : on ajoutera un écran "Sauvegarder mon compte" → conversion en compte email/password sans perdre les données (`updateUser` Supabase). Voir [Supabase Anonymous Sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous).

### 🔌 État, données, formulaires

| Couche                | Package                                       | Rôle                                            |
| --------------------- | --------------------------------------------- | ----------------------------------------------- |
| Client Supabase       | **@supabase/supabase-js** + **@supabase/ssr** | SDK officiel, support SSR                       |
| Data fetching / cache | **TanStack Query v5**                         | Cache mémoire, revalidation, optimistic updates |
| State client          | **Zustand**                                   | Filtres UI, paramètres locaux (léger, simple)   |
| Formulaires           | **react-hook-form** + **zod**                 | Validation type-safe                            |
| Calculs financiers    | **decimal.js** ou **dinero.js**               | Jamais de `number` pour l'argent                |
| Dates                 | **date-fns**                                  | Léger, tree-shakable, support FR                |
| Format devises        | **Intl.NumberFormat** (natif)                 | FCFA sans décimales, USD avec                   |
| PWA                   | **Serwist** (successeur de next-pwa)          | Service worker, manifest, install prompt        |

### 🛠️ Outils dev

| Outil                     | Rôle                                        |
| ------------------------- | ------------------------------------------- |
| **TypeScript**            | Strict mode partout                         |
| **ESLint** + **Prettier** | Lint + format                               |
| **Vitest**                | Tests unitaires (calculs financiers)        |
| **Playwright**            | Tests E2E (flux critiques)                  |
| **Supabase CLI**          | Migrations versionnées, dev local optionnel |
| **Vercel CLI**            | Déploiement, preview branches               |

## 3. Architecture applicative

```
gestion-business-app/
├── src/
│   ├── app/                          ← Next.js App Router
│   │   ├── (app)/                    ← Routes principales (avec layout app)
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── persons/
│   │   │   │   ├── page.tsx          ← Liste
│   │   │   │   └── [id]/page.tsx     ← Détail
│   │   │   ├── loans/
│   │   │   ├── transactions/
│   │   │   └── settings/
│   │   ├── api/                      ← Routes API si besoin
│   │   ├── layout.tsx                ← Root layout (PWA manifest, providers)
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                       ← shadcn/ui (copié)
│   │   ├── forms/                    ← Composants formulaires métier
│   │   ├── dashboard/                ← Cards, charts dashboard
│   │   └── layout/                   ← Sidebar, header, mobile nav
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             ← Client browser
│   │   │   ├── server.ts             ← Client server (SSR)
│   │   │   └── types.ts              ← Types générés depuis le schéma
│   │   ├── money.ts                  ← Value object Money + conversion
│   │   ├── currency.ts               ← Conversion FCFA ↔ USD
│   │   └── utils.ts
│   ├── domain/                       ← Logique métier pure
│   │   ├── loans.ts                  ← Calculs intérêts, reste à payer
│   │   ├── transactions.ts
│   │   └── validators.ts             ← Schémas Zod partagés
│   ├── hooks/                        ← Hooks Riverpod-like (TanStack Query)
│   │   ├── use-loans.ts
│   │   ├── use-transactions.ts
│   │   └── use-persons.ts
│   ├── stores/                       ← Zustand (UI state)
│   │   └── filters-store.ts
│   └── middleware.ts                 ← Auth anonyme automatique
├── supabase/
│   ├── migrations/                   ← Migrations SQL versionnées
│   └── seed.sql                      ← Devises FCFA, USD
├── public/
│   ├── manifest.json                 ← PWA manifest
│   └── icons/                        ← Icônes PWA (192, 512, etc.)
├── tests/
│   ├── unit/                         ← Vitest
│   └── e2e/                          ← Playwright
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
└── components.json                   ← Config shadcn/ui
```

## 4. Modèle de données (PostgreSQL via Supabase)

### Entités principales

```sql
-- Personne (créancier, débiteur, client, investisseur, géomètre…)
create table persons (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  roles text[] not null default '{}',  -- {borrower, lender, client, investor, surveyor}
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table currencies (
  code text primary key,                 -- 'XOF', 'USD'
  symbol text not null,
  decimals int not null default 0,       -- XOF: 0, USD: 2
  exchange_rate_to_xof numeric(20, 6) not null default 1
);
-- Seed initial: XOF (taux 1), USD (taux 600 modifiable)

-- Prêts (accordés ou reçus)
create table loans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  person_id uuid not null references persons(id) on delete restrict,
  direction text not null check (direction in ('lent', 'borrowed')),
  principal_amount numeric(20, 6) not null,
  principal_currency text not null references currencies(code),
  interest_rate numeric(8, 4),           -- nullable
  interest_type text check (interest_type in ('simple', 'compound', 'none')),
  issue_date date not null,
  due_date date,
  status text not null default 'active', -- active | repaid | overdue | partial
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Projet foncier (Phase 2)
create table land_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  client_person_id uuid references persons(id),
  location text,
  surface_m2 numeric(12, 2),
  price_per_m2_amount numeric(20, 6),
  price_per_m2_currency text references currencies(code),
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Dossier administratif (Phase 2)
create table admin_files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  beneficiary_person_id uuid references persons(id),
  surveyor_person_id uuid references persons(id),
  type text not null,                    -- technical | title | survey | legal | linking
  surface_m2 numeric(12, 2),
  total_cost_amount numeric(20, 6),
  total_cost_currency text references currencies(code),
  paid_amount numeric(20, 6) default 0,
  status text not null default 'processing',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Investissements (Phase 3)
create table investments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  investor_person_id uuid references persons(id),
  type text not null,                    -- tontine | capital | land_yield | profit_sharing
  amount_invested numeric(20, 6) not null,
  amount_currency text not null references currencies(code),
  start_date date not null,
  expected_end_date date,
  return_rate numeric(8, 4),
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Journal central des transactions
create table transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  kind text not null,                    -- loan_disbursement | repayment | land_payment | …
  amount numeric(20, 6) not null,
  currency text not null references currencies(code),
  exchange_rate_snapshot numeric(20, 6) not null,  -- taux figé au moment de la transaction
  occurred_at date not null,
  person_id uuid references persons(id),
  linked_entity_type text,               -- 'loan' | 'land_project' | 'admin_file' | 'investment'
  linked_entity_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (person_id is not null or linked_entity_id is not null)
);

-- Audit
create table change_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  entity_type text not null,
  entity_id uuid not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  diff jsonb,
  changed_at timestamptz not null default now()
);
```

### Vues calculées

```sql
create view loan_remaining as
select
  l.id as loan_id,
  l.principal_amount - coalesce(sum(t.amount), 0) as remaining_amount,
  l.principal_currency as currency
from loans l
left join transactions t
  on t.linked_entity_id = l.id
  and t.linked_entity_type = 'loan'
  and t.kind = 'repayment'
  and t.deleted_at is null
where l.deleted_at is null
group by l.id;
```

### Row Level Security (RLS)

Sur **toutes** les tables :

```sql
alter table persons enable row level security;
create policy "owner_all" on persons
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
-- (idem pour toutes les tables)
```

### Triggers d'audit

Trigger générique qui logue chaque INSERT/UPDATE/DELETE dans `change_log` avec le diff en JSONB.

### Règles métier — implémentation

| Règle                            | Implémentation                                                             |
| -------------------------------- | -------------------------------------------------------------------------- |
| Transaction ↔ entité obligatoire | Contrainte CHECK : `person_id IS NOT NULL OR linked_entity_id IS NOT NULL` |
| Devise obligatoire               | Colonne `currency NOT NULL` partout où il y a un montant                   |
| Remboursement partiel            | Vue `loan_remaining`                                                       |
| Reste à payer foncier dynamique  | Vue calculée serveur                                                       |
| Historisation modifications      | Triggers PG → `change_log`                                                 |
| Soft delete                      | Colonne `deleted_at`, filtres dans toutes les queries                      |

## 5. Devise pivot — règles

- Toute opération est saisie dans **sa devise d'origine** (FCFA ou USD)
- Le **taux USD → FCFA** est configurable dans Paramètres (par défaut : 600, modifiable)
- Le **snapshot du taux** est sauvé sur chaque transaction (`exchange_rate_snapshot`) → l'historique ne bouge pas si on change le taux
- Tous les **totaux du dashboard** sont en FCFA
- Sur les listes, chaque montant est affiché dans sa devise d'origine, avec équivalent FCFA en plus petit dessous

## 6. PWA — installable sur mobile

**Manifest** (`public/manifest.json`) :

- `display: standalone` → l'app s'ouvre sans la barre d'URL
- Icônes 192×192, 512×512 (maskable + any)
- Theme color, background color
- Orientation : `portrait` par défaut

**Service worker** (via Serwist) :

- Cache des assets statiques (HTML, JS, CSS, fonts)
- Stratégie `NetworkFirst` pour les pages, `CacheFirst` pour les assets
- Banner d'install (Android Chrome) : "Ajouter à l'écran d'accueil"
- iOS Safari : pas de banner automatique, mais install possible via menu Partager

**Limite iOS** : pas de notifications push avant iOS 16.4 sur PWA, et capacités plus limitées qu'Android. Acceptable pour notre cas.

## 7. Tests

| Niveau     | Outil                            | Cible                                                        |
| ---------- | -------------------------------- | ------------------------------------------------------------ |
| Unitaires  | **Vitest**                       | Logique métier, calculs (intérêts, restes, conversions)      |
| Composants | **Vitest** + **Testing Library** | Composants formulaires critiques                             |
| E2E        | **Playwright**                   | Flux complets (créer prêt → rembourser → vérifier dashboard) |
| Base       | **pgTAP** ou tests intégration   | Contraintes SQL, RLS, vues                                   |

**Couverture cible MVP : 80 %+** sur la couche `domain/` (calculs financiers = zéro tolérance bug).

## 8. CI/CD

**GitHub Actions :**

- Lint + typecheck + tests unitaires sur chaque PR
- Build Next.js sur chaque PR
- (Optionnel) Tests E2E Playwright sur main

**Vercel :**

- Connecté au repo GitHub
- **Preview deployment** automatique sur chaque PR (URL unique par PR)
- **Production deployment** automatique sur push `main`
- Variables d'env (Supabase URL + anon key) configurées via dashboard Vercel
- HTTPS gratuit, CDN global

## 9. Environnements

| Env         | Branche Git      | URL                        | Supabase                      |
| ----------- | ---------------- | -------------------------- | ----------------------------- |
| **Dev**     | `main` (local)   | `http://localhost:3000`    | Projet Supabase `dev`         |
| **Preview** | PR               | `<pr>-<projet>.vercel.app` | Projet Supabase `dev` partagé |
| **Prod**    | `main` (déployé) | URL Vercel custom          | Projet Supabase `prod`        |

Pour le MVP : un seul projet Supabase suffit (gratuit, on duplique plus tard).

## 10. Décisions validées ✅

- ✅ **Web app PWA** (Next.js 15 + Tailwind + shadcn/ui)
- ✅ **Supabase** dès le MVP (Postgres + Auth anonyme + Storage à venir)
- ✅ **Auth anonyme silencieuse** — pas d'écran de login au MVP
- ✅ **FCFA pivot** — taux USD configurable, snapshoté par transaction
- ✅ **Déploiement Vercel** — URL publique, installable sur mobile
- ✅ **Test sur ordinateur** : `npm run dev` dans le navigateur

## 11. Prérequis machine (légers ✨)

- ✅ **Node.js v24** : installé
- ✅ **npm** : installé
- ✅ **Git** : installé
- ✅ **VS Code** : installé

**Aucune install supplémentaire requise pour démarrer.** Compte Supabase + compte Vercel à créer (gratuits, par navigateur).
