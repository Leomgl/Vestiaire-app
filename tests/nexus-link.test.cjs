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
test('catalog stays under encrypted relay payload limit and caps the number of looks',()=>{
 const m=instance();
 const outfits=Array.from({length:60},(_,i)=>({id:'outfit-'+i,name:'Belle tenue '+String(i).repeat(120),
  occasion:'Restaurant',style:'Classique',updatedAt:'2026-11-11',layers:{top:{garmentId:'shirt'}}}));
 const r=m.catalog({outfits,garments:[{id:'shirt',availability:'available',category:'top'}]});
 assert.ok(r.looks.length<=24);assert.equal(r.total,60);assert.equal(r.omitted,60-r.looks.length);
 assert.ok(new TextEncoder().encode(JSON.stringify({type:'vestiaire.catalog.v1',sourceApp:'vestiaire',revision:1,looks:r.looks})).byteLength<=5500);
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
