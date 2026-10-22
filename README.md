# Urban Hair by Pauline

Base de site vitrine pour un salon de coiffure, avec une boutique et une galerie.

## Structure

- `frontend/` : application Angular (accueil, boutique, galerie)
- `backend/` : API REST Spring Boot (catalogue de produits et galerie)

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
mvn spring-boot:run
```

Dans un second terminal :

```bash
cd frontend
npm install
npm start
```

L’API écoute sur `http://localhost:8080/api`, l’application Angular sur `http://localhost:4200`.

Les données du catalogue et de la galerie sont actuellement des exemples en mémoire. Les images utilisent des URLs de démonstration à remplacer par les visuels du salon.
