'use strict';
/* Fits → VESTIAIRE — import privé local, sans transfert serveur ni écrasement. */
(()=>{
 const DB='vestiaire-local-v1',VERSION=2;
 const SLOT={top:'top',bottom:'bottom',outerwear:'outerwear',footwear:'footwear',accessory:'accessory',other:'accessory'};
 const FIT=window.VESTIAIRE_FIT;
 const SEASONS={spring:'Printemps',summer:'Été',fall:'Automne',winter:'Hiver',all:'Toute l’année'};
 const OCCASION={work:'Travail',casual:'Casual',date:'Restaurant',formal:'Événement',party:'Soirée',home:'Casual',sport:'Sport',travel:'Voyage'};
 const COLOR={black:'Noir',navy:'Bleu marine',beige:'Beige',white:'Blanc',brown:'Marron',gray:'Gris',blue:'Bleu',lightBlue:'Bleu clair',red:'Rouge',cream:'Écru',green:'Vert',olive:'Olive',lightGray:'Gris clair',pink:'Rose',silver:'Argenté',petrol:'Bleu pétrole',orange:'Orange'};
 const MATERIAL={cotton:'Coton',linen:'Lin',polyester:'Polyester',wool:'Laine',corduroy:'Velours côtelé',leather:'Cuir',flannel:'Flanelle',denim:'Denim',suede:'Daim',viscose:'Viscose',silk:'Soie'};
 const clean=(x,n=110)=>String(x??'').trim().slice(0,n);
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
 const uuid=()=>crypto.randomUUID();
 const one=(array,convert)=>Array.isArray(array)?array.map(x=>convert[x]||x):[];
 const money=x=>x&&Number.isFinite(x.amount)?{amount:x.amount,currency:clean(x.currency||'EUR',8)}:null;
 const stamp=d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'')?d+'T12:00:00.000Z':new Date().toISOString();
 let parsed=null,phase='idle',stats=null;
 const show=(message)=>{const e=document.getElementById('fits-progress');if(e)e.textContent=message};
 function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,VERSION);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Ferme les autres fenêtres VESTIAIRE pour importer.'))})}
 function read(db,name){return new Promise((resolve,reject)=>{const r=db.transaction(name,'readonly').objectStore(name).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
 function txWrite(db,rows){return new Promise((resolve,reject)=>{const tx=db.transaction(['garments','outfits','media'],'readwrite');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error('Stockage insuffisant'));tx.onabort=()=>reject(tx.error||Error('Importation annulée'));try{for(const r of rows.garments)tx.objectStore('garments').put(r);for(const r of rows.outfits)tx.objectStore('outfits').put(r);for(const r of rows.media)tx.objectStore('media').put(r)}catch(e){tx.abort();reject(e)}})}
 function valid(data){if(!data||!Array.isArray(data.pieces)||!Array.isArray(data.outfits)||data.pieces.length>20000||data.outfits.length>50000)throw Error('Fichier Fits invalide (attendu : pieces et outfits).');const ids=new Set();for(const p of data.pieces){if(!p||typeof p.pieceId!=='string'||!/^[A-Za-z0-9_-]{6,64}$/.test(p.pieceId)||ids.has(p.pieceId)||!SLOT[p.slot])throw Error('Vêtement Fits incorrect ou identifiant en double.');ids.add(p.pieceId)}const lookIds=new Set();for(const o of data.outfits){if(!o||typeof o.outfitId!=='string'||!/^[A-Za-z0-9_-]{6,64}$/.test(o.outfitId)||lookIds.has(o.outfitId)||!Array.isArray(o.pieces)||o.pieces.length>40||o.pieces.some(x=>!ids.has(x.pieceId)))throw Error('Tenue Fits incorrecte, ou vêtements manquants dans l’export.');lookIds.add(o.outfitId)}return data}
 const caption=p=>clean(p.name||({top:'Haut',bottom:'Pantalon',outerwear:'Veste',footwear:'Chaussures',accessory:'Accessoire',other:'Accessoire'}[p.slot]||'Vêtement')+' '+(p.colors||[]).join(', '),110);
 function placeholder(p){const canvas=document.createElement('canvas');canvas.width=360;canvas.height=460;const ctx=canvas.getContext('2d');ctx.fillStyle='#eeefe9';ctx.fillRect(0,0,360,460);ctx.strokeStyle='#a3b4a3';ctx.lineWidth=4;ctx.strokeRect(18,18,324,424);ctx.fillStyle='#59705b';ctx.font='bold 27px system-ui';ctx.textAlign='center';ctx.fillText('PHOTO À AJOUTER',180,194,305);ctx.font='18px system-ui';ctx.fillText(caption(p),180,236,290);ctx.font='14px system-ui';ctx.fillText('Import Fits • image indisponible',180,264,300);return new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.8))}
 async function compress(blob){const u=URL.createObjectURL(blob);try{const im=new Image();im.src=u;await im.decode();const scale=Math.min(1,950/Math.max(im.naturalWidth,im.naturalHeight));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.naturalWidth*scale));c.height=Math.max(1,Math.round(im.naturalHeight*scale));c.getContext('2d').drawImage(im,0,0,c.width,c.height);return await new Promise((resolve,reject)=>c.toBlob(x=>x?resolve(x):reject(Error('Conversion photo impossible')),'image/webp',.82))}finally{URL.revokeObjectURL(u)}}
 let directBlocked=false;
 async function download(p){
  if(!p.imageUrl)return null;
  let u;try{u=new URL(p.imageUrl)}catch{return null}
  if(u.protocol!=='https:'||u.hostname!=='mcp.fits-app.com'||!u.pathname.startsWith('/img/'))return null;
  async function normal(){
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);
   try{const response=await fetch(u.href,{mode:'cors',credentials:'omit',cache:'no-store',signal:controller.signal});
    if(!response.ok)return null;const len=Number(response.headers.get('content-length'))||0;if(len>20_000_000)return null;
    const blob=await response.blob();if(blob.size>20_000_000||!blob.type.startsWith('image/'))return null;return await compress(blob);
   }catch(e){if(e instanceof TypeError)directBlocked=true;return null}finally{clearTimeout(timer)}
  }
  async function proxy(){
   const transfer=parsed?.transfer;if(!transfer||typeof transfer.proxyUrl!=='string'||typeof transfer.proxyToken!=='string')return null;
   let host;try{host=new URL(transfer.proxyUrl)}catch{return null}
   if(host.protocol!=='https:'||host.hostname!=='vestiaire-fits-bridge.q9pfwtztsc.workers.dev')return null;
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),17000);
   try{const response=await fetch(host.origin+'/image',{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',headers:{'content-type':'application/json','authorization':'Bearer '+transfer.proxyToken},body:JSON.stringify({src:u.href}),signal:controller.signal});
    if(!response.ok)return null;const len=Number(response.headers.get('content-length'))||0;if(len>20_000_000)return null;const blob=await response.blob();if(blob.size>20_000_000||!blob.type.startsWith('image/'))return null;return await compress(blob);
   }catch{return null}finally{clearTimeout(timer)}
  }
  return (!directBlocked?await normal():null)||await proxy();
 }
 async function thumbnail(layers,imageById,lookup){
  const canvas=document.createElement('canvas');canvas.width=420;canvas.height=525;
  const c=canvas.getContext('2d');c.fillStyle='#f1f2ed';c.fillRect(0,0,420,525);
  c.fillStyle='#b7c1b3';c.beginPath();c.ellipse(210,70,27,36,0,0,Math.PI*2);c.fill();
  c.fillRect(174,121,72,205);c.fillRect(177,327,26,155);c.fillRect(216,327,26,155);
  const ordered=FIT.sorted(layers,lookup);
  for(const [key,v] of ordered){
   const g=lookup(v.garmentId),p=FIT.profile(g),blob=imageById.get(v.garmentId);
   if(!blob)continue;const u=URL.createObjectURL(blob);
   try{
    const im=new Image();im.src=u;await im.decode();
    const w=420*p.w/100*v.scale,h=525*p.h/100*v.scale,ratio=Math.min(w/im.naturalWidth,h/im.naturalHeight);
    const dw=im.naturalWidth*ratio,dh=im.naturalHeight*ratio;
    c.save();c.globalAlpha=Math.max(.2,Math.min(1,v.opacity??1));c.drawImage(im,420*v.x/100-dw/2,525*v.y/100-dh/2,dw,dh);c.restore();
   }catch{}finally{URL.revokeObjectURL(u)}
  }
  return new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.8));
 }
 function makeModal(data,existing){const pieceDup=data.pieces.filter(p=>existing.pieces.has(p.pieceId)).length,lookDup=data.outfits.filter(o=>existing.outfits.has(o.outfitId)).length;const links=data.pieces.filter(p=>p.imageUrl).length;
 const html='<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true"><header><h2>Importer depuis Fits</h2><button class="modal-close" type="button" data-fits-act="cancel">×</button></header><p class="muted">Aperçu avant importation. Les fiches déjà importées sont ignorées. Aucune donnée existante n’est supprimée.</p><div class="fits-stats"><div><strong>'+data.pieces.length+'</strong><span>Vêtements</span></div><div><strong>'+data.outfits.length+'</strong><span>Tenues</span></div><div><strong>'+links+'</strong><span>Liens photo</span></div></div><p class="section-note">'+pieceDup+' vêtement(s) et '+lookDup+' tenue(s) déjà présents. '+(data.pieces.length-links)+' pièces sans lien photo dans ce fichier.</p><label class="field"><span><input type="checkbox" id="fits-download-images" checked> Télécharger les photos à partir de Fits</span></label><label class="field"><span><input type="checkbox" id="fits-backup-confirmed"> J’ai exporté une sauvegarde de mon VESTIAIRE actuel</span></label><div class="notice">En cas de lien expiré ou de blocage CORS, un visuel « PHOTO À AJOUTER » sera créé. Les originaux restent dans Fits.</div><div id="fits-progress" class="section-note">Prêt pour l’importation.</div><div class="form-footer"><button type="button" class="btn ghost" data-fits-act="cancel">Annuler</button><button type="button" class="btn" data-fits-act="confirm">Importer sans écraser</button></div></div></div>';
 document.getElementById('modal-root').innerHTML=html;stats={pieceDup,lookDup,links};phase='preview'}
 async function preview(file){if(phase==='running')return;if(!file)return;try{if(file.size>20_000_000)throw Error('Fichier trop volumineux (max. 20 Mo).');const data=valid(JSON.parse(await file.text()));const db=await openDB();let existing;try{const [garments,outfits]=await Promise.all([read(db,'garments'),read(db,'outfits')]);existing={pieces:new Set(garments.map(g=>g.source?.app==='fits'?g.source.id:null)),outfits:new Set(outfits.map(o=>o.source?.app==='fits'?o.source.id:null))}}finally{db.close()}parsed=data;makeModal(data,existing)}catch(e){alert('Import Fits : '+(e.message||e))}}
 async function run(){if(phase!=='preview'||!parsed)return;if(!document.getElementById('fits-backup-confirmed')?.checked){show('Avant de continuer : Réglages → Exporter une sauvegarde VESTIAIRE, puis coche la confirmation ci-dessus.');return}phase='running';const confirmButton=document.querySelector('[data-fits-act="confirm"]');if(confirmButton)confirmButton.disabled=true;
 let db;try{db=await openDB();const [existingGarments,existingOutfits,existingMedia]=await Promise.all([read(db,'garments'),read(db,'outfits'),read(db,'media')]);const oldPieces=new Map(existingGarments.filter(x=>x.source?.app==='fits').map(x=>[x.source.id,x])),oldLooks=new Set(existingOutfits.filter(x=>x.source?.app==='fits').map(x=>x.source.id));
 const missing=parsed.pieces.filter(x=>!oldPieces.has(x.pieceId));const additions={garments:[],outfits:[],media:[]},imageById=new Map();const blobCache=new Map(existingMedia.map(x=>[x.id,x.blob]));for(const g of existingGarments)if(g.source?.app==='fits'&&blobCache.has(g.imageId))imageById.set(g.id,blobCache.get(g.imageId));const map=new Map(oldPieces.size?[...oldPieces].map(([k,v])=>[k,v.id]):[]);
 let ok=0,skipped=0,unavailable=0,connectionBlocked=false,failures=0;const useImages=!!document.getElementById('fits-download-images')?.checked;
 for(let i=0;i<missing.length;i++){const p=missing[i];show('Préparation des photos '+(i+1)+'/'+missing.length+'…');
 let blob=null,wasDownloaded=false;if(useImages&&!connectionBlocked&&p.imageUrl){blob=await download(p);if(blob){ok++;wasDownloaded=true;failures=0}else{failures++;unavailable++;if(failures>=3)connectionBlocked=true}}else if(p.imageUrl&&useImages){unavailable++}
 if(!blob){blob=await placeholder(p);skipped++}const imageId=uuid(),id=uuid();additions.media.push({id:imageId,blob,size:blob.size,type:blob.type,createdAt:new Date().toISOString()});imageById.set(id,blob);map.set(p.pieceId,id);
 const row={id,name:caption(p),category:SLOT[p.slot],imageId,color:one(p.colors||[],COLOR).join(', ').slice(0,80),material:one(p.materials||[],MATERIAL).join(', ').slice(0,80),fit:clean(p.fit||'',80),brand:clean(p.brand||'',80),size:'',availability:'available',style:'Autre',notes:clean(p.description||'',400),occasions:[],seasons:[...new Set(one(p.seasons||[],SEASONS))],source:{app:'fits',id:p.pieceId},fits:{category:p.category,slot:p.slot,colors:p.colors||[],materials:p.materials||[],seasons:p.seasons||[],price:money(p.price),warmth:p.warmth,formality:p.formality,wornCount:p.wornCount||0,addedOn:p.addedOn,listIds:p.listIds||[],imageStatus:wasDownloaded?'downloaded':'placeholder'},createdAt:stamp(p.addedOn),updatedAt:new Date().toISOString()};additions.garments.push(row)}
 const lookup=id=>additions.garments.find(g=>g.id===id)||existingGarments.find(g=>g.id===id);
 const sorted=[...parsed.outfits].filter(o=>!oldLooks.has(o.outfitId));
 for(let i=0;i<sorted.length;i++){const fit=sorted[i];show('Composition des tenues '+(i+1)+'/'+sorted.length+'…');const layers={top:null,bottom:null,outerwear:null,footwear:null,accessory:null},counts={};for(const part of fit.pieces){const g=parsed.pieces.find(p=>p.pieceId===part.pieceId);if(!g||!map.has(part.pieceId))continue;const slot=SLOT[g.slot],n=(counts[slot]||0)+1;counts[slot]=n;if(n>8)throw Error('Trop de couches dans une tenue Fits.');const key=n===1?slot:slot+'__'+n;const pos=FIT.profile(lookup(map.get(part.pieceId)));layers[key]={garmentId:map.get(part.pieceId),x:pos.x,y:pos.y,scale:1}}
 const corrected=FIT.calibrate(layers,lookup);const tn=await thumbnail(corrected,imageById,lookup),thumbnailId=uuid();additions.media.push({id:thumbnailId,blob:tn,size:tn.size,type:tn.type,createdAt:new Date().toISOString()});
 const oc=one(fit.occasions||[],OCCASION),first=oc[0]||'Libre';additions.outfits.push({id:uuid(),name:clean(fit.name||('Tenue Fits '+String(i+1).padStart(2,'0'))),occasion:first,style:'Autre',notes:clean((fit.tags||[]).join(' · '),400),layers:corrected,thumbnailId,source:{app:'fits',id:fit.outfitId},fits:{occasions:fit.occasions||[],tags:fit.tags||[],lastWorn:fit.lastWorn||null,createdOn:fit.createdOn||null},createdAt:stamp(fit.createdOn),updatedAt:new Date().toISOString()})}
 show('Enregistrement atomique…');await txWrite(db,additions);
 phase='done';show('Import réussi : '+additions.garments.length+' vêtements, '+additions.outfits.length+' tenues ; '+ok+' photos téléchargées, '+skipped+' visuels à remplacer.');const f=document.querySelector('[data-fits-act="confirm"]');if(f){f.textContent='Ouvrir le dressing';f.disabled=false;f.dataset.fitsAct='reload'}
 }catch(e){phase='preview';show('Aucun changement enregistré. Erreur : '+(e.message||e));const f=document.querySelector('[data-fits-act="confirm"]');if(f)f.disabled=false}finally{db?.close()}}
 document.addEventListener('click',e=>{const b=e.target.closest('[data-fits-act]');if(!b)return;const action=b.dataset.fitsAct;if(action==='cancel'){if(phase!=='running'){document.getElementById('modal-root').innerHTML='';parsed=null}}else if(action==='confirm')run();else if(action==='reload')location.reload()});
 window.VESTIAIRE_FITS={preview};
})();