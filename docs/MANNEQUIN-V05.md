# VESTIAIRE V0.5 — Mannequin de référence

**Date :** 11 novembre 2026
**Statut :** géométrie intégrée au moteur ; validation visuelle iPhone à réaliser
**Mannequin :** portrait frontal personnel 1024×1536 pixels, ratio 2:3. L'image reste sur l'iPhone.

## Correction majeure

Avant la V0.5, `.mannequin` utilisait `inset:3% 19% 5%` et `object-fit:contain` : le modèle 2:3 était réduit à environ 62% du canevas en largeur, puis recentré verticalement. Les vêtements étaient pourtant posés sur les 100% du canevas.

Désormais, en mode `reference-v05` : la photo occupe la pleine hauteur du canevas 4:5, centrée horizontalement. La partie visible de l'image occupe environ **83,33%** de la largeur du canevas, avec ~8,33% de marge latérale. Les positions calculées sur le portrait sont ainsi cohérentes dans le Studio **et** dans les miniatures exportées.

## Landmarks du portrait, coordonnées exprimées en % de hauteur de l'image entière

| Repère | X | Y |
|---|---:|---:|
| Haut de tête | 50 | 6 |
| Cou | 50 | 18 |
| Épaules | 50 | 21 |
| Poitrine | 50 | 28 |
| Taille | 50 | 45 |
| Hanches | 50 | 50 |
| Entrejambe | 50 | 56 |
| Genoux | 50 | 73 |
| Chevilles | 50 | 88 |
| Pieds | 50 | 93 |

Ce sont des *points d'ancrage de design*, pas une estimation biométrique certifiée : le calage final doit être validé à l'écran à partir des vêtements effectivement possédés.

## Repères de vêtements (x/y/w/h en % du canevas 4:5)

| Pièce | X | Y | Largeur | Hauteur |
|---|---:|---:|---:|---:|
| T-shirt | 50 | 31 | 38 | 31 |
| Chemise | 50 | 32 | 39 | 31 |
| Pull | 50 | 33 | 42 | 34 |
| Veste | 50 | 34 | 43 | 36 |
| Manteau | 50 | 40 | 45 | 51 |
| Pantalon | 50 | 68 | 36 | 43 |
| Ceinture | 50 | 46 | 29 | 6 |
| Chaussures | 50 | 92 | 37 | 14 |

Voir `fit-engine.js` pour tous les autres sous-types (polo, hoodie, écharpe, lunettes, bonnet, montre, sac, etc.).

## Activer sur iPhone

1. Ouvrir VESTIAIRE et confirmer **V0.5**.
2. Dans **Réglages → Ton mannequin**, importer la photo originale 1024×1536 depuis Photos ou Fichiers. Si elle avait déjà été importée, activer **Utiliser les repères de référence**.
3. Dans le Studio, activer **Voir les repères** pour contrôler visuellement les points.
4. Faire une sauvegarde `.vestiaire` dans Fichiers.
5. Dans **Mes tenues → Recaler mes looks Fits**, lancer le recalage pour reconstruire les anciennes compositions avec le profil `reference-v05`. Il fonctionne même si un recalage V0.4 avait déjà été effectué.
6. Examiner quelques looks caractéristiques (Fits 54/55/56/57) et ajuster localement les pièces spécifiques.
7. Exporter une nouvelle sauvegarde après le traitement.

## Données / sécurité

- Aucun mannequin n'est présent dans le GitHub public ; seule la table numérique d'ancrages est versionnée.
- L'image du mannequin est stockée dans IndexedDB et reprise par les sauvegardes manuelles.
- Les profils ne sont activés que par l'interface Réglages (ou automatiquement après import local d'un portrait au ratio 2:3).
- Anciennes données conservées ; le recalage de masse est volontaire, versionné, et l'annulation des tenues non modifiées reste possible.
- RITUEL, GAMING, NEXUS : aucun changement.
- Le fond blanc de certaines images de vêtements importées reste un problème distinct du calibrage et n'est pas automatiquement effacé.

## Tests techniques

- Correspondance CSS et Canvas au ratio du canevas 4:5.
- Sous-types : géométrie de référence en mode activé, valeurs V0.4 conservées en mode désactivé.
- Recalage V0.4 → V0.5, conservation des références de pièces et possibilité de retour arrière.
- Scripts et liste des ressources statiques validés, déploiement de la PWA vérifié via Cloudflare.

**À confirmer sur le vrai iPhone** : proportions visuelles, éventuels artefacts de fonds blancs, taille de la photo importée et rendu des tenues composées.
