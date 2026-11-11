# VESTIAIRE V0.4 — Correctifs du Studio et des imports Fits

**Date :** 11 novembre 2026  
**Dépôt :** `Leomgl/Vestiaire-app`  
**Application :** https://vestiaire-app.q9pfwtztsc.workers.dev/

## Problèmes observés sur iPhone

- Ceintures à hauteur de tête : toutes les pièces `accessory` partageaient une zone générique `y=24%`.
- Vestes surdimensionnées : mêmes largeur et hauteur indépendamment du type.
- Pantalons trop courts : zone d'affichage de seulement 33% de hauteur.
- Superpositions : un haut pouvait être masqué par un autre, sans moyen simple d'ajuster le rendu.
- Les miniatures importées étaient pré-calculées avec l'ancienne géométrie.

## Correctifs développés

`fit-engine.js` contient les règles de pose, indépendantes du contenu personnel :
- ceinture : x=50, y=52, largeur=43, hauteur=8 ;
- pantalon : x=50, y=70, largeur=42, hauteur=46 ;
- veste : x=50, y=35, largeur=42, hauteur=36 ;
- manteau : x=50, y=42, largeur=44, hauteur=50 ;
- chaussures : x=50, y=93, largeur=45, hauteur=17.

Les autres sous-types ont leurs propres ancrages. L'ordre est déterminé par le sous-type de vêtement plutôt que par le rang d'import. Réglage manuel de l'ordre et de l'opacité disponible.

### Recalage des looks Fits déjà importés

1. Exporter une sauvegarde VESTIAIRE complète dans Fichiers, vérifier le fichier.
2. Mettre à jour l'app (fermer/réouvrir) et confirmer la V0.4.
3. Ouvrir **Mes tenues → Recaler mes looks Fits**, ou le même bouton dans **Réglages**.
4. Confirmer la sauvegarde puis lancer le recalage.
5. L'opération analyse les images en local (uniquement les marges transparentes), ordonne les couches, applique les ancrages et régénère les miniatures.
6. Le traitement est préparé avant l'écriture. Une transaction IndexedDB écrit ensuite les changements ensemble. Si le traitement échoue avant le commit, les compositions d'origine restent intactes.
7. Revoir les miniatures, ouvrir des tenues et corriger les rares cas particuliers avec le Studio.
8. Exporter une nouvelle sauvegarde après validation.

**Annuler les recalages non modifiés** restaure les anciens placements et aperçus des looks qui n'ont pas été manuellement enregistrés depuis. Les images originales restent archivées localement.

## Confidentialité et stockage

- Pas de réimport Fits requis : les vêtements et tenues existent déjà dans IndexedDB.
- Les images d'origine restent présentes ; les images recadrées et nouvelles miniatures sont enregistrées localement.
- Le volume local peut donc augmenter. Le traitement n'envoie aucune image à Cloudflare.
- Aucun stockage R2, D1 ou KV supplémentaire.
- La sauvegarde `.vestiaire` n'est pas chiffrée et doit rester privée.

## Vérification

- Classification, ancrages et ordre de 9 types de vêtements : tests JS réussis.
- Chemise/pull : la chemise est bien posée sous le pull.
- Ceinture initialement placée à la tête : recalage vers la taille, vignette régénérée, image originale conservée.
- Retour arrière testé sur base simulée : positions et miniature anciennes restaurées.
- Futur import Fits simulé : les nouveaux looks sont créés avec les ancrages corrigés.

**Reste à valider sur Safari iPhone :** confort tactile, résultat visuel des 67 looks importés, temps de recadrage des images et espace de stockage. Les tests synthétiques n'ont pas accès aux photos locales de l'utilisateur.

## Suite

Après retour visuel, ajuster les profils sur le mannequin personnel fourni, travailler les accessoires particuliers et simplifier la mise en page du Studio. La connexion NEXUS/RITUEL reste hors de ce correctif.
