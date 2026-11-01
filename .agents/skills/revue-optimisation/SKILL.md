---
name: revue-optimisation
description: Audite l'ensemble du code du dépôt (Java Spring Boot, Angular, HTML/CSS/JS), propose des optimisations, les teste une par une et applique uniquement celles validées par les tests. À utiliser pour une revue complète, un nettoyage, une optimisation ou un refactoring du projet.
---

# Revue complète et optimisation validée

## Règles de sécurité (non négociables)
- Travailler sur une branche dédiée `review/optimisations` ; ne jamais commiter ni pousser sur main/master.
- Ne jamais supprimer de fichier. Si un fichier semble inutile, le signaler dans le rapport.
- Ne jamais lancer de commande destructive (rm -rf, git reset --hard, git push --force).
- Une seule optimisation à la fois, un commit par optimisation.
- Ne pas modifier le comportement fonctionnel : une optimisation ne doit changer ni les entrées/sorties ni l'interface publique.

## Étape 1 : Cartographier
1. Lister les fichiers source (hors node_modules, target, build, dist, bin, obj, .git).
2. Identifier les technologies, la commande de build et la commande de tests (voir le tableau dans `references/grille.md`).
3. Lancer build et tests AVANT toute modification et noter le résultat de référence.
   Si le projet n'a pas de tests, le signaler et limiter les changements aux optimisations
   dont l'équivalence est évidente (le build doit au minimum passer).

## Étape 1 bis : Démarrer l'application
- Ne jamais lire, afficher, copier ni modifier `scripts/dev.env.ps1` : il contient des identifiants.
  Ne jamais le commiter ni citer son contenu dans un rapport ou un message de commit.
- Si ce fichier est absent, s'arrêter et demander à l'utilisateur de le créer
  à partir de `scripts/dev.env.example.ps1`.
- Si l'application n'est pas déjà lancée, exécuter :
  `powershell -ExecutionPolicy Bypass -File scripts/dev-start.ps1`
  (ouvre deux terminaux : Java et `npm.cmd start`) et attendre que le script indique que les ports sont prêts.
- Ne pas relancer si les ports répondent déjà.
- À la fin de la revue, exécuter `scripts/dev-stop.ps1` uniquement si c'est l'agent qui a démarré l'application.
- Exception aux règles de sécurité : `dev-start.ps1` et `dev-stop.ps1` sont les seuls scripts autorisés à lancer ou arrêter des processus.

## Étape 2 : Auditer tout le code
Parcourir chaque fichier source avec `references/grille.md` (lire seulement les sections
correspondant aux technologies détectées).

## Étape 3 : Proposer
Produire une liste numérotée. Pour chaque proposition : fichier:ligne, problème,
correctif envisagé, gain attendu, risque (faible / moyen / élevé).
Trier selon la priorisation indiquée en fin de grille.

## Étape 4 : Tester puis appliquer, une par une
Pour chaque proposition, dans l'ordre :
1. Appliquer le changement.
2. Lancer build + tests (+ lint si présent).
3. Si tout passe et que le comportement est inchangé : commit
   `optim(<fichier>): <résumé>` et marquer ACCEPTÉE.
4. Sinon : annuler uniquement ce changement (`git checkout -- <fichier>`) et marquer REJETÉE avec la raison.
Les propositions à risque élevé ou marquées [VALIDATION] ne sont jamais appliquées sans accord de l'utilisateur.

## Étape 5 : Rapport final
- Tableau : proposition / statut (acceptée, rejetée, à valider) / raison
- Résultats des tests avant et après
- Points signalés mais non traités (fichiers inutiles, bugs hors périmètre)
- Rappel : la branche est prête pour relecture, rien n'a été fusionné.