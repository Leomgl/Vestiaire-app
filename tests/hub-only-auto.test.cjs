'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('Vestiaire ne retourne jamais automatiquement vers le relais historique',()=>{
 const code=src('vestiaire-nexus-v06.js'),from=code.indexOf(' function schedule(force=false){'),to=code.indexOf(' async function action(kind)',from);
 assert.ok(from>=0&&to>from,'délimitation de l’envoi automatique');
 const auto=code.slice(from,to);
 assert.match(auto,/await sendHub\(\{quiet:true\}\)/);
 assert.doesNotMatch(auto,/await send\(/,'pas de publication automatique historique');
 assert.match(code,/data-act="vestiaire-nexus-send"/,'action manuelle historique préservée');
 assert.match(code,/await CORE\(\)\.publish\(link\.pair/,'mécanisme de secours conservé');
 assert.match(src('index.html'),/vestiaire-nexus-v06\.js\?v=0616/);
 assert.match(src('sw.js'),/vestiaire-v07\.7-link-only-auto/);
});
