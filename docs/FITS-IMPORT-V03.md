# VESTIAIRE V0.3 — Import Fits, Studio multicouches

Date : 11 novembre 2026. Application indépendante de NEXUS, GAMING et RITUEL.

## Fonctionnalités

- Studio : couches superposables par zone (jusqu'à huit couches), sélection, ajustement et sauvegarde des positions de chaque pièce.
- Réglages → Importer depuis Fits : fichier JSON `fits-vestiaire-v1`.
- Vérification des données, aperçu des vêtements, tenues et liens photo ; confirmation de sauvegarde préalable.
- Import **non destructif** : conserve le dressing actuel, ignore les doublons déjà identifiés par ID Fits et écrit toutes les données importées dans une transaction IndexedDB.
- Photos : téléchargement direct de la source Fits depuis le navigateur ; relais temporaire chiffré/authentifié si l'accès direct est bloqué par CORS ; compression locale en WebP. À défaut : visuel à remplacer.
- Import des tenues avec liens vers les bonnes pièces et plusieurs couches ; génération de miniatures locales.
- Métadonnées Fits (marque, couleur, matières, prix, saisons et identifiants source) conservées dans les fiches.
- Les collections sont **préservées dans le fichier source**, mais pas encore affichées dans une interface dédiée VESTIAIRE.

## Export privé depuis Fits

Le connecteur Fits permet de récupérer les fiches et les références de photos. Pour un export complet, interroger la liste par pages (ex. 30 pièces) : les longues listes renvoient parfois moins de liens photo.

L'outil de transfert temporaire `vestiaire-fits-bridge` est déployé hors GitHub :
- instantané personnel chiffré AES-256-GCM dans le Worker, clé de déchiffrement uniquement dans le fragment d'URL fourni individuellement au propriétaire ;
- seul le navigateur télécharge et déchiffre l'export, sans transmettre la clé au serveur ;
- relais des images sans stockage, via POST authentifié, limité au domaine `mcp.fits-app.com` et à l'origine `vestiaire-app.q9pfwtztsc.workers.dev` ;
- expiration prévue après quatorze jours : le Worker renvoie HTTP 410. Il doit ensuite être supprimé du compte Cloudflare ;
- aucun bucket R2, aucune base D1, aucun KV, aucune dépense de stockage supplémentaire.

Ne jamais committer le fichier JSON personnel, le token, le lien privé ou le secret de déchiffrement sur GitHub.

## Checklist iPhone

1. Fermer et rouvrir la PWA ; vérifier que le pied de la barre latérale indique V0.3.
2. Réglages → Exporter une sauvegarde `.vestiaire` et vérifier la présence du fichier.
3. Ouvrir le lien de transfert personnel dans Safari, cliquer sur Télécharger mon export Fits et enregistrer le JSON dans Fichiers.
4. VESTIAIRE → Réglages → Importer depuis Fits. Vérifier les décomptes et les doublons affichés.
5. Cocher « J'ai exporté une sauvegarde » et laisser la récupération des images activée.
6. Valider l'importation ; ne pas fermer la PWA pendant l'opération.
7. Vérifier le résumé de photos réellement obtenues ; contrôler quelques vêtements, les superpositions et les tenues.
8. Refaires une sauvegarde VESTIAIRE après import. Ne pas désinstaller Fits avant vérification complète.
9. Après importation confirmée, demander la suppression du Worker temporaire.

## Tests

- JavaScript de l'application et de l'importateur vérifié syntaxiquement.
- Test d'import avec trois pièces dont deux hauts dans la même tenue : les trois pièces sont liées, la composition a deux couches top et une couche bottom ; les vêtements existants sont préservés.
- Déploiement Worker principal et Worker chiffré vérifiés via API Cloudflare, chacun sans bindings.
- **Test encore nécessaire sur le véritable iPhone** : récupération 98 images, CORS/proxy, stabilité mémoire IndexedDB, confort tactile dans le Studio, déduplication sur un deuxième import.

## Architecture

PWA local-first (IndexedDB) ; code GitHub public ; Worker principal pour diffusion statique ; Worker séparé de transfert éphémère chiffré. Aucun stockage média permanent sur Cloudflare.
