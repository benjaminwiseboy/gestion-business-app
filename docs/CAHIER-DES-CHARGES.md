# 📄 Cahier des charges

> Application mobile de gestion des investissements, dettes, créances et foncier

## 1. 🎯 Objectif

Centraliser et structurer la gestion de :

- 💸 **Prêts et dettes** (personnels et professionnels)
- 🏠 **Opérations foncières** (achat/vente de terrains)
- 📊 **Investissements et participations** (tontines, capital, profit sharing)
- 📁 **Suivi administratif** des dossiers techniques et titres fonciers
- 🔁 **Suivi des transactions** et historiques financiers

**But principal :** offrir une vision globale, en temps réel, de la situation financière.

## 2. 👤 Utilisateurs

- Utilisateur principal (propriétaire du système)
- Partenaires financiers (indirectement via données)
- Géomètres / intermédiaires (dossiers fonciers)
- Investisseurs / débiteurs / créanciers

## 3. 🧱 Modules

1. 📊 Dashboard global
2. 💸 Prêts & dettes
3. 🏠 Foncier (transactions immobilières)
4. 📁 Dossiers techniques & administratifs
5. 📈 Investissements & participations
6. 🔁 Transactions (journal central)

## 4. 📊 Module 1 — Dashboard global

**Objectif :** vue instantanée de la situation financière globale.

- 💰 Synthèse financière : total créances / dettes / cash immobilisé / cash attendu
- 📅 Flux à venir : paiements attendus, échéances proches, retards
- ⚠️ Alertes : retards, dossiers bloqués, paiements partiels, échéances dépassées
- 📊 Indicateurs : taux de remboursement, rentabilité, exposition totale

## 5. 💸 Module 2 — Prêts & dettes

### 5.1 Prêts accordés

- Nom, montant, devise, date, taux d'intérêt (optionnel), échéance, statut
- Remboursements partiels, calcul auto du reste, historique, intérêts

### 5.2 Dettes utilisateur

- Créancier, montant, conditions, échéance, statut

### 5.3 Avancé

- Compensation de dettes (offset)
- Conversion de devises
- Modification historisée

## 6. 🏠 Module 3 — Foncier (central)

### 6.1 Fiche projet

- Client/acquéreur, localisation, surface m², prix m², total, payé, reste, statut

### 6.2 Paiements

- Tranches multiples, historique, échéancier auto

### 6.3 Calculs auto

- Total dû, reste, retards, gains potentiels

### 6.4 Types

- Vente directe, paiement échelonné, réservations, ajustements de surface

## 7. 📁 Module 4 — Dossiers techniques & administratifs

### 7.1 Types

- Dossiers techniques, titres fonciers, rattachements admin, bornage, juridique

### 7.2 Données

- Bénéficiaire, surface, géomètre, montants, reste, statut

### 7.3 Suivi géomètres

- Nom, contacts, dossiers associés, paiements, retards

### 7.4 Statuts

- En cours, en attente docs, en attente paiement, finalisé

## 8. 📈 Module 5 — Investissements & participations

### 8.1 Types

- Tontine, capital tiers, projets fonciers à rendement, prêts profit sharing

### 8.2 Données

- Investisseur, montant, date, taux, échéance, gains attendus

### 8.3 Calculs

- Profit total estimé, gain par investisseur, échéances distribution

## 9. 🔁 Module 6 — Transactions (cœur)

### 9.1 Types

- Prêt, remboursement, paiement foncier, investissement, frais, ajustement

### 9.2 Données

- Type, montant, devise, date, personne, projet (optionnel), commentaire

### 9.3 Fonctionnalités

- Historique complet, filtres avancés, recherche, audit

## 10. ⚙️ Fonctionnalités globales

- 🔍 Recherche intelligente (nom, projet, montant)
- 🔔 Alertes (retards, échéances, dossiers bloqués)
- 💱 Multi-devises (FCFA, USD, taux configurable)
- 🔐 Sécurité (auth, historique modifications, logs)
- 📤 Export PDF / Excel / rapports mensuels

## 11. 📱 Écrans

Dashboard · Créances · Dettes · Fiches clients · Projets fonciers · Dossiers techniques · Investissements · Transactions · Paramètres

## 12. 🧠 Règles métier

1. Une transaction est **toujours** liée à une entité (personne ou projet)
2. Tout montant a une **devise**
3. Tout prêt doit pouvoir être **remboursé partiellement**
4. Les projets fonciers ont un **reste à payer dynamique**
5. Toute modification est **historisée**

## 13. 🚀 MVP — Priorités

- **Phase 1 :** Dashboard · Prêts & dettes · Transactions
- **Phase 2 :** Foncier · Dossiers techniques
- **Phase 3 :** Investissements · Alertes avancées
