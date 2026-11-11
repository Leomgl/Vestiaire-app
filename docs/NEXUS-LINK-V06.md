# VESTIAIRE V0.6 — NEXUS LINK, suggestions de tenues

> Code GitHub et Worker de diffusion mis à jour le 11/11/2026. Tests automatisés en place. Validation de bout en bout sur deux PWA iPhone encore nécessaire.
> Référence NEXUS : https://github.com/Leomgl/nexus-app/blob/main/docs/VESTIAIRE-V021.md

## Rôle et confidentialité

Vestiaire conserve **exclusivement sur l'appareil** les photos, vêtements, mannequin, tenues détaillées et planning. Il ne reçoit **aucun** rendez-vous, contact ou emplacement GPS de NEXUS.

NEXUS et Vestiaire ne partagent que sur consentement un **résumé de tenues** (ID opaque, nom, occasion, style, disponibilité, indice de chaleur 0–3) via NEXUS LINK chiffré AES-GCM, relayé par Cloudflare. Le relais n'a pas la clé des données. Aucune photo, pièce de vêtement ni miniature n'est transmise.

- Au plus **24 looks** (les plus récents), limite de taille du message. Les autres looks restent privés/non publiés. L'interface indique le nombre omis.
- Une tenue avec une pièce au lavage, au pressing ou hors saison est marquée **indisponible** ; NEXUS la retire des suggestions.
- Le partage automatique est **désactivé initialement**. Il peut être activé manuellement et fonctionne uniquement quand Vestiaire est ouverte.
- Une révocation coupe le jumelage et empêche de nouveaux envois. Les copies locales déjà reçues doivent être effacées dans NEXUS via son bouton **Révoquer et effacer**.
- La clé privée de jumelage figure dans les préférences locales de Vestiaire et dans les exports complets `.vestiaire` non chiffrés. Ne partage ni le code privé ni ces sauvegardes.

## Parcours iPhone

1. Fais un export privé des deux PWA avant la première liaison.
2. Dans NEXUS V0.21 → Réglages → Vestiaire · Tenues contextuelles → Créer la connexion, copie le code privé.
3. Dans VESTIAIRE V0.6 → Réglages → NEXUS · Suggestions de tenues, colle le code puis Connecter à NEXUS. Vérifie la confirmation iOS.
4. Appuie sur **Envoyer mes tenues**. Vérifie le nombre de tenues partagées ; tu peux ensuite choisir **Envoyer automatiquement**.
5. Retourne dans NEXUS → Réglages → Vestiaire → **Recevoir**. Crée un RDV « Restaurant ce soir » pour voir jusqu'à trois tenues adaptées dans Pulse. Une sélection reste dans NEXUS, sans modification du planning Vestiaire.
6. Dans NEXUS, **Ouvrir dans Vestiaire** utilise une URL avec un ID opaque ; Safari peut ouvrir la PWA dans un onglet plutôt que via son icône. Vestiaire tente d'ouvrir le look sur l'appareil actuel.
7. Pour stopper : révoque depuis NEXUS et éventuellement Vestiaire. La révocation ne supprime pas les anciennes sauvegardes.

## Implémentation

- `nexus-link-core.js` : protocole chiffré commun, gestion NXL1.
- `vestiaire-nexus-v06.js` : consentement, catalogue restreint, publication et synchronisation optionnelle.
- `vestiaire-nexus-v06.css` : interface de réglage discrète.
- `app.js` : adaptateur minimal, navigation par ID de look, déclenchement de l'envoi si autorisé.
- `edge-web/worker.js` : whitelist des nouveaux fichiers et CSP autorisant seulement l'API LINK en plus des APIs existantes ; pas de D1/R2.
- `sw.js` : cache V0.6 ; versions JS/CSS 0600.
- `tests/nexus-link.test.cjs` et `.github/workflows/check.yml` : tests de contrat, de confidentialité et d'assets.

## Limites et prochaines versions

Le moteur de tenue reste local et déterministe : aucun essayage virtuel automatique ni intelligence artificielle payante. Les photos ne sont pas visibles dans NEXUS, seulement les noms des looks ; pour la miniature, ouvrir Vestiaire. Le choix de tenue fait dans NEXUS ne crée pas automatiquement un planning dans Vestiaire. Une liaison inverse éventuelle nécessitera une permission séparée.

Régression à contrôler sur iPhone : photos, mannequins, couches Studio, édition Looks, imports Fits, sauvegardes/restaurations et stockage local doivent rester intacts.
