# VESTIAIRE V0.7.1 — Studio et catalogue NEXUS complet
Date : 12 novembre 2026. Suite de FORGE #11.

## Studio iPhone
- ✓ dans la barre flottante confirme visuellement la position du vêtement (désélectionne et masque les contrôles contextuels), **sans enregistrer la tenue** ; l'enregistrement global demeure explicite.
- La barre « Choisir une zone » est maintenant immédiatement **au-dessus du mannequin**, dans le même encart, pour éviter les allers-retours vers l'ancien panneau sous le canevas.
- Le ⇄ de remplacement, le × de retrait, les gestes de pincement et de déplacement, les calques et le mannequin ne changent pas.
- Pas de migration ni de modification des tenues déjà sauvegardées.

## NEXUS LINK — catalogue complet en lots chiffrés
Avant cette version, la limite de 24 tenues était **volontaire** dans Vestiaire ET Nexus. Il ne s'agissait pas d'un bug de connexion.

**Protocole V2 :** le lien déjà jumelé (scope `outfit_catalog`) envoie des événements `vestiaire.catalog.page.v2` portant `batchId`, `revision`, `pageIndex`, `pageCount`, `total`, `sharedAt`, et jusqu'à 24 résumés de tenues. Chaque message reste AES-GCM, limite de taille pré-vérifiée à 5500 octets. Le relais existant accepte 250 événements chiffrés non acquittés par connexion, l'application limite un envoi à 200 pages pour ne pas saturer. Si cette limite exceptionnelle est atteinte, l'app **signale l'échec** au lieu de synchroniser silencieusement un catalogue partiel. Aucune photo, nom de vêtement détaillé, mannequin, note, événement ou localisation transmis.

La révision d'un transfert est réservée et enregistrée **avant** le premier lot. En cas de coupure, une nouvelle tentative utilise une révision plus récente : les deux versions ne se mélangent pas. Une empreinte SHA-256 locale évite les renvois automatiques inutiles. Les données utilisateur restent exclusivement dans IndexedDB local ; le relais stocke temporairement les messages chiffrés.

**Nexus V0.21.8 minimum** obligatoire pour recevoir le format V2. Nexus conserve le précédent catalogue actif pendant un transfert partiel, conserve les lots reçus dans `vestiaireTransfers[]` avec vérification de persistance avant acquittement, dédoublonne et active le nouveau catalogue uniquement quand les pages sont complètes. Le format V1 reste lisible pendant la transition ; aucun réappairage ni nouvel appel Worker nécessaire.

## Recette sur les deux PWA iPhone
1. Faire un export privé `.vestiaire` et une sauvegarde Nexus ; ne pas désinstaller les PWA et ne pas effacer Safari.
2. Ouvrir **Nexus V0.21.8** en premier et contrôler la version. Ouvrir ensuite Vestiaire V0.7.1.
3. Vérifier ✓ puis sélectionner une autre pièce, ainsi que la ligne « Choisir une zone » immédiatement avant le mannequin.
4. Dans Vestiaire → Réglages → Nexus, vérifier le **nombre total** de tenues et le nombre de lots, puis déclencher « Envoyer mes tenues ».
5. Dans Nexus → Réglages → Vestiaire, appuyer sur « Recevoir » et vérifier le total. Si une progression X/Y reste visible, appuyer à nouveau jusqu'à la réception complète.
6. Vérifier une tenue anciennement hors des 24 premières dans une suggestion ou un deep link ; vérifier les choix existants liés aux rendez-vous.
7. Changer une tenue dans Vestiaire, renvoyer, puis contrôler l'actualisation du catalogue sans doublon et sans photo.

## Repli
Si les lots restent bloqués, revenir à la dernière version compatible **des deux applications** avant de tenter un nouvel envoi ; ne pas réinitialiser la base locale ni la connexion LINK. Les lots incomplets ne doivent pas remplacer les tenues connues côté Nexus.

## Tests
Node/CI : syntaxe, catalogue complet 81 tenues, 51 tenues et transfert interrompu/rejoué, réception Nexus 61 tenues en 3 pages, persistance/ack, compatibilité V1, tests de confidentialité. Les tests navigateur Safari iPhone restent à effectuer par le propriétaire.
