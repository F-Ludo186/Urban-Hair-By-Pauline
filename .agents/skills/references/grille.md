# Grille de revue : Java Spring Boot, Angular, HTML/CSS/JS

Lire uniquement les sections correspondant aux technologies détectées dans le dépôt.
Pour chaque point : signaler, proposer un correctif, puis suivre la procédure
test/application du SKILL.md. Un point marqué [VALIDATION] n'est jamais appliqué
automatiquement.

## Commandes de référence (à adapter au projet)

| Techno | Build | Tests | Lint / qualité |
|---|---|---|---|
| Maven | `mvn -q clean verify` | `mvn -q test` | `mvn -q checkstyle:check` (si configuré) |
| Gradle | `./gradlew build` | `./gradlew test` | `./gradlew check` |
| Angular | `npm run build` | `npm test -- --watch=false --browsers=ChromeHeadless` | `npm run lint` |
| HTML/CSS/JS seul | ouverture sans erreur console | tests s'il y en a | ESLint / Stylelint si présents |

---

## 1. Java / Spring Boot

### Bugs et robustesse
- NullPointerException possibles : retours `null` non vérifiés, `Optional.get()` sans `isPresent()`. Préférer `orElseThrow(...)` avec une exception métier.
- Exceptions avalées (`catch (Exception e) {}`) ou simple `printStackTrace()` : utiliser un logger.
- Ressources non fermées : utiliser try-with-resources.
- Comparaison de chaînes avec `==`, `equals` appelé sur un objet potentiellement null.
- Gestion d'erreurs absente côté API : vérifier la présence d'un `@RestControllerAdvice` avec des codes HTTP cohérents (400, 404, 409, 500).

### Architecture
- Respect des couches : Controller → Service → Repository. Aucune logique métier dans les contrôleurs, aucun accès base dans les contrôleurs.
- Les entités JPA ne sont pas exposées directement par l'API : utiliser des DTO.
- Injection par constructeur (pas de `@Autowired` sur champ).
- `@Transactional` placé sur les services, pas sur les contrôleurs ; `readOnly = true` pour les lectures.
- Configuration externalisée (`application.yml`, profils) : aucune valeur en dur (URL, identifiants, chemins).

### Performance
- Problème N+1 sur les relations JPA (`@OneToMany`, `@ManyToOne`) : proposer `JOIN FETCH`, `@EntityGraph` ou une projection.
- Relations en `FetchType.EAGER` inutiles.
- Listes non paginées renvoyées par l'API : utiliser `Pageable`.
- Requêtes en boucle : remplacer par une requête groupée ou `saveAll`.
- Concaténation de chaînes dans une boucle : `StringBuilder`.
- Streams inutilement complexes ou parcours multiples de la même collection.
- Index manquants sur les colonnes filtrées ou jointes [VALIDATION].

### Sécurité
- Aucun secret (mot de passe, clé API, token) dans le code ou les fichiers versionnés.
- Requêtes SQL concaténées : utiliser des requêtes paramétrées.
- Entrées non validées : `@Valid`, `@NotNull`, `@Size`, etc. sur les DTO.
- Mots de passe stockés avec un encodeur adapté (BCrypt), jamais en clair.
- Configuration Spring Security : routes sensibles protégées, CORS restreint (pas de `*` en production), CSRF cohérent avec le type d'application.
- Endpoints Actuator et console H2 non exposés en production.
- Données sensibles dans les logs ou dans les réponses d'erreur.

### Qualité et tests
- Tests unitaires des services (JUnit 5, Mockito) ; tests d'intégration avec `@SpringBootTest` ou `@DataJpaTest` ; tests de contrôleurs avec `@WebMvcTest`.
- Méthodes de plus de ~30 lignes, classes de plus de ~300 lignes : proposer une extraction.
- Nombres magiques : constantes ou énumérations.
- Code dupliqué : méthode utilitaire ou service commun.
- Imports inutilisés, variables non utilisées, code commenté.
- Dépendances Maven/Gradle obsolètes ou inutilisées [VALIDATION pour les montées de version majeures].

---

## 2. Angular / TypeScript

### Bugs et robustesse
- Abonnements RxJS jamais désinscrits : `async` pipe, `takeUntilDestroyed()` ou `takeUntil`.
- Abonnements imbriqués (`subscribe` dans `subscribe`) : utiliser `switchMap`, `mergeMap`, `combineLatest`.
- Type `any` : remplacer par des interfaces ou types précis ; vérifier que `strict` est activé dans `tsconfig.json`.
- Appels HTTP sans gestion d'erreur (`catchError`) ni état de chargement.
- Mutation directe d'objets partagés entre composants.

### Architecture
- Logique métier et appels HTTP dans des services, pas dans les composants.
- Composants volumineux : séparer en composants de présentation (`@Input`/`@Output`) et composants conteneurs.
- Modules ou composants standalone cohérents ; routes chargées en lazy loading quand l'application grossit.
- Interceptors HTTP pour l'authentification et la gestion centralisée des erreurs ; guards pour les routes protégées.
- URLs d'API et paramètres dans les fichiers d'environnement.

### Performance
- `ChangeDetectionStrategy.OnPush` sur les composants de présentation.
- `trackBy` (ou `track` dans le nouveau `@for`) sur les listes.
- Appels de fonctions dans les templates : remplacer par des propriétés calculées, des pipes purs ou des signals.
- Gros bundles : lazy loading, imports ciblés, images optimisées.
- Requêtes de saisie sans `debounceTime` / `distinctUntilChanged`.

### Sécurité
- `innerHTML`, `bypassSecurityTrust*` : justifier ou supprimer (risque XSS).
- Jetons stockés dans `localStorage` [VALIDATION] : signaler le risque, proposer une alternative (cookie HttpOnly).
- Aucun secret dans le code front : tout ce qui est dans Angular est public.

### Qualité et tests
- Tests unitaires des services et composants (Jasmine/Karma ou Jest selon le projet).
- Formulaires réactifs avec validateurs plutôt que validation manuelle.
- Imports et variables inutilisés, `console.log` oubliés, code commenté.
- Accessibilité : voir la section 3.

---

## 3. HTML / CSS / JavaScript

### HTML et accessibilité (RGAA / WCAG)
- Balises sémantiques (`header`, `nav`, `main`, `section`, `footer`) au lieu de `div` génériques.
- Un seul `h1` par page, hiérarchie de titres sans saut.
- `lang` renseigné sur `<html>`, `<title>` pertinent sur chaque page.
- Images : `alt` renseigné (vide si purement décoratives).
- Champs de formulaire associés à un `label` ; messages d'erreur explicites.
- Éléments interactifs réels (`button`, `a`) plutôt que `div` cliquables ; navigation au clavier possible, focus visible.
- Contrastes suffisants (4,5:1 pour le texte courant).
- Attributs ARIA uniquement quand le HTML natif ne suffit pas.

### CSS
- Doublons et règles mortes ; sélecteurs trop spécifiques ou chaînés ; usage de `!important`.
- Valeurs répétées (couleurs, espacements) : variables CSS (`:root`).
- Unités relatives (`rem`, `%`) plutôt que `px` pour les tailles de texte.
- Mise en page avec Flexbox/Grid plutôt que flottants ou positionnements fragiles.
- Responsive : balise `viewport`, media queries cohérentes, pas de défilement horizontal.
- Respect de `prefers-reduced-motion` pour les animations.
- Propriétés d'animation coûteuses (`top`, `left`, `width`) : préférer `transform` et `opacity`.

### JavaScript
- `var` : remplacer par `const` / `let` ; égalité stricte (`===`).
- Code asynchrone : `async/await` avec `try/catch` ; promesses sans `catch`.
- Écouteurs d'événements : délégation d'événements, suppression quand l'élément disparaît.
- Accès DOM répétés dans des boucles : mettre en cache les références.
- `innerHTML` avec des données utilisateur : utiliser `textContent` ou nettoyer (risque XSS).
- `eval`, `document.write`, variables globales : à éliminer.
- `localStorage` : parser avec `try/catch` (JSON invalide), ne pas y stocker de données sensibles.
- Fonctions trop longues ou dupliquées : extraire ; `console.log` oubliés.

### Performance web
- Images dimensionnées, compressées, format moderne (WebP/AVIF), `loading="lazy"` hors écran.
- Scripts en `defer` ou en modules ; CSS critique non bloquant.
- Polices limitées en nombre et en graisses, `font-display: swap`.

---

## Priorisation des propositions

1. Bugs et failles de sécurité
2. Problèmes de performance mesurables
3. Robustesse et gestion d'erreurs
4. Lisibilité et duplication
5. Style et conventions (à regrouper en un seul commit)

Ne pas mélanger plusieurs catégories dans un même commit.