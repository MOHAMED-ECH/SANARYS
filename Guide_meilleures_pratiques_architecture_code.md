# Guide des meilleures pratiques d’architecture et de qualité du code

## 1. Objectif du document

Ce document définit un ensemble de règles génériques pour concevoir, développer, tester et maintenir une application moderne.

Il vise à garantir :

- une architecture compréhensible ;
- un code testable et évolutif ;
- une séparation claire des responsabilités ;
- une réduction de la dette technique ;
- une meilleure sécurité ;
- une meilleure maintenabilité ;
- une collaboration plus efficace entre développeurs ;
- une intégration plus sûre des outils d’intelligence artificielle dans le développement.

Ces règles sont indépendantes d’un langage, d’un framework ou d’un secteur métier particulier. Les exemples utilisent principalement TypeScript, mais les principes restent applicables à Java, C#, Python, Go, PHP ou d’autres technologies.

---

# 2. Principes fondamentaux

## 2.1. Le code doit exprimer l’intention

Le code doit expliquer clairement ce qu’il fait et pourquoi il le fait.

Préférer :

```ts
const isEligibleForPrioritySupport =
  customer.isActive &&
  customer.contract.hasPrioritySupport;
```

À :

```ts
const ok = c.a && c.ct.p;
```

Les noms doivent refléter le vocabulaire métier réel.

Éviter les termes vagues :

```text
data
item
object
thing
process
manager
helper
misc
utils
```

Préférer des noms explicites :

```text
customerProfile
subscriptionContract
paymentAuthorization
invoiceGenerationPolicy
passwordResetToken
```

## 2.2. Une responsabilité principale par composant

Une classe, une fonction ou un module doit avoir une raison principale de changer.

Un composant qui lit la base de données, applique une règle métier, génère un document, envoie un email et transforme une réponse HTTP possède trop de responsabilités.

Il faut séparer ces préoccupations en composants spécialisés :

```text
CreateInvoiceUseCase
InvoiceRepository
InvoicePricingPolicy
InvoicePdfGenerator
NotificationService
InvoicePresenter
```

## 2.3. La logique métier doit rester indépendante de la technologie

La logique métier ne doit pas dépendre directement :

- du framework web ;
- de la base de données ;
- d’un ORM ;
- d’une bibliothèque d’interface ;
- d’un fournisseur de messagerie ;
- d’un système de stockage ;
- d’un service tiers.

Le domaine doit pouvoir être testé sans lancer le serveur HTTP, PostgreSQL, Redis, un navigateur ou un service externe.

## 2.4. Favoriser un monolithe modulaire avant les microservices

Les microservices ajoutent de la complexité réseau, de la latence, des problèmes de synchronisation, des déploiements distribués, des difficultés d’observabilité et des transactions distribuées.

Pour la majorité des nouveaux projets, commencer par un monolithe modulaire est plus sûr.

```text
src/modules/
├── identity/
├── customers/
├── billing/
├── notifications/
├── reporting/
└── documents/
```

Chaque module expose une API publique et masque ses détails internes.

---

# 3. Architecture en couches

## 3.1. Structure recommandée

```text
module/
├── domain/
├── application/
├── infrastructure/
└── presentation/
```

### Domaine

Contient les entités, objets de valeur, règles métier, politiques, services de domaine, événements métier et interfaces nécessaires au domaine.

### Application

Contient les cas d’utilisation, commandes, requêtes, DTO, orchestration, transactions et vérifications d’autorisation applicative.

### Infrastructure

Contient les repositories concrets, l’ORM, les bases de données, services externes, stockage, fournisseurs d’identité, adaptateurs techniques et files de messages.

### Présentation

Contient les routes HTTP, contrôleurs, handlers, schémas d’entrée, présentateurs, réponses API et composants d’interface.

## 3.2. Règle de dépendance

```text
Présentation
     ↓
Application
     ↓
Domaine
```

L’infrastructure implémente les interfaces définies par l’application ou le domaine.

Le domaine ne doit pas importer Fastify, Express, NestJS, React, Prisma, TypeORM, PostgreSQL, AWS SDK ou un fournisseur externe.

## 3.3. Interdire les imports profonds entre modules

Interdit :

```ts
import { InternalCustomerMapper }
  from "../../customers/infrastructure/mappers/internal-customer-mapper";
```

Autorisé :

```ts
import { customersModule } from "../../customers";
```

Chaque module doit exposer explicitement son API publique.

---

# 4. Où placer chaque type de logique

## 4.1. DTO et schémas de validation

Les DTO transportent les données à travers une frontière.

Ils peuvent définir les champs, types, formats, longueurs, contraintes syntaxiques et règles de sérialisation.

Ils ne doivent pas :

- exécuter des requêtes SQL ;
- envoyer des emails ;
- calculer des décisions métier ;
- modifier des entités ;
- lancer un workflow ;
- appeler directement un service externe.

```ts
const createCustomerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
});
```

## 4.2. Modèles de persistance

Un modèle ORM représente la manière dont les données sont stockées.

```text
Modèle ORM
≠ Entité métier
≠ DTO
≠ Réponse API
```

Ne jamais exposer directement un objet ORM dans une API publique.

Interdit :

```ts
return reply.send(prismaCustomer);
```

Préférer :

```ts
return reply.send(customerPresenter.toResponse(customer));
```

## 4.3. Entités métier

Une entité représente un objet métier ayant une identité et un cycle de vie.

```ts
class Subscription {
  cancel(cancelledAt: Date): void {
    if (this.status === "CANCELLED") {
      throw new SubscriptionAlreadyCancelledError(this.id);
    }

    this.status = "CANCELLED";
    this.cancelledAt = cancelledAt;
  }
}
```

Éviter la modification directe :

```ts
subscription.status = "CANCELLED";
```

## 4.4. Objets de valeur

Un objet de valeur est défini par sa valeur et non par une identité.

Exemples : `EmailAddress`, `PhoneNumber`, `Money`, `DateRange`, `PostalAddress`, `Percentage`, `Currency`.

Il doit être immuable, valide dès sa création, comparable par sa valeur et indépendant de la base de données.

```ts
class EmailAddress {
  private constructor(readonly value: string) {}

  static create(value: string): EmailAddress {
    const normalized = value.trim().toLowerCase();

    if (!normalized.includes("@")) {
      throw new InvalidEmailAddressError(value);
    }

    return new EmailAddress(normalized);
  }
}
```

## 4.5. Services de domaine

Un service de domaine contient une règle métier importante qui ne peut pas appartenir naturellement à une seule entité.

```ts
class PricingPolicy {
  calculate(
    customer: Customer,
    items: readonly OrderItem[],
  ): Money {
    // Règles métier de tarification.
  }
}
```

Un service de domaine ne connaît ni HTTP, ni l’ORM, ni les détails d’infrastructure.

## 4.6. Services d’application ou cas d’utilisation

Un cas d’utilisation orchestre un scénario :

```text
Recevoir la commande
→ vérifier les droits
→ charger les données
→ appeler le domaine
→ sauvegarder
→ enregistrer les événements
→ retourner un résultat
```

```ts
class CancelSubscriptionUseCase {
  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(command: CancelSubscriptionCommand): Promise<void> {
    const subscription =
      await this.subscriptions.findById(command.subscriptionId);

    if (!subscription) {
      throw new SubscriptionNotFoundError(command.subscriptionId);
    }

    subscription.cancel(this.clock.now());

    await this.unitOfWork.execute(async () => {
      await this.subscriptions.save(subscription);
    });
  }
}
```

Le cas d’utilisation orchestre. La règle métier principale reste dans l’entité ou dans une politique métier.

## 4.7. Contrôleurs et routes

Une route doit rester mince.

Responsabilités autorisées :

1. recevoir la requête ;
2. valider l’entrée ;
3. récupérer le contexte de sécurité ;
4. appeler un cas d’utilisation ;
5. transformer le résultat ;
6. retourner la réponse HTTP.

Interdit dans une route : requêtes ORM directes, calcul métier, logique de tarification, autorisations dispersées, appels directs à plusieurs services externes et transactions complexes.

---

# 5. Principes SOLID

## 5.1. Single Responsibility Principle

Un composant doit avoir une raison principale de changer.

Mauvais :

```text
OrderService
├── calcule le prix
├── écrit dans la base
├── génère le PDF
├── envoie l’email
├── vérifie les permissions
└── crée la réponse HTTP
```

Meilleur :

```text
CreateOrderUseCase
OrderPricingPolicy
OrderRepository
OrderPdfGenerator
OrderNotificationService
OrderPresenter
```

## 5.2. Open/Closed Principle

Un composant doit pouvoir être étendu sans modifier continuellement sa logique centrale.

```ts
interface DiscountPolicy {
  calculate(context: DiscountContext): Money;
}
```

Implémentations possibles :

```text
LoyalCustomerDiscountPolicy
SeasonalDiscountPolicy
VolumeDiscountPolicy
```

Ne pas créer d’abstraction sans variation réelle.

## 5.3. Liskov Substitution Principle

Une implémentation doit pouvoir remplacer une autre sans casser le contrat attendu.

```text
FileStorage
├── LocalFileStorage
├── S3FileStorage
└── InMemoryFileStorage
```

Toutes les implémentations doivent respecter les mêmes entrées, sorties, erreurs, règles d’idempotence et garanties principales.

## 5.4. Interface Segregation Principle

Éviter les interfaces géantes.

Préférer :

```ts
interface NotificationPort {}
interface FileStoragePort {}
interface PdfGeneratorPort {}
interface IdentityProviderPort {}
```

## 5.5. Dependency Inversion Principle

La logique métier dépend d’abstractions stables.

```ts
interface CustomerRepository {
  findById(id: CustomerId): Promise<Customer | null>;
  save(customer: Customer): Promise<void>;
}
```

L’infrastructure fournit l’implémentation concrète.

---

# 6. Gestion du code partagé et des fichiers utilitaires

## 6.1. Interdire les fichiers fourre-tout

Éviter :

```text
utils.ts
helpers.ts
common.ts
misc.ts
functions.ts
shared.ts
constants.ts
```

Préférer :

```text
dates/format-report-date.ts
security/hash-token.ts
phone/normalize-phone-number.ts
strings/slugify.ts
http/parse-pagination.ts
```

## 6.2. Ne pas extraire une abstraction sur simple ressemblance

Extraire seulement lorsque les codes :

- représentent la même règle ;
- changent pour la même raison ;
- doivent évoluer ensemble ;
- permettent de nommer clairement l’abstraction.

La duplication temporaire est parfois préférable à une mauvaise abstraction.

## 6.3. Critères pour un module partagé

Une fonction peut être partagée lorsqu’elle est générique, stable, indépendante d’un domaine, réutilisée, testée et sans effets cachés.

Exemples acceptables :

```text
shared/dates/
shared/cryptography/
shared/http/
shared/result/
shared/testing/
```

## 6.4. Favoriser les fonctions pures

Une fonction pure retourne le même résultat pour les mêmes entrées, ne modifie pas d’état externe et ne dépend pas d’une horloge ou d’un réseau global.

---

# 7. Design patterns recommandés

## 7.1. Strategy

Pour plusieurs comportements interchangeables : stratégie de tarification, notification, stockage, calcul ou génération de document.

## 7.2. Policy ou Specification

Pour exprimer des règles métier combinables.

```text
Client actif
ET contrat valide
ET plafond non dépassé
```

## 7.3. State Machine

Pour les objets ayant des transitions contrôlées.

```text
DRAFT
→ SUBMITTED
→ APPROVED
→ ACTIVE
→ SUSPENDED
→ CLOSED
```

Préférer `contract.activate()` à `contract.status = "ACTIVE"`.

## 7.4. Adapter

Pour isoler les emails, SMS, paiements, CRM, stockage, fournisseurs d’identité, cartographie ou génération PDF.

## 7.5. Repository

Un repository représente une collection d’agrégats métier.

Éviter les repositories génériques universels qui exposent des `where: any` et `data: any`.

## 7.6. Unit of Work

À utiliser lorsque plusieurs écritures doivent réussir ou échouer ensemble.

Une transaction doit rester courte. Aucun appel réseau ne doit être effectué à l’intérieur.

## 7.7. Domain Events

Exemples :

```text
CustomerRegistered
OrderConfirmed
InvoiceIssued
ContractActivated
PasswordResetRequested
```

## 7.8. Transactional Outbox

Lorsqu’une modification en base doit déclencher un événement fiable :

1. enregistrer l’état métier ;
2. enregistrer l’événement dans l’outbox ;
3. valider la transaction ;
4. publier l’événement avec un worker ;
5. marquer l’événement comme traité.

## 7.9. Retry et Circuit Breaker

Les tentatives doivent être limitées, espacées, observables et réservées aux erreurs temporaires. Les opérations répétées doivent être idempotentes.

---

# 8. Règles TypeScript

## 8.1. Configuration stricte

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "useUnknownInCatchVariables": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true
  }
}
```

## 8.2. Règles obligatoires

- Interdire `any`, sauf exception documentée.
- Utiliser `unknown` pour toute donnée externe non validée.
- Éviter les assertions `as Type`.
- Éviter l’opérateur `!`.
- Favoriser `readonly`.
- Utiliser des unions discriminées.
- Vérifier les `switch` de manière exhaustive.
- Éviter plusieurs booléens pour représenter un seul état.
- Créer des types dédiés pour les identifiants métier.
- Ne jamais ignorer silencieusement une erreur.

```ts
type PaymentResult =
  | { status: "succeeded"; paymentId: string }
  | { status: "declined"; reason: string }
  | { status: "failed"; errorCode: string };
```

## 8.3. Encapsuler les identifiants métier

```ts
type CustomerId = string & { readonly __brand: "CustomerId" };
type InvoiceId = string & { readonly __brand: "InvoiceId" };
```

---

# 9. Règles frontend et React

## 9.1. Composants purs

Pendant le rendu, un composant ne doit pas appeler une API, écrire dans le stockage, modifier une variable globale, muter ses propriétés ou exécuter une règle métier critique.

## 9.2. Séparation recommandée

```text
feature/
├── api/
├── components/
├── hooks/
├── model/
├── pages/
├── schemas/
└── tests/
```

- Une page assemble le parcours.
- Un composant de fonctionnalité gère une interaction spécifique.
- Un composant UI présente les données sans connaître les détails métier.

## 9.3. Interdictions frontend

- Pas de logique métier centrale dans les composants.
- Pas de seuil métier codé dans l’interface.
- Pas de `fetch` direct dans un composant de présentation.
- Pas d’état dupliqué inutilement.
- Pas de `useEffect` pour des calculs simples.
- Pas de mutation directe.

## 9.4. État calculé

Ne pas stocker une valeur pouvant être calculée directement.

## 9.5. Reducer pour les workflows complexes

Un reducer est adapté aux formulaires ou assistants multi-étapes.

---

# 10. Base de données et persistance

## 10.1. Règles générales

- Aucun accès ORM dans les routes.
- Aucun objet ORM exposé publiquement.
- Les migrations sont versionnées.
- Une migration déjà déployée ne doit pas être réécrite.
- Les contraintes importantes existent aussi en base.
- Les index répondent à des requêtes réelles.
- Les transactions correspondent à une unité métier atomique.
- Les durées de conservation sont définies par type de donnée.

## 10.2. Idempotence

À prévoir pour les créations, paiements, soumissions de formulaires, traitements d’événements, générations de documents et notifications.

Un double clic ou une nouvelle tentative réseau ne doit pas créer plusieurs effets identiques.

## 10.3. Concurrence optimiste

Pour les données sensibles aux modifications simultanées, utiliser un champ de version.

## 10.4. Audit

Journaliser les connexions, changements de rôle, changements de statut, suppressions, téléchargements sensibles et actions administratives.

---

# 11. API et sécurité

## 11.1. Contrat API

Chaque endpoint doit préciser ses paramètres, corps, réponses, erreurs, règles d’authentification, autorisations, pagination, limites, exemples, version et idempotence.

## 11.2. Validation des entrées

Toute donnée externe est non fiable. Valider son type, format, longueur, bornes, valeurs autorisées, cohérence métier et taille.

## 11.3. Autorisation

Principes :

- refus par défaut ;
- moindre privilège ;
- contrôle à chaque requête ;
- contrôle de l’action ;
- contrôle de la ressource ;
- contrôle du périmètre organisationnel ;
- tests automatisés.

## 11.4. Authentification

Prévoir l’expiration, la rotation, la révocation, la déconnexion globale, la limitation des tentatives, le MFA pour les comptes sensibles, la récupération de mot de passe, l’expiration des invitations, les cookies sécurisés et la protection CSRF.

## 11.5. Gestion des secrets

Ne jamais stocker dans le dépôt des mots de passe, clés API, certificats privés, tokens ou chaînes de connexion de production.

## 11.6. Logs

Ne jamais journaliser les mots de passe, tokens de session, clés API, secrets ou données sensibles non nécessaires.

---

# 12. Gestion des erreurs

## 12.1. Erreurs typées

Créer des erreurs explicites :

```text
CustomerNotFoundError
ContractAlreadyActivatedError
InsufficientPermissionError
InvalidTransitionError
DuplicatePaymentError
```

## 12.2. Mapper les erreurs à la frontière

Le domaine ne doit pas connaître les codes HTTP.

```text
CustomerNotFoundError → HTTP 404
InvalidInputError → HTTP 400
InsufficientPermissionError → HTTP 403
ConflictError → HTTP 409
```

## 12.3. Ne jamais avaler une erreur

Une erreur doit être traitée, transformée, journalisée, propagée ou explicitement ignorée avec justification.

---

# 13. Tests

## 13.1. Tests unitaires

Pour les entités, objets de valeur, politiques, fonctions pures, transitions et calculs métier.

## 13.2. Tests d’intégration

Pour les repositories, transactions, migrations, API, authentification, autorisation, stockage et adaptateurs.

## 13.3. Tests de contrat

Pour vérifier que plusieurs implémentations respectent la même interface.

## 13.4. Tests end-to-end

Pour les parcours critiques de bout en bout.

## 13.5. Tests de sécurité

Tester les contournements d’autorisation, accès inter-tenant, injections, CSRF, XSS, brute force, téléversements, fuite de données, expiration des tokens et révocation des sessions.

## 13.6. Tests de performance

Tester le temps de réponse, la concurrence, la charge, les requêtes lentes, la mémoire, les bundles frontend et les dépendances externes lentes.

---

# 14. Observabilité

Une application de production doit fournir :

- logs structurés ;
- métriques ;
- traces ;
- identifiants de corrélation ;
- alertes ;
- tableaux de bord ;
- suivi des erreurs ;
- suivi des tâches asynchrones ;
- suivi des dépendances externes.

Mesures utiles : taux d’erreur, latence p50/p95/p99, débit, profondeur des files, temps de traitement et consommation de ressources.

---

# 15. Intégration continue et déploiement

## 15.1. Vérifications obligatoires en CI

- formatage ;
- lint ;
- compilation ;
- tests unitaires ;
- tests d’intégration ;
- tests de contrat ;
- analyse des dépendances ;
- recherche de secrets ;
- vérification des migrations ;
- tests de sécurité essentiels ;
- tests end-to-end critiques.

## 15.2. Environnements

```text
local
test
staging
production
```

La configuration doit être externalisée.

## 15.3. Déploiements

Prévoir les migrations contrôlées, rollback, sauvegardes, restauration testée, feature flags, déploiement progressif et surveillance après déploiement.

---

# 16. Pull requests et revue de code

## 16.1. Une intention principale par pull request

Une pull request doit être petite, compréhensible, testable, réversible et cohérente.

## 16.2. Contenu attendu

- objectif ;
- justification ;
- changements ;
- tests ;
- impacts sécurité ;
- impacts données ;
- captures si interface ;
- migrations ;
- méthode de vérification ;
- plan de rollback.

## 16.3. Points de revue

Vérifier l’exactitude, l’architecture, la lisibilité, la complexité, la sécurité, les tests, l’accessibilité, la performance, l’observabilité, les erreurs et la documentation.

---

# 17. Documentation d’architecture

Documents recommandés :

```text
README.md
ARCHITECTURE.md
CONTRIBUTING.md
SECURITY.md
TESTING.md
DEPLOYMENT.md
docs/adr/
```

## 17.1. ADR

Une Architecture Decision Record contient : titre, statut, contexte, décision, alternatives, conséquences et date.

---

# 18. Utilisation de l’intelligence artificielle

Le code produit par une IA doit être traité comme une proposition nécessitant une revue humaine.

Il doit être compris, testé, sécurisé, simplifié et vérifié contre l’architecture et la documentation officielle.

L’IA ne doit pas inventer une API, contourner les types, ajouter une dépendance sans justification, dupliquer une logique existante, modifier une migration déployée, exposer des secrets ou supprimer des contrôles de sécurité pour faire passer un test.

---

# 19. Anti-patterns interdits

1. God Service.
2. Fat Controller.
3. ORM Everywhere.
4. Generic Repository universel.
5. Fichier `utils.ts` fourre-tout.
6. Imports profonds entre modules.
7. Dépendances circulaires.
8. État global mutable.
9. Règles métier codées dans l’interface.
10. Duplication inutile des validations.
11. Assertions de type destinées à masquer un problème.
12. Erreurs silencieuses.
13. Appels réseau dans une transaction SQL.
14. Modification directe d’un statut sans transition contrôlée.
15. Accumulation de booléens pour représenter un état.
16. Abstraction prématurée.
17. Pattern utilisé sans problème réel à résoudre.
18. Microservice créé sans frontière métier claire.
19. Logs contenant des secrets ou données sensibles.
20. Code mort conservé sans justification.
21. Commentaires compensant un code volontairement obscur.
22. Copier-coller massif sans analyse du concept.
23. Dépendance ajoutée pour une fonction triviale.
24. Tests qui reproduisent l’implémentation au lieu de vérifier le comportement.
25. Configuration de production codée en dur.

---

# 20. Règles non négociables

```text
MUST-01  Le code doit utiliser le vocabulaire métier réel.
MUST-02  Les routes et contrôleurs doivent rester minces.
MUST-03  La logique métier ne doit pas dépendre d’un framework.
MUST-04  Les services d’application orchestrent les cas d’utilisation.
MUST-05  Les entités et objets de valeur protègent leurs invariants.
MUST-06  Les modèles ORM ne doivent pas être exposés directement.
MUST-07  Toute donnée externe doit être validée.
MUST-08  Les dépendances externes passent par des ports ou adaptateurs.
MUST-09  Les transactions ne contiennent aucun appel réseau.
MUST-10  Les opérations critiques doivent être idempotentes.
MUST-11  Toute règle métier modifiée doit être couverte par un test.
MUST-12  Les erreurs doivent être explicites et typées.
MUST-13  Les erreurs ne doivent jamais être ignorées silencieusement.
MUST-14  Les autorisations doivent être refusées par défaut.
MUST-15  Toute ressource sensible doit être contrôlée côté serveur.
MUST-16  Les imports profonds entre modules sont interdits.
MUST-17  Les dépendances circulaires font échouer la CI.
MUST-18  Les fichiers utils/common/helpers fourre-tout sont interdits.
MUST-19  Une abstraction doit représenter un concept réel.
MUST-20  TypeScript strict ou l’équivalent du langage est obligatoire.
MUST-21  Les secrets ne doivent jamais être stockés dans le dépôt.
MUST-22  Les logs ne doivent jamais contenir de secrets.
MUST-23  Une migration déjà déployée ne doit pas être réécrite.
MUST-24  Les décisions d’architecture importantes doivent être documentées.
MUST-25  Chaque pull request doit être testable et réversible.
MUST-26  Les composants frontend doivent rester purs.
MUST-27  Les valeurs calculables ne doivent pas être dupliquées dans l’état.
MUST-28  Les règles métier ne doivent pas être codées dans l’interface.
MUST-29  Les intégrations externes doivent être observables et résilientes.
MUST-30  Aucun code généré par IA ne doit être fusionné sans revue humaine.
```

---

# 21. Definition of Done

Une fonctionnalité est terminée seulement lorsque :

- le besoin est compris ;
- le code respecte l’architecture ;
- les tests sont présents ;
- les erreurs sont gérées ;
- les autorisations sont vérifiées ;
- les logs utiles sont ajoutés ;
- les données sensibles sont protégées ;
- l’accessibilité est contrôlée ;
- la performance est acceptable ;
- la documentation est mise à jour ;
- les migrations sont validées ;
- le déploiement est prévu ;
- le rollback est possible ;
- la revue de code est terminée ;
- aucun secret n’est exposé ;
- aucun avertissement critique n’est ignoré.

---

# 22. Checklist de revue rapide

## Architecture

- [ ] Le code se trouve-t-il dans le bon module ?
- [ ] La couche métier est-elle indépendante de l’infrastructure ?
- [ ] Les responsabilités sont-elles correctement séparées ?
- [ ] Les imports respectent-ils les frontières ?

## Qualité

- [ ] Les noms sont-ils explicites ?
- [ ] Le code est-il simple à lire ?
- [ ] Existe-t-il une abstraction prématurée ?
- [ ] Existe-t-il une duplication réellement problématique ?
- [ ] Une fonction ou classe possède-t-elle trop de responsabilités ?

## Données

- [ ] Les entrées sont-elles validées ?
- [ ] Les invariants sont-ils protégés ?
- [ ] Les transactions sont-elles correctes ?
- [ ] L’opération est-elle idempotente ?
- [ ] Les accès concurrents sont-ils gérés ?

## Sécurité

- [ ] L’authentification est-elle vérifiée ?
- [ ] L’autorisation est-elle vérifiée ?
- [ ] Le moindre privilège est-il respecté ?
- [ ] Les secrets et données sensibles sont-ils protégés ?
- [ ] Les logs sont-ils sûrs ?

## Tests

- [ ] Le comportement métier est-il testé ?
- [ ] Les cas limites sont-ils testés ?
- [ ] Les erreurs sont-elles testées ?
- [ ] Les permissions sont-elles testées ?
- [ ] Les intégrations critiques sont-elles testées ?

## Exploitation

- [ ] Les logs sont-ils exploitables ?
- [ ] Les métriques sont-elles suffisantes ?
- [ ] Le changement peut-il être surveillé ?
- [ ] Le déploiement est-il réversible ?
- [ ] La documentation est-elle à jour ?

---

# Conclusion

Un bon code ne dépend pas seulement de l’application de patterns ou de règles formelles.

Il doit être compréhensible, correctement structuré, proche du langage métier, testable, sécurisé, observable, simple à modifier et difficile à utiliser de manière incorrecte.

Les principes d’architecture doivent servir le produit. Ils ne doivent jamais devenir une complexité supplémentaire sans bénéfice réel.
