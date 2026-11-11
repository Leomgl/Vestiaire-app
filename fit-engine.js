'use strict';
/* VESTIAIRE FIT ENGINE v0.5
 * Pure sizing, anchors and layer order for the Studio + saved preview.
 * Works with old outfits: layer positions remain intact until user requests recalibration.
 */
(()=>{
 const SLOT={top:'top',bottom:'bottom',outerwear:'outerwear',footwear:'footwear',accessory:'accessory'};
 const TYPES={
  shirt:    {x:50,y:35,w:41,h:34,z:32,label:'Chemise'},
  tshirt:   {x:50,y:35,w:39,h:32,z:30,label:'T-shirt'},
  polo:     {x:50,y:35,w:40,h:33,z:31,label:'Polo'},
  sweater:  {x:50,y:36,w:44,h:37,z:38,label:'Pull'},
  hoodie:   {x:50,y:37,w:47,h:39,z:39,label:'Sweat'},
  cardigan: {x:50,y:37,w:46,h:38,z:43,label:'Cardigan'},
  top:      {x:50,y:35,w:42,h:35,z:36,label:'Haut'},
  trouser:  {x:50,y:70,w:42,h:46,z:18,label:'Pantalon'},
  short:    {x:50,y:59,w:40,h:22,z:18,label:'Short'},
  skirt:    {x:50,y:61,w:42,h:35,z:18,label:'Jupe'},
  jacket:   {x:50,y:35,w:42,h:36,z:51,label:'Veste'},
  coat:     {x:50,y:42,w:44,h:50,z:60,label:'Manteau'},
  outerwear:{x:50,y:38,w:43,h:39,z:53,label:'Veste'},
  footwear: {x:50,y:93,w:45,h:17,z:24,label:'Chaussures'},
  belt:     {x:50,y:52,w:43,h:8,z:67,label:'Ceinture'},
  sock:     {x:50,y:87,w:31,h:15,z:15,label:'Chaussettes'},
  tie:      {x:50,y:35,w:15,h:27,z:45,label:'Cravate'},
  scarf:    {x:50,y:27,w:32,h:22,z:71,label:'Écharpe'},
  hat:      {x:50,y:10,w:33,h:14,z:73,label:'Chapeau'},
  bag:      {x:76,y:48,w:30,h:33,z:75,label:'Sac'},
  watch:    {x:72,y:53,w:14,h:13,z:69,label:'Montre'},
  jewelry:  {x:50,y:23,w:23,h:15,z:69,label:'Bijou'},
  accessory:{x:70,y:45,w:25,h:22,z:69,label:'Accessoire'}
 };

 /* Source reference: user-owned front-facing mannequin photo, 1024 × 1536 (2:3).
    Coordinates are % of the *original full photo*. In reference mode the image
    fills the stage HEIGHT (aspect 4:5), with its side margins centered.
    The image itself is never bundled or uploaded to the public repository. */
 const REFERENCE_MODE='reference-v05';
 const LANDMARKS={
  headTop:{x:50,y:6},neck:{x:50,y:18},shoulders:{x:50,y:21},
  chest:{x:50,y:28},waist:{x:50,y:45},hips:{x:50,y:50},
  crotch:{x:50,y:56},knees:{x:50,y:73},ankles:{x:50,y:88},feet:{x:50,y:93}
 };
 const REFERENCE_TYPES={
  shirt:    {x:50,y:32,w:39,h:31},
  tshirt:   {x:50,y:31,w:38,h:31},
  polo:     {x:50,y:32,w:38,h:31},
  sweater:  {x:50,y:33,w:42,h:34},
  hoodie:   {x:50,y:34,w:43,h:35},
  cardigan: {x:50,y:34,w:42,h:35},
  top:      {x:50,y:32,w:39,h:32},
  trouser:  {x:50,y:68,w:36,h:43},
  short:    {x:50,y:55,w:35,h:21},
  skirt:    {x:50,y:58,w:38,h:29},
  jacket:   {x:50,y:34,w:43,h:36},
  coat:     {x:50,y:40,w:45,h:51},
  outerwear:{x:50,y:35,w:43,h:38},
  footwear: {x:50,y:92,w:37,h:14},
  belt:     {x:50,y:46,w:29,h:6},
  sock:     {x:50,y:85,w:28,h:12},
  tie:      {x:50,y:31,w:14,h:25},
  scarf:    {x:50,y:25,w:29,h:19},
  hat:      {x:50,y:10,w:29,h:14},
  bag:      {x:77,y:49,w:25,h:28},
  watch:    {x:70,y:49,w:13,h:12},
  jewelry:  {x:50,y:21,w:21,h:15},
  accessory:{x:70,y:44,w:24,h:19}
 };
 const referenceAspect=1024/1536;
 const matchesReferenceAspect=(w,h)=>Number.isFinite(w)&&Number.isFinite(h)&&w>0&&h>0&&Math.abs(w/h-referenceAspect)<=.018;
 const guess=(garment)=>{
  if(!garment)return'accessory';
  const slot=SLOT[garment.category]||garment.category;
  const cat=String(garment.fits?.category||garment.subtype||'').toLowerCase();
  const name=String(garment.name||'').toLowerCase();
  const word=(...terms)=>terms.some(t=>cat.includes(t)||name.includes(t));
  if(word('belt','ceinture'))return'belt';
  if(word('socks','chaussette','sock'))return'sock';
  if(word('scarf','écharpe','echarpe','foulard'))return'scarf';
  if(word('tie','cravate'))return'tie';
  if(word('watch','montre'))return'watch';
  if(word('hat','bonnet','casquette','chapeau','beanie'))return'hat';
  if(word('bag','sac'))return'bag';
  if(word('bracelet','necklace','collier','bijou','jewelry'))return'jewelry';
  if(slot==='footwear')return'footwear';
  if(slot==='bottom'){
    if(word('short','bermuda'))return'short';
    if(word('jupe','skirt'))return'skirt';
    return'trouser';
  }
  if(slot==='outerwear'){
    if(word('coat','manteau','trench','parka'))return'coat';
    return'jacket';
  }
  if(slot==='top'){
    if(word('cardigan','gilet'))return'cardigan';
    if(word('hoodie','sweatshirt','à capuche')||cat==='sweat'||/^sweat(?:\s|$)/.test(name))return'hoodie';
    if(word('pull','sweater','knit','maille','tricot'))return'sweater';
    if(word('tshirt','t-shirt','tee'))return'tshirt';
    if(word('shirt','chemise','surchemise'))return'shirt';
    if(word('polo'))return'polo';
    return'top';
  }
  return'accessory';
 };
 const profile=(g,mode=null)=>{const type=guess(g);return {...TYPES[type],...(mode===REFERENCE_MODE?REFERENCE_TYPES[type]:null),type,slot:g?.category||'accessory'}};
 const keySlot=key=>typeof key==='string'&&/^(top|bottom|outerwear|footwear|accessory)(?:__[2-8])?$/.test(key)?key.split('__')[0]:null;
 const order=(key,g,item)=>Number.isFinite(item?.zOrder)?item.zOrder:profile(g).z+(key.includes('__')?Number(key.split('__')[1])*.01:0);
 const sorted=(layers,lookup)=>Object.entries(layers||{}).filter(([key,item])=>keySlot(key)&&item&&lookup(item.garmentId)).sort(([ak,ai],[bk,bi])=>order(ak,lookup(ai.garmentId),ai)-order(bk,lookup(bi.garmentId),bi));
 const calibrate=(layers,lookup,mode=null)=>{
  const grouped={top:[],bottom:[],outerwear:[],footwear:[],accessory:[]};
  for(const [key,item] of Object.entries(layers||{})){
   if(!item||!keySlot(key))continue;
   const garment=lookup(item.garmentId);if(!garment)continue;
   const slot=keySlot(key);grouped[slot].push({garment,item});
  }
  const fresh={top:null,bottom:null,outerwear:null,footwear:null,accessory:null};
  for(const [slot,items] of Object.entries(grouped)){
   items.sort((a,b)=>profile(a.garment,mode).z-profile(b.garment,mode).z);
   for(const [i,{garment,item}] of items.entries()){
    const p=profile(garment,mode),key=i===0?slot:slot+'__'+(i+1);
    if(i>=8)throw Error('Maximum huit couches par zone');
    const {zOrder,...cleanItem}=item;fresh[key]={...cleanItem,x:p.x,y:p.y,scale:1};
   }
  }
  return fresh;
 };
 const displayBox=(g,mode)=>{const p=profile(g,mode);return {w:p.w,h:p.h}};
 window.VESTIAIRE_FIT={version:'0.5',TYPES,REFERENCE_MODE,LANDMARKS,REFERENCE_TYPES,referenceAspect,matchesReferenceAspect,guess,profile,keySlot,order,sorted,calibrate,displayBox};
})();