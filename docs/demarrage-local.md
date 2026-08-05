# Démarrage en local

Ce document couvre deux choses : récupérer la branche de développement dans un dossier déjà cloné, puis faire tourner l'application sur votre machine.

## 1. Importer la branche depuis un bundle git

Si vous avez déjà un dossier `SANARYS` cloné (contenant la brochure, le cahier des charges et le guide d'architecture), **ne le reclonez pas**. Un bundle git est un dépôt complet dans un seul fichier : commits, messages, auteurs et signatures sont préservés à l'identique.

Placez le bundle à côté de votre dossier, par exemple sur le Bureau, puis :

> **Attention au nom du fichier.** Certains navigateurs retirent les tirets au
> téléchargement : `sanarys-premium-app.bundle` devient `sanaryspremiumapp.bundle`.
> Si `git fetch` répond *does not appear to be a git repository*, c'est presque
> toujours le nom réel du fichier qui diffère de celui de la commande. Vérifiez
> avec `dir *.bundle` (PowerShell) ou `ls *.bundle`.

```bash
cd ~/Desktop/SANARYS          # adaptez le chemin
git status                    # vérifiez que votre travail en cours est commité
```

Vérifiez d'abord que votre `main` local contient bien le commit du guide, prérequis du bundle :

```bash
git log --oneline -1 main
# doit afficher : 9a97951 doc meilleures pratiques ajouté
```

S'il ne l'affiche pas :

```bash
git checkout main
git pull origin main
```

Importez ensuite la branche :

```bash
git fetch ~/Desktop/sanarys-premium-app.bundle \
  claude/sanarys-premium-app-uefi2o:claude/sanarys-premium-app-uefi2o

git checkout claude/sanarys-premium-app-uefi2o
```

Sur Windows (PowerShell), la seule différence est le chemin :

```powershell
git fetch "$HOME\Desktop\sanarys-premium-app.bundle" `
  claude/sanarys-premium-app-uefi2o:claude/sanarys-premium-app-uefi2o
```

Vérifiez :

```bash
git log --oneline -3
ls          # vous devez voir apps/ packages/ docs/ tests/
```

Publiez enfin la branche sur GitHub :

```bash
git push -u origin claude/sanarys-premium-app-uefi2o
```

Le bundle n'est plus nécessaire une fois cette étape faite.

## 2. Prérequis

| Outil | Version | Vérification |
|---|---|---|
| Node.js | 22 (voir `.nvmrc`) | `node -v` |
| npm | 10+ | `npm -v` |
| PostgreSQL | 16 | `psql --version` |

**Installer PostgreSQL :**

- macOS : `brew install postgresql@16 && brew services start postgresql@16`
- Windows : installeur officiel sur postgresql.org, ou `winget install PostgreSQL.PostgreSQL.16`
- Linux (Debian/Ubuntu) : `sudo apt install postgresql-16`
- Alternative multiplateforme : `docker compose up -d postgres` (un `docker-compose.yml` est fourni)

## 3. Installation

```bash
npm install       # installe les dépendances et génère le client Prisma
npm run setup     # crée le .env local, sans jamais écraser un fichier existant
```

Ces deux commandes sont identiques sous PowerShell, cmd, bash et zsh.

Ouvrez `.env` et vérifiez `DATABASE_URL`. Par défaut :

```
DATABASE_URL="postgresql://sanarys:sanarys@localhost:5432/sanarys_dev"
```

Créez le rôle et la base correspondants :

```bash
# macOS / Linux
createdb sanarys_dev
psql -d sanarys_dev -c "CREATE ROLE sanarys WITH LOGIN PASSWORD 'sanarys' CREATEDB;"
psql -d sanarys_dev -c "ALTER DATABASE sanarys_dev OWNER TO sanarys;"
```

Sous Windows, ouvrez « SQL Shell (psql) » depuis le menu Démarrer, connectez-vous
en `postgres` avec le mot de passe choisi à l'installation, puis :

```sql
CREATE ROLE sanarys WITH LOGIN PASSWORD 'sanarys' CREATEDB;
CREATE DATABASE sanarys_dev OWNER sanarys;
```

Si l'installeur PostgreSQL a imposé un autre mot de passe, reportez-le dans
`DATABASE_URL`. Avec Docker, le rôle et la base sont créés automatiquement.

Appliquez ensuite le schéma et les données de démonstration :

```bash
npm run db:migrate
npm run db:seed
```

## 3 bis. En cas de doute : `npm run doctor`

```bash
npm run doctor
```

Le diagnostic répond à une seule question — qu'est-ce qui empêche l'application
de démarrer sur cette machine ? Il contrôle la version de Node, les dépendances,
la génération du client Prisma, la présence du `.env`, la joignabilité de
PostgreSQL, l'application des migrations et du seed, la cohérence des URL entre
le site et l'API, et l'occupation des ports 3000 et 4000.

Chaque ligne en échec est suivie de la commande exacte qui la corrige. Lancez-le
avant d'ouvrir un ticket : dans la grande majorité des cas, il désigne la cause.

## 4. Lancer l'application

Deux terminaux :

```bash
npm run dev:api    # API sur http://localhost:4000 — documentation sur /docs
```

```bash
npm run dev:web    # Site sur http://localhost:3000
```

L'API doit être démarrée pour que le simulateur, les formulaires et le portail fonctionnent.

### Comptes de démonstration

Mot de passe : `sanarys-demo-2026`. Ces comptes n'existent que dans les données de développement.

| Email | Accès |
|---|---|
| `demo@sanarys.ma` | Administrateur du groupement — portail client |
| `pme-a@sanarys.ma` | Direction d'une PME membre — droits réduits |
| `staff@sanarys.ma` | Commercial SANARYS — console `/staff/leads` |

## 5. Vérifier que tout fonctionne

```bash
npm run typecheck   # 0 erreur attendue
npm test            # tests API — base de données requise
```

Pour les tests end-to-end, laissez les deux serveurs tournés dans leurs terminaux, puis dans un troisième :

```bash
npx playwright install chromium   # première fois seulement
npm run test:e2e
```

## 6. Parcours à essayer en premier

1. `http://localhost:3000` — page d'accueil, diagramme CSPS animé, mini-simulateur
2. `http://localhost:3000/simulateur` — le parcours complet en sept étapes, jusqu'au PDF
3. `http://localhost:3000/connexion` avec `staff@sanarys.ma` — la demande d'audit que vous venez de soumettre apparaît dans la file commerciale
4. `http://localhost:3000/connexion` avec `demo@sanarys.ma` — portail client, contrats et rapports
5. `http://localhost:4000/docs` — documentation OpenAPI de l'API

## 7. Problèmes courants

Avant toute chose : `npm run doctor`. Les cas ci-dessous en sont la traduction
détaillée.

**`@prisma/client did not initialize yet`**
Le client Prisma n'a pas été généré. `npm run db:generate`. Il l'est normalement
automatiquement à l'`npm install` (script `postinstall`).

**L'API s'arrête au démarrage sur `DATABASE_URL: Required`**
Le fichier `.env` n'existe pas, ou n'a pas été lu. `npm run setup`, puis relancez.

**Erreur CORS dans la console du navigateur**
`NEXT_PUBLIC_API_BASE_URL` force le navigateur à appeler l'API en direct. En
local, laissez cette variable commentée : les appels passent alors par le proxy
`/api/v1` de Next, sur la même origine.

**`Can't reach database server at localhost:5432`**
PostgreSQL n'est pas démarré. macOS : `brew services start postgresql@16`. Linux : `sudo systemctl start postgresql`. Docker : `docker compose up -d postgres`.

**`role "sanarys" does not exist`**
Le rôle n'a pas été créé : reprenez l'étape 3.

**Le simulateur affiche « Impossible de démarrer »**
L'API n'est pas lancée, ou les données de démonstration manquent. Vérifiez `npm run dev:api` et relancez `npm run db:seed`.

**Le site s'affiche sans mise en forme**
Un `next build` a été lancé pendant que `next dev` tournait. Arrêtez le serveur, supprimez `apps/web/.next`, relancez `npm run dev:web`.

**`EADDRINUSE` sur le port 3000 ou 4000**
Un serveur tourne déjà. Arrêtez-le, ou changez `API_PORT` dans `.env`.

## 8. Avant toute mise en production

Le `README.md` contient le registre de ce qui est réel et de ce qui est simulé dans cette version, ainsi que la liste des points bloquants (authentification OIDC, MFA, formalités CNDP, test d'intrusion, stockage objet, validation médicale). Lisez-le avant d'ouvrir le service à de vrais utilisateurs.
