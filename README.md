# gestion-business-app

**Application web (PWA installable sur mobile)** de gestion centralisée des prêts, dettes, opérations foncières, dossiers techniques, investissements et transactions financières.

## 📚 Documentation

| Document                                         | Description                        |
| ------------------------------------------------ | ---------------------------------- |
| [Cahier des charges](docs/CAHIER-DES-CHARGES.md) | Besoins fonctionnels détaillés     |
| [Architecture technique](docs/ARCHITECTURE.md)   | Stack, modèle de données, sécurité |
| [Plan de tâches](docs/TASKS.md)                  | Découpage MVP → V1 par phases      |

## 🚀 Stack

- **Framework** : Next.js 15 (App Router) + TypeScript
- **UI** : Tailwind CSS 4 + shadcn/ui + lucide-react
- **Backend** : Supabase (PostgreSQL + Auth + Storage)
- **Data** : TanStack Query · **State** : Zustand
- **Formulaires** : react-hook-form + zod
- **Charts** : recharts · **Money** : decimal.js
- **PWA** : Serwist (service worker + manifest)
- **Déploiement** : Vercel (URL HTTPS publique)

## ✅ Décisions clés MVP

|              | Choix                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Forme        | **Web app PWA** installable sur Android/iOS via "Ajouter à l'écran d'accueil" |
| Auth         | **Anonyme silencieuse** (Supabase) — pas d'écran de login au MVP              |
| Backend      | **Supabase** dès le MVP (Postgres + RLS)                                      |
| Devise pivot | **FCFA (XOF)** — USD convertie à taux configurable                            |
| Distribution | **URL publique Vercel** — installable comme PWA                               |
| Prérequis    | Node.js + npm + Git (✅ déjà installés)                                       |

## 🗺️ Phases

| Phase       | Contenu                                                 | Estimation |
| ----------- | ------------------------------------------------------- | ---------- |
| **0**       | Setup Next.js + Supabase + PWA + Vercel + design system | ~4-6 j     |
| **1 — MVP** | Persons · Prêts/Dettes · Transactions · Dashboard       | ~15-22 j   |
| 2           | Foncier · Dossiers techniques                           | ~20-25 j   |
| 3           | Investissements · Alertes · Exports · Recherche         | ~25-30 j   |
| **V1**      | Auth visible (email/OTP) · multi-device                 | ~5-7 j     |
| 4           | Hardening (audit, RGPD, dark mode)                      | ~10-15 j   |

**MVP total : ~19-28 jours-homme** (1 dev full-time).

## 🏃 Démarrage (à venir une fois Phase 0 terminée)

```bash
# Installer les dépendances
npm install

# Lancer en dev (ouvre http://localhost:3000)
npm run dev

# Build production
npm run build

# Tests
npm run test
npm run test:e2e
```

## 📐 Statut

Projet en **phase d'initialisation**. Étape suivante : démarrer la **Phase 0** (`npx create-next-app` + setup Supabase + PWA).
