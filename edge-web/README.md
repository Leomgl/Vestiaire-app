# VESTIAIRE — publication Cloudflare gratuite

L'origine PWA indépendante est `https://vestiaire-app.q9pfwtztsc.workers.dev/`.

Le Worker `vestiaire-app` sert une liste fermée de ressources publiques depuis `Leomgl/Vestiaire-app` (branche `main`) via GitHub Raw, avec cache Cloudflare court. Après un push GitHub, la nouvelle version est récupérée progressivement, sans redéployer le Worker. Sur iOS, le service worker PWA peut encore conserver les ressources précédentes jusqu'à mise à jour.

- **Cloudflare** : Worker uniquement ; pas de D1, R2, KV, stockage média ni secret.
- **Données privées** : IndexedDB dans chaque installation ; aucune photo personnelle sur GitHub ou Cloudflare.
- **Sauvegarde** : export manuel `.vestiaire` non chiffré et restauration locale. Toujours conserver un exemplaire indépendant.
- **PWA iPhone** : ouvrir l'URL HTTPS dans Safari → Partager → Sur l'écran d'accueil → Ajouter, puis tester le stockage, le Studio et l'export.
- **Sécurité** : domaines séparés de NEXUS, Gaming et RITUEL ; chemins publics strictement allowlistés et CSP restrictive.

Le code de l'edge est `edge-web/worker.js`. Déploiement initial : API Cloudflare Workers (module ES). Aucun accès à l'API Cloudflare n'est nécessaire depuis la PWA elle-même.

## Notes

Le proxy Github Raw est une solution de test/usage personnel. Si l'origine devient instable ou si l'app prend de l'ampleur, migrer vers Workers Static Assets via GitHub/CI, toujours dans les limites du plan gratuit. Le Worker ne réalise aucune synchronisation distante des données.
