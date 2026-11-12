# VESTIAIRE V0.7 — Studio tactile iPhone · FORGE #11

## Diagnostic (code V0.6)
Le Studio déplaçait déjà les calques au doigt ou à la souris, mais seul un curseur séparé sous l'aperçu pouvait régler leur échelle. Les actions de retrait/remplacement et la recherche parmi les pièces n'étaient pas accessibles sur le canevas. Le moteur de calibrage `fit-engine.js`, le stockage IndexedDB et le catalogue NEXUS LINK fonctionnaient indépendamment de cette interface.

## Changement ciblé
- Toucher/glisser une pièce : sélection + déplacement en pourcentage du canevas.
- Deux pointeurs : échelle basée sur leur distance initiale (45 à 190 %) et déplacement suivant le centre des doigts. Après relâchement d'un doigt, l'autre continue à déplacer la pièce sans saut.
- Barre d'actions flottante près de la pièce : « Remplacer » ouvre le dressing rapide sur la catégorie, « × » retire la couche de **la tenue en cours uniquement**.
- Recherche instantanée dans le dressing rapide et le panneau existant, sans perdre le focus, par nom/marque/matière/style/type/catégorie, accents tolérés. Pièces indisponibles toujours masquées sauf si déjà sélectionnées.
- Boutons rapides sous le canevas : sélectionner une pièce et sauvegarder. Superposition et contrôles de précision existants conservés dans le panneau inférieur.
- Les gestes modifient **seulement le brouillon en mémoire**, la sauvegarde du look demeure explicite.

## Contrats et données
Aucun changement de tables IndexedDB, clés, format `.vestiaire`, photo, mannequin, calcul des miniatures, IDs ou convention NEXUS LINK `vestiaire.catalog.v1`. Le catalogue chiffré reste opt-in, sans partage de photo, planning ou pièce détaillée. Aucun changement de NEXUS nécessaire. Référence côté NEXUS : `docs/VESTIAIRE-V021.md` dans `Leomgl/nexus-app`.

La feuille `v02.css` et `app.js` bénéficient d'un nouveau paramètre de version `0700`. Le service worker utilise `vestiaire-v07.0`. Pas de nouvelle URL d'asset dans la whitelist du Worker Cloudflare existant.

## Tests
- GitHub Actions : `node --check` sur JS et `node --test tests/*.test.cjs`.
- Tests dédiés : recherche insensible aux accents, filtre d'état, simulation Pointer Events sur un canevas, glissement et pincement, version des assets. Les tests NEXUS déjà existants doivent rester verts.
- **Non vérifié automatiquement** : rendu Safari iOS, vrais gestes multipoints sur iPhone, clavier/safe area, persistance de l'ancienne installation PWA, présentation avec les 67 looks Fits importés.

## Recette iPhone avant fermeture du ticket
1. Exporter une sauvegarde datée `.vestiaire` dans Fichiers, privée (export non chiffré).
2. Sur iPhone, ouvrir Studio ; choisir une pièce et la glisser, la pincer pour la réduire/agrandir, puis relâcher un doigt et continuer le déplacement.
3. Toucher « ⇄ » : remplacer par une autre pièce trouvée avec un nom, « lin » ou « chemise ». Vérifier aussi l'absence de résultats et l'ajout d'une couche.
4. Toucher « × » : seule la couche du brouillon disparaît, le dressing et les tenues déjà enregistrées restent intacts.
5. Sauvegarder, rouvrir la tenue et vérifier proportions, calques, ordre, opacité, miniature. Vérifier un ancien look Fits et le mannequin importé.
6. Depuis NEXUS, « Ouvrir dans Vestiaire » et un catalogue partagé après consentement : mêmes IDs/tenues/suggestions. Ne pas transmettre d'images.
7. Vérifier le mode hors-ligne après le chargement du nouveau cache et la réouverture de la PWA.

## Retour arrière
Ne pas réimporter d'anciennes données pour simplement annuler l'interface : rétablir les commits `app.js`, `v02.css`, `index.html`, `sw.js` de V0.6, republier et laisser le service worker migrer le cache. Les tenues et fiches restent intactes car aucune migration n'est exécutée.

## Statut
Changement préparé en PR pour revue ; ne pas marquer « Terminé » dans FORGE avant recette Safari/iPhone.
