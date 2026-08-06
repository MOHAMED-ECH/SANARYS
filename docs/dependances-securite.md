# Vulnérabilités des dépendances — analyse

`npm audit` signale actuellement 7 vulnérabilités (3 modérées, 3 hautes, 1 critique). Ce document explique pourquoi elles ne sont pas corrigées immédiatement, et ce qui déclencherait leur correction.

Le guide d'architecture (§15.1) impose une analyse des dépendances en intégration continue. Un signalement n'est pas une exposition : ce document fait la différence, avec les preuves.

## État au 5 août 2026

| Paquet | Gravité | Vecteur | Exposition réelle |
|---|---|---|---|
| `next` | haute | Déni de service via l'Image Optimizer, en auto-hébergement | **Aucune** — l'Image Optimizer est désactivé explicitement (`images.unoptimized` dans `next.config.mjs`). La route `/_next/image` n'existe donc pas. |
| `postcss` | haute | XSS via un `</style>` non échappé à la sortie du stringifier CSS | **Aucune** — un seul fichier CSS est traité (`apps/web/src/styles/globals.css`), écrit par l'équipe. Aucun CSS d'origine tierce n'entre dans la chaîne de build. |
| `vite` | haute | Path traversal dans la gestion des `.map` des dépendances optimisées | **Aucune en production** — `vite` n'arrive que par `vitest`, dépendance de développement. Le serveur concerné ne tourne jamais en production. |
| `vitest` | critique | Chaîne `@vitest/mocker` → `vite` | **Aucune en production** — `vitest` est déclaré en `devDependencies` dans `apps/web` et `apps/api`. Il n'est pas installé sur un environnement déployé (`npm ci --omit=dev`). |

Vérifications reproductibles :

```bash
# L'Image Optimizer est désactivé : la route vulnérable n'est pas générée
grep -n "unoptimized" apps/web/next.config.mjs          # → images.unoptimized: true

# vitest est bien en dépendance de développement
node -e "const p=require('./apps/web/package.json'); console.log('deps:', !!p.dependencies.vitest, '| dev:', !!p.devDependencies.vitest)"
```

## Pourquoi ne pas corriger tout de suite

Les versions installées sont déjà les **derniers correctifs de leur ligne majeure** : `next@14.2.35` et `vitest@2.1.9`. `npm audit fix` ne peut rien faire de plus.

Les corriger exige des montées de version majeures :

- `next` 14 → 16, avec les ruptures d'API associées ;
- `vitest` 2 → 4, avec la migration de `vite` 5 → 7.

Faire ces migrations sans exposition réelle, c'est prendre un risque de régression sur une application testée et fonctionnelle pour éliminer un signalement qui ne nous concerne pas.

## Ce qui déclencherait la correction

Ces migrations deviennent **obligatoires** si l'une de ces conditions apparaît :

1. Retrait de `images.unoptimized` dans `next.config.mjs`, ou activation de l'Image Optimizer par un autre biais, quelle qu'en soit la raison. C'est la seule ligne qui rend l'analyse ci-dessus valide.
2. Traitement de CSS provenant d'une source non maîtrisée (thème client, CMS, contribution externe).
3. Publication d'un correctif rétroporté sur `next@14` ou `vitest@2` — à surveiller.
4. Mise en production : la migration doit alors être planifiée et testée, indépendamment de l'exposition, pour ne pas rester sur des lignes majeures qui cesseront d'être maintenues.

## Avant la mise en production

Ce document ne remplace ni un test d'intrusion, ni une revue de sécurité. Le `README.md` liste les points bloquants à traiter avant toute ouverture réelle du service.

Cette analyse doit être refaite à chaque montée de version significative, et le résultat de `npm audit` doit être vérifié en intégration continue.
