# Accessibilité — checklist de vérification manuelle

Cible : **WCAG 2.2 niveau AA** pour le site public et les espaces authentifiés (cahier des charges, section 20).

Les tests automatisés (`npm run test:e2e`) exécutent axe-core sur dix pages publiques, vérifient le lien d'évitement et le respect de `prefers-reduced-motion`. **Ils ne couvrent qu'une partie des critères** : l'outillage automatique détecte environ un tiers des problèmes réels. Cette checklist couvre le reste et doit être passée avant chaque mise en production.

## Ce qui est déjà vérifié automatiquement

| Contrôle | Où |
|---|---|
| Contrastes de couleur (AA) | `tests/e2e/specs/accessibilite.spec.ts` — axe-core, 10 pages |
| Labels de formulaire, rôles ARIA, structure de titres | idem, axe-core |
| Présence et fonctionnement du lien d'évitement | idem |
| Neutralisation des animations sous `prefers-reduced-motion` | idem |
| Isolation clavier de base sur le simulateur | idem |

## À vérifier manuellement

### 1. Navigation au clavier

- [ ] Parcourir l'accueil entièrement à la touche `Tab` : l'ordre suit l'ordre visuel, sans piège au clavier.
- [ ] Le focus est **visible en permanence** sur fond clair comme sur fond bleu nuit.
- [ ] Le menu mobile s'ouvre, se parcourt et se ferme au clavier (`Entrée`, `Échap`).
- [ ] Les trois étapes du modèle CSPS sont sélectionnables au clavier et le diagramme suit.
- [ ] Le simulateur se complète intégralement sans souris, des sept étapes jusqu'au résultat.
- [ ] Le déplacement de focus vers le titre à chaque étape ne « saute » pas de champ.
- [ ] L'accordéon FAQ s'ouvre et se ferme au clavier, l'état est annoncé.
- [ ] Le portail et la console commerciale sont pilotables au clavier, y compris le sélecteur d'organisation.

### 2. Lecteur d'écran

À tester avec au moins deux combinaisons (NVDA + Firefox, VoiceOver + Safari).

- [ ] Le titre de chaque page est annoncé et décrit correctement son contenu.
- [ ] Les erreurs de formulaire sont annoncées à la soumission, pas seulement affichées.
- [ ] Les champs obligatoires sont annoncés comme tels (l'astérisque visuel ne suffit pas).
- [ ] Les messages de confirmation (`role="status"`) sont annoncés sans voler le focus.
- [ ] Le résultat de simulation est parcourable : chaque recommandation, sa justification et l'identifiant de règle sont accessibles.
- [ ] La carte des zones est bien ignorée (`aria-hidden`) et **la liste équivalente porte toute l'information**.
- [ ] Les indicateurs du portail annoncent leur définition, pas seulement leur valeur.
- [ ] Les badges de statut ne reposent pas uniquement sur la couleur.

### 3. Zoom et redimensionnement

- [ ] Zoom navigateur à **200 %** : aucun contenu tronqué, aucun défilement horizontal.
- [ ] Zoom texte seul à 200 % : les mises en page ne se chevauchent pas.
- [ ] Largeur **320 px** : le site reste utilisable, y compris le simulateur.
- [ ] Orientation paysage sur mobile : le contenu reste accessible.

### 4. Cibles tactiles et interaction

- [ ] Les boutons et cases de choix mesurent au moins 24×24 px et sont suffisamment espacés.
- [ ] Aucune action ne dépend d'un survol seul.
- [ ] Aucune fonction ne dépend d'un geste complexe.

### 5. Contenu et langue

- [ ] L'attribut `lang` de la page correspond à la langue réellement affichée.
- [ ] Les intitulés de liens sont compréhensibles hors contexte (« En savoir plus » est suivi d'un contexte accessible).
- [ ] Les abréviations métier (CSPS, DPS, DAE) sont explicitées à leur première occurrence ou dans le glossaire.
- [ ] Aucune information n'est transmise par la couleur seule.

### 6. Formulaires et délais

- [ ] La progression du simulateur survit à un rechargement de page (reprise sans compte).
- [ ] Aucune limite de temps ne fait perdre une saisie sans avertissement.
- [ ] La session du portail annonce son expiration plutôt que d'échouer silencieusement.

### 7. Impression

- [ ] Les pages `qualité & conformité` et le résultat de simulation s'impriment lisiblement.
- [ ] Le PDF de simulation reste lisible en noir et blanc.

## Points connus non conformes ou non couverts

À traiter avant toute revendication de conformité :

1. **Aucun test avec des utilisateurs en situation de handicap** n'a été réalisé. WCAG impose de tester, pas seulement de déclarer.
2. **Le rendu arabe/RTL n'est pas vérifié** : l'architecture est prête (polices, propriétés logiques) mais aucun contenu arabe n'existe et aucun test RTL n'a été passé.
3. **Le PDF généré n'a pas été audité** pour l'accessibilité (balisage PDF/UA, ordre de lecture).
4. **Aucun test sur lecteur d'écran réel** n'a été effectué dans cette version : seul l'outillage automatique a tourné.

## Procédure en cas de régression

Un échec du test automatique bloque la CI. Pour une régression détectée manuellement :

1. Reproduire et noter la combinaison navigateur + technologie d'assistance.
2. Ajouter un test automatisé si le critère est automatisable.
3. Corriger dans le composant partagé plutôt que dans la page, afin que la correction profite à tous les usages.
