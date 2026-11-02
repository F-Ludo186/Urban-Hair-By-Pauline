# Urban Hair by Pauline

Base de site vitrine pour un salon de coiffure, avec une boutique et une galerie.

## Structure

- `frontend/` : application Angular (accueil, boutique, galerie)
- `backend/` : API REST Spring Boot (catalogue de produits et galerie)

## Images et logos

Les fichiers statiques du site sont à déposer dans `frontend/public/`. Angular les copie à la racine du site lors du démarrage et du build.

```text
frontend/public/
└── images/
    ├── gallery/   # Réalisations du salon
    ├── logos/     # Logo et variantes
    ├── products/  # Photos des produits
    └── salon/     # Photos des espaces du salon
```

Exemple : `frontend/public/images/gallery/balayage-miel.jpg` sera accessible dans l’application avec l’URL `/images/gallery/balayage-miel.jpg`. Utilisez des noms de fichiers descriptifs, en minuscules, sans espaces ni accents. Les images de la galerie affichées actuellement restent gérées par l’API backend ; cette arborescence est prête pour y déposer les visuels avant leur branchement.

## Démarrage

Prérequis : Node.js 20.19+, Java 17+ et Maven 3.6+.

Sous Windows, si `mvn` n’est pas reconnu, installez Maven dans PowerShell :

```powershell
winget install --id Apache.Maven -e
```

Fermez complètement puis rouvrez VS Code pour actualiser son `PATH`, puis vérifiez avec `mvn -version`.

Si `winget` ne fonctionne pas, téléchargez l’archive **Binary zip** depuis [Apache Maven](https://maven.apache.org/download.cgi), décompressez-la dans `C:\Tools`, puis ajoutez le dossier `bin` de Maven au `PATH` Windows (ex. `C:\Tools\apache-maven-3.9.16\bin`). Rouvrez VS Code et vérifiez avec `mvn -version`.

```bash
cd backend
mvn.cmd spring-boot:run
```

Dans un second terminal :

```bash
cd frontend
npm.cmd install
npm.cmd start
```

Sous PowerShell, `npm.cmd` évite le blocage de la stratégie d’exécution des scripts. L’API écoute sur `http://localhost:8080/api`, l’application Angular sur `http://localhost:4200`. Le serveur Angular redirige automatiquement les requêtes `/api` vers Spring Boot.

## Administration de la galerie

L’administration est accessible depuis le lien du pied de page ou via `http://localhost:4200/admin`. Le tableau de bord présente les espaces de gestion disponibles ; la galerie se trouve dans `http://localhost:4200/admin/galerie`. Elle permet d’ajouter des photos à un groupe, puis de gérer les groupes : modifier leur titre et leur texte, choisir leur photo de couverture, réordonner les photos du groupe et réordonner les groupes. Chaque groupe s’affiche comme une vignette dans la grille publique ; un clic ouvre ses photos dans l’ordre choisi et affiche le texte du groupe. Supprimer un groupe conserve ses photos.

La boutique est administrable depuis `http://localhost:4200/admin/boutique`. Les fiches produit comportent nom, catégorie, description, photo, prix TTC, promotion facultative, référence, marque, format, quantité en stock facultative, publication, mise en avant et ordre d’affichage. Les produits publiés apparaissent dans le catalogue public ; le bouton de contact par e-mail reste actif tant qu’aucun paiement en ligne n’est configuré. Les produits et les images téléversées sont conservés avec les données de galerie.

Avant de lancer le backend, configurez un identifiant et un mot de passe réservés à l’administratrice. Dans PowerShell :

```powershell
$env:ADMIN_USERNAME = "pauline"
$env:ADMIN_PASSWORD = "P/auline2203"
cd backend
mvn spring-boot:run
```

Choisissez un mot de passe personnel d’au moins 12 caractères ; ne le mettez jamais dans le code ni dans Git. Sans ces variables, l’API publique fonctionne, mais aucune connexion administrateur n’est possible.

Les informations de galerie sont conservées dans la base H2 locale `backend/data/urbanhair.mv.db` et les photos optimisées dans `backend/data/images/`. Sauvegardez ces deux éléments ensemble. Les téléversements acceptent les images JPG/PNG de 10 Mo maximum ; le serveur vérifie leur contenu, les réencode et les redimensionne.

Le stockage d’images est isolé derrière l’interface Java `ImageStorage` et son implémentation locale `LocalImageStorage`. Le fournisseur local est sélectionné par défaut avec `IMAGE_STORAGE_PROVIDER=local`. Pour passer à un stockage en ligne, ajoutez une implémentation de `ImageStorage` et sa configuration Spring ; les écrans et la gestion de la galerie n’ont pas à connaître le service choisi. `IMAGE_STORAGE_PATH` permet déjà de déplacer le stockage local. La base peut également être remplacée via `DATABASE_URL`, `DATABASE_USERNAME` et `DATABASE_PASSWORD`.

Avant toute mise en ligne, utilisez HTTPS, définissez `COOKIE_SECURE=true`, configurez `FRONTEND_ORIGIN` avec l’adresse exacte du site et protégez les secrets d’administration et de base de données dans les variables d’environnement de l’hébergeur. L’application doit être publiée derrière une même origine HTTPS (site et `/api`) pour conserver une configuration de session simple et sûre. Configurez aussi une limitation des tentatives de connexion à `/api/admin/login` sur l’hébergeur ou son reverse proxy.
