'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('LINK premier, Vestiaire garde les contrôles historiques et protège le dressing',()=>{
 const app=src('app.js'),ui=src('vestiaire-nexus-v06.js'),html=src('index.html'),sw=src('sw.js');
 assert.ok(app.indexOf('window.VestiaireNexus?.settingsCard?.()')<app.indexOf('<h2>Ton mannequin</h2>'));
 assert.match(ui,/Gérer dans LINK/);
 assert.match(ui,/https:\/\/link-app\.q9pfwtztsc\.workers\.dev\//);
 assert.match(ui,/vestiaire-legacy-link/);
 assert.match(ui,/data-act="vestiaire-hub-send"/);
 assert.match(ui,/data-act="vestiaire-hub-enroll"/);
 assert.match(ui,/data-act="vestiaire-nexus-connect"/);
 assert.match(ui,/data-act="vestiaire-nexus-revoke"/);
 assert.match(ui,/id="vestiaire-nexus-auto"/);
 assert.match(html,/app\.js\?v=0712/);
 assert.match(html,/vestiaire-nexus-v06\.js\?v=0616/);
 assert.match(sw,/vestiaire-v07\.7-link-only-auto/);
});
