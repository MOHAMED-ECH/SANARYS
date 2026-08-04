# SANARYS 360

Plateforme de santé opérationnelle mutualisée pour les zones industrielles marocaines.

Le produit sert le modèle **CSPS** (Centre de Services Partagés Sanitaires) : un dispositif médical — ambulance dédiée, personnel, infirmerie, reporting — implanté au cœur d'une zone industrielle, financé collectivement par plusieurs PME voisines et exploité par SANARYS.

> **Ce dépôt correspond au Lot 1 (acquisition premium) et aux fondations du Lot 2 (portail client)** du cahier des charges. Les fonctions d'exploitation (flotte, personnel, stocks, planning), la PWA terrain et tout workflow clinique sont **volontairement hors périmètre** tant que la gouvernance médicale et juridique ne les a pas validés.

## Sommaire

- [Démarrage rapide](#démarrage-rapide)
- [Architecture](#architecture)
- [Ce qui est réel, ce qui est simulé](#ce-qui-est-réel-ce-qui-est-simulé)
- [Tests](#tests)
- [Décisions structurantes](#décisions-structurantes)
- [Avant toute mise en production](#avant-toute-mise-en-production)

## Démarrage rapide

Prérequis : Node 22 (voir `.nvmrc`) et PostgreSQL 16.

> Procédure détaillée, dépannage et import de la branche depuis un bundle git :
> [`docs/demarrage-local.md`](docs/demarrage-local.md).

```bash
npm install
cp .env.example .env
```

**Base de données** — deux options au choix :

```bash
# Option A : Docker (recommandé si disponible)
docker compose up -d postgres

# Option B : PostgreSQL installé nativement
npm run db:start      # démarre le cluster local (Debian/Ubuntu)
npm run db:create     # crée le rôle et la base sanarys_dev
```

Puis :

```bash
npm run db:migrate    # applique les migrations
npm run db:seed       # zones, jeu de règles v0, organisations et comptes de démo
```

**Lancer l'application** (deux terminaux) :

```bash
npm run dev:api   # API Fastify sur :4000 — documentation OpenAPI sur /docs
npm run dev:web   # site Next.js sur :3000
```

### Comptes de démonstration

Mot de passe : `sanarys-demo-2026`. Ces comptes n'existent que dans le jeu de données de développement.

| Email | Rôle |
|---|---|
| `demo@sanarys.ma` | Administrateur du groupement (portail client) |
| `pme-a@sanarys.ma` | Direction d'une PME membre |
| `staff@sanarys.ma` | Commercial SANARYS (console `/staff/leads`) |

## Architecture

Monorepo npm workspaces.

```
packages/
  design-tokens/   Palette, typographie, motion — source unique de l'identité visuelle
  schemas/         Contrats d'API en Zod, partagés front et back (jamais les modèles Prisma)
  db/              Schéma Prisma, migrations et jeu de données de démonstration
  config/          Configurations TypeScript, ESLint et Prettier partagées
apps/
  api/             Fastify 5 + OpenAPI : simulateur, leads, audit, auth, portail, console
  web/             Next.js 14 (App Router) : site public, simulateur, portail, console
tests/
  e2e/             Playwright : parcours de conversion, isolation, accessibilité
```

**Contrat d'abord.** `packages/schemas` est écrit avant les routes et les composants. Le front et l'API valident avec les mêmes schémas Zod : une évolution de champ casse la compilation des deux côtés plutôt que de produire une divergence silencieuse.

**Autorisation centralisée.** Aucune route ne compare un identifiant d'organisation « à la main ». Tout passe par `can(acteur, action, ressource)` et par un périmètre de scoping appliqué systématiquement dans les requêtes (`apps/api/src/modules/authz`). Refus par défaut.

**Séparation des domaines.** Les données commerciales, opérationnelles et cliniques ne sont jamais le même objet. Le schéma ne modélise **aucune donnée de santé** : ni dossier médical, ni intervention, ni dispatch.

## Ce qui est réel, ce qui est simulé

Ce tableau existe pour qu'aucune démonstration ne laisse croire à une capacité qui n'est pas là.

| Capacité | Statut |
|---|---|
| Base PostgreSQL, modèle Prisma, migrations | **Réel** |
| Moteur de règles du simulateur, versionné et reproductible | **Réel** |
| Génération PDF du récapitulatif | **Réel** (rendu serveur, archivé via l'adaptateur de stockage) |
| Capture de leads, dédoublonnage, consentement horodaté et versionné | **Réel** |
| File de leads interne pour le personnel SANARYS | **Réel** |
| Authentification, sessions révocables, verrouillage, CSRF, journal d'audit | **Réel** — mais authentification de première partie, **pas un fournisseur OIDC** |
| Isolation multi-organisations | **Réel**, couvert par des tests HTTP — **non audité par un tiers** |
| Email, SMS, WhatsApp | **Simulé** : l'intention est journalisée, rien n'est envoyé |
| Synchronisation CRM | **Simulé** : adaptateur no-op, le lead est marqué `MOCK_SYNCED` |
| Stockage de documents | **Disque local** derrière une interface de forme S3 |
| Carte des zones | **Schématique**, sans fond cartographique ni calcul d'itinéraire |
| MFA | **Absent** — le champ existe, la fonction n'est pas implémentée |
| CMS | **Absent** — le contenu éditorial vit dans `apps/web/src/content` |
| Signature électronique | **Absente** |
| Multilingue arabe et RTL | **Architecture prête** (polices, propriétés logiques), **contenu non traduit** |
| Posture de sécurité ASVS, pentest | **Non atteinte et non revendiquée** — hygiène de base uniquement |
| Formalités CNDP | **Non accomplies** — les mécanismes de privacy by design sont en place, la démarche déclarative reste à faire |
| Workflow clinique | **Absent par conception** (gate de validation médicale et juridique) |

## Tests

```bash
npm run typecheck   # vérification des types sur tous les workspaces
npm test            # tests unitaires et d'intégration de l'API (base requise)
npm run test:e2e    # Playwright — nécessite l'API et le site démarrés
```

Couverture actuelle :

- **Moteur de règles** — une assertion par branche de règle, plus la traçabilité du snapshot.
- **Scoring et dédoublonnage des leads** — dont la garantie qu'une re-soumission moins renseignée ne dégrade pas un lead qualifié.
- **Autorisation** — tests unitaires de la matrice de décision et tests HTTP réels d'isolation : une PME n'atteint aucune donnée d'une autre PME par URL, contrat, rapport ou invitation.
- **Authentification** — verrouillage après échecs, révocation de session, absence d'énumération de comptes, protection CSRF.
- **Parcours de conversion** — simulation complète en sept étapes, résultat expliqué, téléchargement PDF, demande d'audit.
- **Accessibilité** — axe-core sur dix pages publiques, parcours clavier, `prefers-reduced-motion`.

Les tests automatiques ne remplacent pas une revue manuelle au lecteur d'écran, un test de charge ni un pentest : aucun de ces trois n'a été réalisé.

## Décisions structurantes

**Rendu.** Next.js App Router plutôt qu'une SPA : les pages publiques sont l'outil d'acquisition, elles ont besoin d'un rendu statique, de métadonnées correctes et d'un sitemap.

**Le simulateur n'est pas un formulaire.** Chaque recommandation porte l'identifiant de la règle qui l'a produite, sa justification, les hypothèses retenues et la version du moteur. Un résultat calculé est figé : activer un nouveau jeu de règles ne réécrit jamais une simulation passée.

**Aucun prix ferme, jamais.** Le simulateur produit des pourcentages de répartition, pas des montants. Seule une proposition signée après audit engage les parties, et l'interface comme le PDF le disent explicitement.

**Prudence sur les preuves.** Les chiffres affichés proviennent de la brochure SANARYS et sont présentés comme des **objectifs contractuels**, jamais comme des mesures vérifiées par un tiers. Aucun témoignage, logo client ou étude de cas n'est publié : la page « cas clients » est volontairement absente tant qu'il n'existe pas de contenu vérifié et autorisé.

**Le cuivre est une signature.** Utilisé pour les accents ponctuels, jamais en aplat de section. Sa valeur a été corrigée à `#A85B26` pour atteindre 5:1 de contraste : la teinte d'origine échouait au seuil WCAG AA.

## Avant toute mise en production

Cette liste n'est pas une formalité : chaque point bloque une mise en service réelle.

1. **Valider les engagements publiés** — délais, disponibilité et méthode de mesure, avec la direction opérationnelle.
2. **Remplacer l'authentification** par un fournisseur OIDC éprouvé et **activer le MFA** pour les profils privilégiés.
3. **Accomplir les formalités CNDP** et faire valider les mentions, durées de conservation et sous-traitants par le référent données.
4. **Faire réaliser un pentest indépendant** et corriger avant ouverture ; rien de ce dépôt n'a été audité.
5. **Brancher les intégrations réelles** (email, SMS/WhatsApp, CRM) en remplaçant les adaptateurs, sans toucher aux appelants.
6. **Migrer le stockage** vers un stockage objet durable avec chiffrement, URL signées, sauvegarde et rétention.
7. **Ne jamais activer de fonction clinique** sans validation formelle de la direction médicale et du conseil juridique.

## Licence

Propriété de SANARYS. Tous droits réservés.
