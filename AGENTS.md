# Consignes du projet — Urban Hair by Pauline

Ce document décrit l’architecture et les choix visuels existants. Le consulter avant toute modification et le mettre à jour si l’architecture ou la charte évolue.

## Structure

- `frontend/` : application Angular standalone, écrite en TypeScript.
  - `src/app/app.component.ts` : coque du site public (bandeau, en-tête, navigation et pied de page).
  - `src/app/app.routes.ts` : routes et titres des pages.
  - `src/app/pages/` : pages `home`, `shop`, `gallery`, `admin-home`, `admin`, `admin-shop` et `admin-login`.
  - `src/app/data/` : services de données et garde d’accès à l’administration.
  - `src/styles.css` : styles globaux et charte visuelle publique et admin.
  - `public/images/` : ressources statiques, accessibles depuis `/images/...`.
- `backend/` : API REST Spring Boot en Java 17.
  - `src/main/java/fr/urbanhair/` : contrôleurs et domaines `product`, `gallery`, `admin`, `storage` et `config`.
  - `src/main/resources/schema.sql` : schéma de données.

## Routes et responsabilités

- `/` : accueil (`HomeComponent`).
- `/boutique` : catalogue (`ShopComponent`).
- `/galerie` : réalisations du salon (`GalleryComponent`), données par l’API.
- Le lien Administration du pied de page mène à `/admin/login` ou au tableau de bord protégé `/admin`. `/admin` présente les outils de gestion disponibles ; `/admin/galerie` ouvre la gestion de la galerie et `/admin/boutique` place les réglages globaux pliables et l’ajout de produit dans un panneau de gestion à gauche, avec le catalogue à droite. Chaque route de gestion est protégée par `adminGuard`.
- Les réalisations sont gérées dans des groupes titrés et décrits. Chaque groupe possède un ordre d’affichage et une photo de couverture ; ses photos ont leur propre ordre. Dans l’administration, le texte, la couverture et le tri se modifient depuis le groupe. La page publique affiche les couvertures dans une grille commune ; cliquer ouvre les photos du groupe dans l’ordre choisi avec le texte du groupe.
- Les produits sont persistés par le backend et gérés dans `/admin/boutique` (nom, catégorie, description, photo, prix TTC et promotionnel, SKU, marque, format, stock, publication, mise en avant et ordre). La boutique propose un panier, le retrait gratuit au salon et la livraison à tarif configuré ; le paiement unique par carte passe par Stripe Checkout. Les commandes et réservations de stock sont enregistrées côté backend, et le stock n’est décrémenté qu’après validation du webhook Stripe signé. Les réglages de livraison, retrait et notification sont dans l’administration.
- Le backend expose l’API sous `/api`. Le proxy Angular de développement relaie ces requêtes vers Spring Boot.
- Garder la logique d’accès aux données dans `frontend/src/app/data/` et la logique métier/API dans le backend. Ne pas intégrer de secrets dans le frontend ni dans Git.

## Charte graphique à préserver

Les variables de référence sont dans `frontend/src/styles.css` (`:root`) :

- Ivoire `#F1ECE5` (fond principal), noir doux `#171615`, pierre `#D8C9B6`, taupe `#B5A087` et blanc `#FFFFFF`.
- Titres : Cormorant Garamond ; textes et interface : Montserrat.
- Largeur de contenu : `1200px` ; espacement de section : `5rem` ; rayon de carte : `8px`.
- Direction générale : salon élégant, éditorial et sobre, avec fonds ivoire, tons naturels, contrastes noirs, grands titres serif et détails discrets.
- Préférer les variables CSS existantes aux nouvelles valeurs codées en dur. Si une nouvelle couleur ou mesure devient un choix partagé, créer une variable et mettre à jour ce document.
- Conserver les adaptations mobiles déjà prévues dans la feuille globale. Vérifier les grilles, la navigation et les formulaires sur petits écrans lors d’un changement de mise en page.
- Les styles d’administration sont également dans `styles.css` ; ils reprennent les tons naturels avec une barre latérale sombre et des surfaces claires. Maintenir des états lisibles pour succès, erreur, publication et focus.
- Les images sont importantes pour la présentation : utiliser `object-fit: cover` et des noms de fichiers descriptifs, minuscules, sans espaces ni accents.

## Conventions de changement

- Garder les composants cohérents avec les pages et services existants ; éviter de dupliquer la coque globale du site.
- Préserver la navigation Angular et les titres de route lors de l’ajout ou du renommage d’une page.
- Ne pas contourner `adminGuard` pour les fonctions de gestion. Les changements d’autorisation doivent être traités côté backend également.
- Pour toute évolution notable de structure ou de style, actualiser ce fichier afin qu’il reste une référence fidèle au projet.
