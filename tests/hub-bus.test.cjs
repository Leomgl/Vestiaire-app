const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const text=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
test('Vestiaire manually sends only paginated encrypted look summaries to LINK',()=>{
 const source=text('vestiaire-nexus-v06.js'),bus=text('link-hub-bus.js');
 assert.match(source,/async function sendHub\(/);
 assert.match(source,/contractId:"vestiaire-nexus"/);
 assert.match(source,/scope:"outfit_catalog"/);
 assert.match(source,/schemaVersion:"vestiaire\.catalog\.page\.v2"/);
 assert.match(source,/await api\.savePrefs\(\{nexusLink:\{\.\.\.current\(\),hubPending:progressed\}\}\)/);
 assert.match(source,/Math\.min\(meta\.nextIndex\+12,items\.pages\.length\)/);
 assert.match(bus,/await putRecord\(db,"envelopes",key,record\)/);
 assert.doesNotMatch(bus,/setInterval\s*\(/);
 assert.match(text('index.html'),/link-hub-bus\.js\?v=0612/);
 assert.match(text('sw.js'),/vestiaire-v07\.6-link-settings/);
 assert.match(text('edge-web/worker.js'),/link-hub-bus\.js/);
});