# VESTIAIRE — Prototype V0.1

Application personnelle indépendante (PWA) pour dressing et studio de tenues, construite avec HTML/CSS/JS natifs, sans framework, sans abonnement, sans serveur de stockage et sans compte.

## Fonctionnalités livrées

- Dressing avec ajout/modification/suppression de vêtements, photos optimisées en WebP, fiches : catégorie, couleur, matière, coupe, marque, taille, style, occasions, saisons et notes.
- Recherche et filtres par catégorie/occasion.
- Studio visuel structuré en cinq zones (haut, bas, veste, chaussures, accessoires) sur silhouette provisoire.
- Import depuis **Réglages → Mon mannequin** d'une image personnelle qui remplacera la silhouette provisoire sur le Studio et les miniatures.
- Placement tactile/souris des vêtements, réglage d'échelle, recentrage et retrait.
- Enregistrement de tenues avec nom, occasion, style, notes, positions/échelles et aperçu WebP.
- Édition et suppression de looks sauvegardés.
- IndexedDB local-first et mode de persistance demandé explicitement.
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

## Format de sauvegarde V0.1

Conteneur binaire spécifique : 4 octets `VST1`, longueur `uint32` (little-endian), manifeste JSON UTF-8, concaténation des blobs référencés. Le manifeste contient l'empreinte SHA-256 de chaque blob et les modèles `garments`, `outfits`, `prefs`. Le système vérifie la structure, les identifiants, les références de pièces et les hashes avant une restauration en une transaction IndexedDB.

Le fichier `.vestiaire` n'est **pas un ZIP** et n'est **pas chiffré**. Un futur chiffrement par mot de passe est prévu avant tout cloud distant. Garder des copies datées dans Fichiers/iCloud Drive et idéalement une autre destination indépendante. L'application ne peut pas garantir un export automatique dans iCloud depuis iOS.

## Architecture de stockage

| Donnée | Source d'autorité actuelle | Emplacement |
|---|---|---|
| Fiches vêtements | PWA | IndexedDB `garments` |
| Tenues (relations et positions) | PWA | IndexedDB `outfits` |
| Photos compressées/mannequin/aperçus | PWA | IndexedDB `media` |
| Préférences de mannequin | PWA | IndexedDB `prefs` |
| Sauvegardes manuelles | Propriétaire | Fichiers, iCloud Drive, Mac… |
| Code source | Projet | GitHub `Leomgl/Vestiaire-app` |
| Notifications / NEXUS LINK | Extension future | Workers gratuits si besoin |
| Cloudflare R2 | Non activé | Risque de dépassement facturé |

## Développement prévu

1. Remplacer la silhouette provisoire par le mannequin fourni et affiner les zones d'ancrage selon ses proportions.
2. Ajouter détourage assisté local, variantes de tenue, disponibilité/lavage et tags combinables.
3. Mettre en place le lien *opt-in* NEXUS (événements → suggestions de looks, tenue choisie → lien calendrier). Isoler les permissions et chiffrer les échanges.
4. Ajouter les interactions avec RITUEL et les recommandations météo ; l'absence de réseau n'empêchera pas d'utiliser la garde-robe.
5. Examiner une stratégie de sauvegarde distante **avec plafonnement applicatif strict** avant toute activation d'un produit facturé à l'usage.

## Limites connues

- Les photos de vêtements ne sont pas déformées pour épouser anatomiquement le mannequin : il s'agit d'un montage structuré et personnalisable, pas de virtual try-on.
- Le détouré n'est pas automatique en V0.1 : fournir de préférence des PNG/WebP transparents ou un sujet déjà détouré.
- Le rendu du mannequin provisoire dans la miniature d'une tenue est simplifié ; le mannequin importé est utilisé dans la miniature.
- Sur iPhone, IndexedDB reste susceptible d'effacement (quota, retrait de PWA, nettoyage du navigateur). **Toujours exporter régulièrement.**
- Test technique du parcours dans un navigateur Chromium avec stockage simulé ; pas encore de validation Safari iOS ni de tests de charge/photo 1 000 pièces.

## Tests réalisés (V0.1)

Parcours de simulation : ouverture → 7 pièces démo → sélection de 2 pièces dans le Studio → sauvegarde avec aperçu → bibliothèque → export complet → effacement → restauration : **succès**, aucune exception JavaScript pendant ce scénario. Le test automatisé utilise un environnement de stockage navigateur simulé et ne prouve pas à lui seul la fiabilité Safari/iOS ou la résistance aux pertes de données.
