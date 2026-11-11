# VESTIAIRE V0.2 — Notes de version

**Date :** 11 novembre 2026  
**Application :** https://vestiaire-app.q9pfwtztsc.workers.dev/  
**Dépôt :** https://github.com/Leomgl/Vestiaire-app  
**Portée :** VESTIAIRE uniquement. NEXUS, RITUEL et Gaming ne sont pas modifiés.

## Livré

1. Dressing : recherche et six filtres combinables (occasions, styles, saisons, matières, couleurs, disponibilité).
2. État de chaque vêtement : disponible, au lavage, au pressing, hors saison.
3. Studio : les pièces indisponibles ne sont pas proposées pour les nouvelles compositions ; les tenues déjà enregistrées restent intactes.
4. Tenues : bouton **Dupliquer en variante**, avec héritage des positions et lien logique à la tenue source ; la nouvelle tenue ne remplace pas l'originale.
5. Planning local : choix de date, tenue, occasion, note ; liste des prochaines tenues, historique, suggestions adaptées à l'occasion.
6. Accueil : prochain look prévu ou raccourci vers le planning.
7. Stockage : IndexedDB `vestiaire-local-v1` passe de version **1 à 2** (ajout du store `plans` sans suppression des stores existants). Les données locales restent sur l'appareil.
8. Sauvegardes : extension du conteneur VST1, `header.format=2`, métadonnées de planning incluses ; les exports V0.1 restent importables par V0.2.
9. PWA : nouveau style `v02.css`, nouvel onglet Planning, cache `vestiaire-v02.0`, Worker `vestiaire-app` mis à jour sur la liste blanche de fichiers.

## Stockage & confidentialité

- Toujours **aucun upload** de photo, mannequin, look ou planning.
- Le Worker Cloudflare ne sert que le code de l'app depuis le dépôt public GitHub ; zéro binding R2/D1/KV.
- Les données personnelles vivent dans IndexedDB (stockage de chaque installation).
- La sauvegarde `.vestiaire` est locale, complète mais **non chiffrée** : la conserver dans Fichiers/iCloud Drive privé ou sur un Mac ; ne pas committer le fichier.
- L'ouverture de la V0.2 déclenche une montée de version d'IndexedDB non destructive. Si un ancien onglet bloque la migration, fermer tous les onglets VESTIAIRE puis relancer l'application.

## Checklist iPhone à faire lors du prochain point

- [ ] Fermer puis rouvrir VESTIAIRE depuis l'écran d'accueil. Vérifier `V0.2`.
- [ ] Vérifier que les vêtements, photos et tenues V0.1 sont toujours présents.
- [ ] Dressing : filtrer par matière, couleur, style, occasion, saison, disponibilité et combiner deux filtres.
- [ ] Modifier un vêtement → `Au lavage`. Vérifier le badge sur sa carte et son exclusion dans le Studio.
- [ ] Ouvrir une tenue → `Dupliquer en variante`, modifier une pièce, enregistrer sous un nouveau nom ; confirmer que l'original reste intact.
- [ ] Onglet Planning : planifier un look à une date, modifier l'occasion et vérifier l'affichage sur l'accueil.
- [ ] Vérifier les suggestions `Restaurant` et l'avertissement sur les vêtements indisponibles.
- [ ] Réglages → exporter une nouvelle sauvegarde ; **vérifier la présence du fichier dans Fichiers**.
- [ ] Optionnel et uniquement avec une copie fiable : tester une restauration sur une installation de test, **pas sur les seules données de production**.
- [ ] Confirmer l'ergonomie des six boutons de navigation et les gestes du Studio.

## Tests automatisés / simulés

- Analyse syntaxique JavaScript OK.
- Ancienne base V0.1 simulée : données conservées et store `plans` créé.
- Date valide/invalide, leap-year, classement des suggestions et exclusion des pièces indisponibles : OK.
- Ajout d'une date, édition d'un statut, préparation d'une variante, rendu de la page Planning : OK avec environnement DOM + IndexedDB simulé.
- Worker Cloudflare : déploiement API réussi, `workers.dev` activé, **aucun binding**.

Les tests ne constituent **pas encore** une preuve de compatibilité iPhone/Safari réelle pour la V0.2. L'utilisateur a déjà confirmé que la V0.1 fonctionne sur son iPhone.

## Étapes suivantes (après validation ensemble)

1. Intégration du mannequin personnel et réglages de placement.
2. Affinage de l'expérience Studio et du détourage.
3. Filtres/tags personnalisables, favoris, disponibilité plus avancée et variantes.
4. Lien opt-in avec le calendrier NEXUS via protocole chiffré et permissions distinctes.
5. Liaison ultérieure avec RITUEL ; Gaming reste séparé.

**Pas de modification de NEXUS ou de RITUEL avant revue de l'architecture d'échange.**
