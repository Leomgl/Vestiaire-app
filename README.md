# VESTIAIRE — Prototype V0.3 (11 novembre 2026)

Application personnelle indépendante (PWA) pour dressing et studio de tenues, construite avec HTML/CSS/JS natifs, sans framework, sans abonnement, sans serveur de stockage et sans compte.

## Nouveautés V0.3 — Import privé Fits

- Studio structuré : plusieurs vêtements par zone avec des couches sélectionnables, ajustables et conservées dans les sauvegardes. Cela permet les superpositions (chemise + pull + veste, etc.).
- Réglages → **Importer depuis Fits** : lecture d'un export JSON personnel, prévisualisation, détection des doublons et import **additif** (ne supprime aucune donnée déjà enregistrée).
- Les photos sont demandées par le navigateur à Fits, avec repli possible vers un relais temporaire authentifié. Aucun transfert permanent vers GitHub, R2 ou D1.
- Les photos indisponibles sont remplacées par un visuel explicitement marqué « PHOTO À AJOUTER » ; les fiches et les tenues restent liées.
- Import atomique dans IndexedDB ; confirmation d'une sauvegarde VESTIAIRE demandée avant l'opération. Métadonnées d'origine Fits conservées pour permettre de futures évolutions.
- Export Fits privé : instantané chiffré AES-256-GCM servi temporairement depuis un Worker séparé, avec clé en fragment d'URL uniquement, non stockée dans le Worker. **Aucun export personnel n'est commité dans ce dépôt public.**

**Limites** : les positions exactes de collage Fits ne sont pas fournies par son connecteur ; les tenues sont initialement placées sur les zones du mannequin. Les collections Fits sont présentes dans l'export JSON mais leur interface native VESTIAIRE sera développée ultérieurement. Les téléchargements des photos restent à vérifier sur Safari réel.

## Nouveautés V0.2

- Dressing : six filtres combinables — occasion, style, saison, matière, couleur et disponibilité ; recherche et catégories conservées.
- Vêtements : quatre états — disponible, au lavage, au pressing, hors saison. Les articles indisponibles sont écartés des nouveaux choix dans le Studio.
- Looks : possibilité de créer une **variante** d'une tenue sans écraser l'original ; miniature et positions conservées.
- Planning : dates, occasions, notes, tenues associées et historique local ; suggestions basées sur l'occasion et la disponibilité, calculées sur l'appareil.
- **Migration non destructive** : la base IndexedDB passe de V1 à V2 en ajoutant la table `plans`. Les vêtements, images et tenues déjà enregistrés restent en place.
- Sauvegarde **format VST1 + manifeste v2** avec planning inclus ; la V0.2 accepte toujours les anciennes sauvegardes au format v1. **Une ancienne V0.1 ne sait pas restaurer un export v2.**
- PWA : nouvelle feuille de styles responsive, cache actualisé et Worker Cloudflare mis à jour.

La mise à jour n'active **aucune API NEXUS** et **n'envoie aucune photo** vers un serveur. La liaison calendrier NEXUS reste une étape future, après validation des interfaces et des autorisations.

## Fonctionnalités livrées

- Dressing avec ajout/modification/suppression de vêtements, photos optimisées en WebP, fiches : catégorie, couleur, matière, coupe, marque, taille, style, occasions, saisons et notes.
- Recherche et filtres combinables par catégorie, occasion, style, saison, matière, couleur et disponibilité.
- Studio visuel structuré en cinq zones (haut, bas, veste, chaussures, accessoires) sur silhouette provisoire.
- Import depuis **Réglages → Mon mannequin** d'une image personnelle qui remplacera la silhouette provisoire sur le Studio et les miniatures.
- Placement tactile/souris des vêtements, réglage d'échelle, recentrage et retrait.
- Enregistrement de tenues avec nom, occasion, style, notes, positions/échelles et aperçu WebP.
- Édition et suppression de looks sauvegardés.
- IndexedDB local-first (schéma V2), magasin `plans` pour dates prévues, et mode de persistance demandé explicitement.
- Export intégral `.vestiaire` (données + images + contrôles SHA-256), réimport vérifié avant le remplacement atomique de la base. Les sauvegardes **ne sont pas chiffrées** : les conserver dans un espace privé.
- Option pour injecter sept pièces *fictives* afin de tester le Studio sans photographier son dressing.
- Service Worker pour cache hors ligne sur HTTPS.

## Tester localement

Depuis le dossier décompressé :

```bash
python3 -m http.server 8000
```

Ouvrir `http://localhost:8000` dans un navigateur de bureau récent. **Ne pas ouvrir directement le fichier `index.html` depuis Fichiers** : certaines APIs, notamment IndexedDB et le service worker, peuvent être bloquées selon le navigateur.

Pour installation sur **iPhone**, l'application devra d'abord être publiée sur une origine HTTPS **indépendante** des autres PWA (par exemple un nouveau Worker Cloudflare servant les fichiers statiques). Le Worker Cloudflare `vestiaire-app` a été déployé sous https://vestiaire-app.q9pfwtztsc.workers.dev/. Voir [le guide de publication](edge-web/README.md). Ne pas utiliser une sous-page de `leomgl.github.io` comme frontière de sécurité avec NEXUS ou RITUEL.

## Format de sauvegarde (V0.2)

Conteneur binaire spécifique : 4 octets `VST1`, longueur `uint32` (little-endian), manifeste JSON UTF-8, concaténation des blobs référencés. Le manifeste contient l'empreinte SHA-256 de chaque blob et les modèles `garments`, `outfits`, `plans`, `prefs`. Les exports de V0.2 utilisent `format:2` ; les anciennes sauvegardes `format:1` restent importables. Le système vérifie la structure, les identifiants, les références de pièces et les hashes avant une restauration en une transaction IndexedDB.

Le fichier `.vestiaire` n'est **pas un ZIP** et n'est **pas chiffré**. Un futur chiffrement par mot de passe est prévu avant tout cloud distant. Garder des copies datées dans Fichiers/iCloud Drive et idéalement une autre destination indépendante. L'application ne peut pas garantir un export automatique dans iCloud depuis iOS.

## Architecture de stockage

| Donnée | Source d'autorité actuelle | Emplacement |
|---|---|---|
| Fiches vêtements | PWA | IndexedDB `garments` |
| Tenues (relations et positions) | PWA | IndexedDB `outfits` |
| Planning local | PWA | IndexedDB `plans` |
| Photos compressées/mannequin/aperçus | PWA | IndexedDB `media` |
| Préférences de mannequin | PWA | IndexedDB `prefs` |
| Sauvegardes manuelles | Propriétaire | Fichiers, iCloud Drive, Mac… |
| Code source | Projet | GitHub `Leomgl/Vestiaire-app` |
| Notifications / NEXUS LINK | Extension future | Workers gratuits si besoin |
| Cloudflare R2 | Non activé | Risque de dépassement facturé |

## Développement prévu

1. Valider sur iPhone les nouveaux filtres, les variantes et le planning ; remplacer la silhouette provisoire par le mannequin fourni et ajuster ses zones d'ancrage.
2. Ajouter détourage assisté local, variantes de catégories, favoris et tags combinables ; améliorer les performances lorsque le dressing contient beaucoup de photos.
3. Mettre en place le lien *opt-in* NEXUS (événements → suggestions de looks, tenue choisie → lien calendrier). Isoler les permissions et chiffrer les échanges.
4. Ajouter les interactions avec RITUEL et les recommandations météo ; l'absence de réseau n'empêchera pas d'utiliser la garde-robe.
5. Examiner une stratégie de sauvegarde distante **avec plafonnement applicatif strict** avant toute activation d'un produit facturé à l'usage.

## Limites connues

- Les photos de vêtements ne sont pas déformées pour épouser anatomiquement le mannequin : il s'agit d'un montage structuré et personnalisable, pas de virtual try-on.
- Le détouré n'est pas automatique en V0.1 : fournir de préférence des PNG/WebP transparents ou un sujet déjà détouré.
- Le rendu du mannequin provisoire dans la miniature d'une tenue est simplifié ; le mannequin importé est utilisé dans la miniature.
- Sur iPhone, IndexedDB reste susceptible d'effacement (quota, retrait de PWA, nettoyage du navigateur). **Toujours exporter régulièrement.**
- Test technique du parcours dans un navigateur Chromium avec stockage simulé ; pas encore de validation Safari iOS ni de tests de charge/photo 1 000 pièces.

## Tests réalisés (V0.1 puis V0.2)

Parcours de simulation : ouverture → 7 pièces démo → sélection de 2 pièces dans le Studio → sauvegarde avec aperçu → bibliothèque → export complet → effacement → restauration : **succès**, aucune exception JavaScript pendant ce scénario. Le test automatisé utilise un environnement de stockage navigateur simulé et ne prouve pas à lui seul la fiabilité Safari/iOS ou la résistance aux pertes de données.


### Vérifications V0.2 (11/11/2026)

- Analyse syntaxique du JavaScript après chaque changement.
- Test de migration dans un IndexedDB simulé : les anciennes fiches et tenues sont conservées, le magasin `plans` est créé.
- Test d'ajout d'un planning avec date et note, et affichage dans les suggestions.
- Test de changement d'état d'un vêtement sans perdre sa photo et avertissement dans le planning.
- Test de préparation d'une variante à partir d'une tenue existante.
- Tests de validation des dates (y compris années bissextiles) et classement des suggestions par occasion/disponibilité.
- Vérification du cache PWA, de la liste des fichiers autorisés et du redéploiement du Worker sans bindings payants.

**À confirmer sur le vrai iPhone :** migration locale réelle, navigation mobile à six onglets, export/restauration complète `format:2`, comportement des gestes du Studio après mise à jour. Ces tests simulés ne remplacent pas la validation Safari iOS.

Voir aussi [les notes de version et la checklist de recette](docs/V02-RELEASE.md).
