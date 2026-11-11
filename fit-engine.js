'use strict';
/* VESTIAIRE FIT ENGINE v0.4
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
    if(word('hoodie','sweatshirt','sweat','sweater à capuche'))return'hoodie';
    if(word('pull','sweater','knit','maille','tricot'))return'sweater';
    if(word('tshirt','t-shirt','tee'))return'tshirt';
    if(word('shirt','chemise','surchemise'))return'shirt';
    if(word('polo'))return'polo';
    return'top';
  }
  return'accessory';
 };
 const profile=g=>{const type=guess(g);return {...TYPES[type],type,slot:g?.category||'accessory'}};
 const keySlot=key=>typeof key==='string'&&/^(top|bottom|outerwear|footwear|accessory)(?:__[2-8])?$/.test(key)?key.split('__')[0]:null;
 const order=(key,g,item)=>Number.isFinite(item?.zOrder)?item.zOrder:profile(g).z+(key.includes('__')?Number(key.split('__')[1])*.01:0);
 const sorted=(layers,lookup)=>Object.entries(layers||{}).filter(([key,item])=>keySlot(key)&&item&&lookup(item.garmentId)).sort(([ak,ai],[bk,bi])=>order(ak,lookup(ai.garmentId),ai)-order(bk,lookup(bi.garmentId),bi));
 const calibrate=(layers,lookup)=>{
  const grouped={top:[],bottom:[],outerwear:[],footwear:[],accessory:[]};
  for(const [key,item] of Object.entries(layers||{})){
   if(!item||!keySlot(key))continue;
   const garment=lookup(item.garmentId);if(!garment)continue;
   const slot=keySlot(key);grouped[slot].push({garment,item});
  }
  const fresh={top:null,bottom:null,outerwear:null,footwear:null,accessory:null};
  for(const [slot,items] of Object.entries(grouped)){
   items.sort((a,b)=>profile(a.garment).z-profile(b.garment).z);
   for(const [i,{garment,item}] of items.entries()){
    const p=profile(garment),key=i===0?slot:slot+'__'+(i+1);
    if(i>=8)throw Error('Maximum huit couches par zone');
    const {zOrder,...cleanItem}=item;fresh[key]={...cleanItem,x:p.x,y:p.y,scale:1};
   }
  }
  return fresh;
 };
 const displayBox=g=>{const p=profile(g);return {w:p.w,h:p.h}};
 window.VESTIAIRE_FIT={version:'0.4',TYPES,guess,profile,keySlot,order,sorted,calibrate,displayBox};
})();