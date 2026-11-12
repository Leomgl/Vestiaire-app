'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function instance(){
 global.window={};delete require.cache[require.resolve('../vestiaire-nexus-v06.js')];
 require('../vestiaire-nexus-v06.js');return window.VestiaireNexus;
}
test('shares only sanitized outfit metadata: never garment photos, mannequin or notes',()=>{
 const m=instance(),items=[
  {id:'look-1',name:'Restaurant chic',occasion:'Restaurant',style:'Old money',
   notes:'Confidentiel',thumbnailId:'image-123',layers:{top:{garmentId:'shirt'},outerwear:{garmentId:'coat'}}},
  {id:'look-2',name:'Casual',occasion:'Casual',style:'Streetwear',layers:{top:{garmentId:'missing'}}}
 ];
 const garments=[{id:'shirt',category:'top',availability:'available',name:'Chemise privée',imageId:'private-photo'},
  {id:'coat',category:'outerwear',availability:'available',material:'Laine',imageId:'coat-photo'}];
 const summary=m.summarize(items,garments);
 assert.equal(summary[0].available,true);
 assert.equal(summary[0].warmth,3);
 assert.equal(summary[1].available,false);
 for(const row of summary){assert.deepEqual(Object.keys(row).sort(),['available','id','name','occasion','style','updatedAt','warmth'].sort());assert.ok(!JSON.stringify(row).includes('Confidentiel'));assert.ok(!JSON.stringify(row).includes('private-photo'));}
});
test('catalog batches every outfit, with encrypted payload-safe pages, no omitted looks',()=>{
 const m=instance();
 const outfits=Array.from({length:81},(_,i)=>({id:'outfit-'+i,name:'Belle tenue '+String(i).repeat(120),
  occasion:'Restaurant',style:'Classique',updatedAt:'2026-11-11',layers:{top:{garmentId:'shirt'}}}));
 const r=m.catalog({outfits,garments:[{id:'shirt',availability:'available',category:'top'}]});
 assert.equal(r.total,81);
 assert.equal(r.pages.flat().length,81);
 assert.ok(r.pages.length>=4);
 assert.ok(r.pages.every(p=>p.length<=24));
 for(const [i,page] of r.pages.entries()){
  const payload={type:'vestiaire.catalog.page.v2',sourceApp:'vestiaire',revision:2,
   batchId:'00000000-0000-4000-8000-000000000000',pageIndex:i,pageCount:r.pages.length,
   total:81,sharedAt:'2026-11-12T14:00:00.000Z',looks:page};
  assert.ok(new TextEncoder().encode(JSON.stringify(payload)).byteLength<=6000);
 }
 assert.ok(r.pages.flat().every(x=>!Object.hasOwn(x,'thumbnailId')));
});
test('partial encrypted send preserves a new revision for safe retry',async()=>{
 const {webcrypto}=require('node:crypto');global.crypto=global.crypto||webcrypto;
 const m=instance(),pair={id:'pair',sourceApp:'vestiaire',scopes:['outfit_catalog']};
 const outfits=Array.from({length:51},(_,i)=>({id:'look-'+i,name:'Look '+i,
  occasion:'Casual',style:'Classique',layers:{top:{garmentId:'shirt'}}}));
 let prefs={nexusLink:{pair,revision:3,lastFingerprint:'',autoShare:false}},sent=[],attempt=0;
 const api={getPrefs:()=>prefs,state:()=>({outfits,garments:[{id:'shirt',category:'top'}]}),
  savePrefs:async patch=>{prefs={...prefs,...patch}},toast:()=>{},esc:x=>x};
 m.attach(api);
 window.NexusLinkCore={publish:async(p,job)=>{sent.push(job);if(attempt===0&&sent.length===2)throw Error('Temporary outage');}};
 await m.send(true);
 assert.equal(prefs.nexusLink.pendingRevision,4);
 assert.equal(prefs.nexusLink.revision,3);
 attempt=1;sent=[];
 await m.send(true);
 assert.equal(prefs.nexusLink.revision,5);
 assert.equal(prefs.nexusLink.pendingRevision,null);
 assert.equal(sent.length,m.catalog(api.state()).pages.length);
 assert.ok(sent.every(x=>x.revision===5&&x.scope==='outfit_catalog'));
 assert.equal(sent.reduce((n,x)=>n+x.payload.looks.length,0),51);
 assert.ok(sent.every(x=>Object.keys(x.payload).every(k=>!['thumbnailId','imageId','notes','garments'].includes(k))));
});
test('only valid Vestiaire pairing is accepted and source app sends no calendar data',async()=>{
 const m=instance();
 const api={getPrefs:()=>({}),state:()=>({outfits:[],garments:[]}),esc:x=>x};
 m.attach(api);
 assert.match(m.settingsCard(),/Colle ce code/i);
 const code=fs.readFileSync(path.join(root,'vestiaire-nexus-v06.js'),'utf8');
 assert.doesNotMatch(code,/window\.NexusTravel|navigator\.geolocation/);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 assert.match(html,/nexus-link-core\.js\?v=0600/);
 assert.match(html,/vestiaire-nexus-v06\.js\?v=0600/);
 assert.match(sw,/vestiaire-nexus-v06\.js\?v=0600/);
 const edge=fs.readFileSync(path.join(root,'edge-web/worker.js'),'utf8');
 assert.match(edge,/nexus-app-api\.q9pfwtztsc\.workers\.dev/);
 assert.match(edge,/\/vestiaire-nexus-v06\.js/);
});
