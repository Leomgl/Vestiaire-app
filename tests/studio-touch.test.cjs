'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
function between(start,end){
 const a=app.indexOf(start),b=app.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,'Expected source section: '+start);
 return app.slice(a,b);
}
test('studio picker searches by material, category, type and accents while respecting availability',()=>{
 const code=between('const studioFold=','function studioPaletteMarkup');
 const ctx={
  FIT:{guess:g=>g.subtype||'shirt',TYPES:{shirt:{label:'Chemise'}}},
  SLOTS:{top:{label:'Haut'}},draft:{top:null},activeLayerKey:'top',studioSlot:'top',
  studioQuery:'coton',isAvailable:g=>g.availability==='available',
  garments:[{id:'a',category:'top',name:'Chemise écrue',material:'Coton',availability:'available',subtype:'shirt'},
            {id:'b',category:'top',name:'Chemise noire',material:'Lin',availability:'laundry',subtype:'shirt'},
            {id:'c',category:'top',name:'Polo soie',material:'Soie',availability:'available',subtype:'shirt'}]
 };
 vm.runInNewContext(code+';this.matches=()=>studioCandidates().map(g=>g.id);',ctx);
 assert.deepEqual([...ctx.matches()],['a']);
 ctx.studioQuery='ecrue';assert.deepEqual([...ctx.matches()],['a']);
 ctx.studioQuery='chemise';assert.deepEqual([...ctx.matches()],['a','c']);
 ctx.studioQuery='lin';assert.deepEqual([...ctx.matches()],[]);
 ctx.draft.top={garmentId:'b'};assert.deepEqual([...ctx.matches()],['b']);
});
test('studio pointer gestures drag, pinch and resume smoothly',()=>{
 const handlers={};let renders=0;
 const layer={dataset:{dragSlot:'top'},style:{left:'',top:'',setProperty(name,value){this[name]=value;}}};
 const stage={contains:()=>true,getBoundingClientRect:()=>({width:200,height:400,left:0,top:0}),setPointerCapture(){}};
 const target={closest:selector=>selector==='[data-drag-slot]'?layer:null};
 const ctx={
  document:{addEventListener:(name,fn)=>handlers[name]=fn},
  $:id=>id==='stage'?stage:null,view:'studio',activeLayerKey:'top',studioSlot:'top',gesture:null,
  draft:{top:{x:50,y:50,scale:1,garmentId:'shirt'}},slotOfKey:key=>key,
  clamp:(n,min,max)=>Math.max(min,Math.min(max,n)),render:()=>renders++
 };
 vm.runInNewContext(between('// Pointer gestures update',"document.addEventListener('keydown'"),ctx);
 const evt=(pointerId,x,y)=>({pointerId,clientX:x,clientY:y,target,preventDefault(){}});
 handlers.pointerdown(evt(1,100,100));
 handlers.pointermove(evt(1,120,140));
 assert.equal(ctx.draft.top.x,60);assert.equal(ctx.draft.top.y,60);
 handlers.pointerdown(evt(2,180,140));
 handlers.pointermove(evt(2,210,140));
 assert.ok(ctx.draft.top.scale>1.4&&ctx.draft.top.scale<1.6);
 assert.ok(Number.isFinite(ctx.draft.top.x)&&Number.isFinite(ctx.draft.top.y));
 const prev=ctx.draft.top.x;
 handlers.pointerup(evt(2,210,140));
 handlers.pointermove(evt(1,140,140));
 assert.ok(ctx.draft.top.x>prev);
 handlers.pointerup(evt(1,140,140));
 assert.equal(ctx.gesture,null);assert.equal(renders,1);
});
test('PWA cache, JSX-free controls and encrypted NEXUS contract remain compatible',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 const edge=fs.readFileSync(path.join(root,'edge-web/worker.js'),'utf8');
 assert.match(app,/studio-picker-sheet/);
 assert.match(app,/data-act="remove-piece"/);
 assert.match(app,/data-act="swap-piece"/);
 assert.match(app,/data-act="confirm-piece"/);
 assert.match(app,/studio-inline-zones/);
 assert.match(app,/studioPickerOpen=false/);
 assert.match(html,/app\.js\?v=0710/);
 assert.match(html,/v02\.css\?v=0710/);
 assert.match(sw,/vestiaire-v07\.1/);
 assert.match(sw,/app\.js\?v=0710/);
 assert.match(sw,/v02\.css\?v=0710/);
 assert.match(edge,/\/v02\.css/);
 assert.match(fs.readFileSync(path.join(root,'vestiaire-nexus-v06.js'),'utf8'),/outfit_catalog/);
 assert.match(app,/DB_VERSION=2/);
});
