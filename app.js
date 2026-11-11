'use strict';
/* VESTIAIRE v0.1 — prototype local-first: no remote uploads, no tracking, no account. */
(()=>{
const DB_NAME='vestiaire-local-v1',DB_VERSION=1;
const STORES=['garments','outfits','media','prefs'];
const OCCASIONS=['Travail','Restaurant','Soirée','Casual','Sport','Voyage','Événement'];
const STYLES=['Old money','Smart casual','Streetwear','Classique','Minimaliste','Sport','Autre'];
const SEASONS=['Printemps','Été','Automne','Hiver','Toute l’année'];
const CATEGORIES=[['top','Haut'],['bottom','Bas'],['outerwear','Veste'],['footwear','Chaussures'],['accessory','Accessoire']];
const SLOTS={
 top:{label:'Haut',sign:'▱',x:50,y:37,w:40,h:30,z:3},
 bottom:{label:'Bas',sign:'〣',x:50,y:66,w:44,h:33,z:2},
 outerwear:{label:'Veste',sign:'⌗',x:50,y:37,w:47,h:40,z:4},
 footwear:{label:'Chaussures',sign:'⌢',x:50,y:91,w:42,h:14,z:5},
 accessory:{label:'Accessoires',sign:'◇',x:65,y:24,w:22,h:18,z:6}
};
const $=id=>document.getElementById(id);
const uid=()=>crypto.randomUUID();
const clean=(s,n=240)=>String(s??'').trim().slice(0,n);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sanitizeList=(items,allowed)=>[...new Set((Array.isArray(items)?items:[]).filter(x=>allowed.includes(x)))];
const dateNow=()=>new Date().toISOString();
const formatDate=d=>d?new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium'}).format(new Date(d)):'';
const now=new Date();
let db=null,view='home',garments=[],outfits=[],prefs={id:'main',mannequinId:null,lastBackupAt:null},media=new Map(),imageURLs=new Map();
let selectedCategory='all',query='',selectedOccasion='all',studioSlot='top',draft={},editingOutfit=null,working=false;
let dragged=null;

function toast(message){const target=$('toast');target.textContent=message;target.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>target.classList.remove('show'),3600)}
function error(err){console.error(err);toast('Erreur : '+(err?.message||'action impossible').slice(0,130))}
function openDb(){return new Promise((resolve,reject)=>{
 const r=indexedDB.open(DB_NAME,DB_VERSION);
 r.onupgradeneeded=()=>{const d=r.result;for(const name of STORES)if(!d.objectStoreNames.contains(name))d.createObjectStore(name,{keyPath:'id'})};
 r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||new Error('IndexedDB indisponible'));
})}
function transact(names,mode,run){return new Promise((resolve,reject)=>{
 const tx=db.transaction(names,mode);let output;
 tx.oncomplete=()=>resolve(output);tx.onerror=()=>reject(tx.error||new Error('Écriture impossible'));tx.onabort=()=>reject(tx.error||new Error('Écriture annulée'));
 try{output=run(tx)}catch(e){tx.abort();reject(e)}
})}
function readAll(name){return new Promise((resolve,reject)=>{const req=db.transaction(name,'readonly').objectStore(name).getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function save(name,row){await transact([name],'readwrite',tx=>tx.objectStore(name).put(row))}
async function remove(name,id){await transact([name],'readwrite',tx=>tx.objectStore(name).delete(id))}
function urlFor(id){if(!id)return'';if(imageURLs.has(id))return imageURLs.get(id);const entry=media.get(id);if(!entry)return'';const u=URL.createObjectURL(entry.blob);imageURLs.set(id,u);return u}
function clearURLs(){for(const u of imageURLs.values())URL.revokeObjectURL(u);imageURLs.clear()}
async function init(){
 try{
  db=await openDb();await reload();
  if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1'))navigator.serviceWorker.register('./sw.js').catch(e=>console.warn('SW',e));
  render();
 }catch(e){$('view-root').innerHTML=`<div class="empty"><h3>Stockage indisponible</h3><p>${esc(e.message)}. Ouvre cette application depuis une origine HTTPS (pas en mode privé), puis réessaie.</p></div>`}
}
async function reload(){
 const [gs,os,ms,ps]=await Promise.all(STORES.map(readAll));
 garments=gs.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
 outfits=os.sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
 media=new Map(ms.map(x=>[x.id,x]));prefs=ps.find(x=>x.id==='main')||{id:'main',mannequinId:null,lastBackupAt:null};
 clearURLs();
}
async function storeImage(file,max=1100){
 if(!file||!(file instanceof Blob)||!String(file.type).startsWith('image/'))throw Error('Choisis une image JPG, PNG, WebP ou HEIC compatible.');
 if(file.size>25_000_000)throw Error('Image trop volumineuse : 25 Mo maximum.');
 const url=URL.createObjectURL(file);
 try{
  const im=new Image();im.src=url;await im.decode();
  const ratio=Math.min(1,max/Math.max(im.naturalWidth,im.naturalHeight));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(im.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(im.naturalHeight*ratio));
  const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)throw Error('Compression impossible');
  ctx.imageSmoothingQuality='high';ctx.drawImage(im,0,0,canvas.width,canvas.height);
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(x=>x?resolve(x):reject(Error('Image impossible à convertir')),'image/webp',.84));
  const row={id:uid(),blob,size:blob.size,type:blob.type,createdAt:dateNow()};await save('media',row);media.set(row.id,row);return row.id;
 }finally{URL.revokeObjectURL(url)}
}
function render(){
 const labels={home:'TABLEAU DE BORD',wardrobe:'MON DRESSING',studio:'STUDIO DE TENUES',looks:'MES TENUES',settings:'PARAMÈTRES'};
 $('header-label').textContent=labels[view];
 document.querySelectorAll('[data-nav]').forEach(btn=>{btn.classList.toggle('active',btn.dataset.nav===view);btn.setAttribute('aria-current',btn.dataset.nav===view?'page':'false')});
 const routes={home:homeView,wardrobe:wardrobeView,studio:studioView,looks:looksView,settings:settingsView};
 $('view-root').innerHTML=routes[view]();
 if(view==='settings')refreshStorageStatus();
}
function navigate(target){if(!['home','wardrobe','studio','looks','settings'].includes(target))return;view=target;render();window.scrollTo({top:0,behavior:'instant'})}
function heading(kicker,title,description,buttons=''){return `<div class="view-header"><div><div class="eyebrow">${esc(kicker)}</div><h1>${esc(title)}</h1><p>${esc(description)}</p></div>${buttons?`<div class="actions">${buttons}</div>`:''}</div>`}
const button=(act,title,kind='')=>`<button type="button" class="btn ${kind}" data-act="${act}">${title}</button>`;
function homeView(){
 const recent=outfits[0];
 return heading('UN DRESSING À TON IMAGE','Bonjour, bienvenue au Vestiaire.','Ton dressing, tes compositions et tes tenues favorites au même endroit.')+
 `<div class="stat-row"><div class="stat"><strong>${garments.length}</strong><span>Pièces enregistrées</span></div><div class="stat"><strong>${outfits.length}</strong><span>Tenues créées</span></div><div class="stat"><strong>${new Set(garments.flatMap(g=>g.occasions||[])).size}</strong><span>Occasions couvertes</span></div></div>
 <div class="dashboard-grid"><section class="panel"><div class="panel-header"><h2>Ton studio personnel</h2>${button('open-studio','Ouvrir le Studio','small soft')}</div>
 <div class="hero-look"><div class="hero-look-text"><span class="eyebrow">COMPOSER · AJUSTER · SAUVEGARDER</span><h2>Un look qui te ressemble.</h2><p>Construis une tenue autour de ton mannequin et enregistre chaque détail de ta composition.</p>${button('open-studio','Créer une tenue')}</div><div class="hero-decor">V.</div></div></section>
 <section class="panel"><div class="panel-header"><h2>En place dès la V1</h2></div><div class="feature-list">
 <div class="feature-row"><div class="feature-icon">♧</div><div><strong>Vêtements classés</strong><p>Matière, couleur, saison, style et occasion.</p></div></div>
 <div class="feature-row"><div class="feature-icon">◈</div><div><strong>Mannequin personnel</strong><p>Importe ta propre image de référence.</p></div></div>
 <div class="feature-row"><div class="feature-icon">▦</div><div><strong>Looks sauvegardés</strong><p>Positions, tailles, pièces et miniature.</p></div></div>
 <div class="feature-row"><div class="feature-icon">⇩</div><div><strong>Sauvegarde complète</strong><p>Un fichier exportable, avec toutes tes photos.</p></div></div></div></section></div>
 ${recent?`<section style="margin-top:18px"><div class="section-head"><h2>Dernière tenue</h2>${button('open-looks','Voir les tenues','small ghost')}</div><div class="grid-cards">${outfitCard(recent)}</div></section>`:''}`;
}
function photo(id,klass=''){const u=urlFor(id);return u?`<img class="${klass}" src="${u}" alt="" loading="lazy">`:`<span aria-hidden="true">◈</span>`}
function garmentCard(g){return `<button type="button" class="item-card" data-act="edit-garment" data-id="${g.id}"><div class="item-photo ${g.imageId?'':'placeholder'}">${photo(g.imageId)}</div><div class="item-info"><strong>${esc(g.name)}</strong><p>${esc(SLOTS[g.category]?.label||g.category)} · ${esc(g.color||'Couleur non précisée')}</p>${(g.occasions||[]).slice(0,2).map(x=>`<span class="tag">${esc(x)}</span>`).join('')}</div></button>`}
function wardrobeView(){
 const filter=garments.filter(g=>(selectedCategory==='all'||g.category===selectedCategory)&&(selectedOccasion==='all'||(g.occasions||[]).includes(selectedOccasion))&&[g.name,g.color,g.brand,g.material,g.style].join(' ').toLowerCase().includes(query.toLowerCase()));
 return heading('GARDER · CLASSER · RETROUVER','Mon dressing','Toutes tes pièces, leurs caractéristiques, et les occasions auxquelles elles conviennent.',button('add-garment','＋ Ajouter une pièce'))+
 `<div class="toolbar"><input class="input" id="search-wardrobe" type="search" value="${esc(query)}" placeholder="Rechercher un vêtement, une marque, une matière…"><select class="select" id="filter-occasion"><option value="all">Toutes les occasions</option>${OCCASIONS.map(x=>`<option ${x===selectedOccasion?'selected':''}>${esc(x)}</option>`).join('')}</select></div>
 <div class="chips" style="margin-bottom:18px"><button class="chip ${selectedCategory==='all'?'active':''}" data-category="all">Tout (${garments.length})</button>${CATEGORIES.map(([id,label])=>`<button class="chip ${selectedCategory===id?'active':''}" data-category="${id}">${label} (${garments.filter(g=>g.category===id).length})</button>`).join('')}</div>
 ${filter.length?`<div class="grid-cards">${filter.map(garmentCard).join('')}</div>`:`<div class="empty"><div class="empty-icon">♧</div><h3>${garments.length?'Aucun vêtement trouvé':'Ta garde-robe commence ici'}</h3><p>${garments.length?'Essaie un autre filtre.':'Ajoute tes photos de vêtements, ou charge quelques pièces fictives pour découvrir le Studio.'}</p>${button('add-garment','Ajouter un vêtement')}${garments.length?'':` ${button('load-demo','Charger une démo','ghost')}`}</div>`}`;
}
const fallbackMannequin=`<svg viewBox="0 0 240 510" aria-label="Silhouette provisoire"><defs><linearGradient id="skin" x1="0" x2="1"><stop stop-color="#aeb9a8"/><stop offset="1" stop-color="#889a88"/></linearGradient></defs><ellipse cx="120" cy="36" rx="29" ry="33" fill="url(#skin)"/><path d="M102 64 H138 L146 89 L173 97 L186 164 L173 228 L164 223 L163 158 L159 147 L157 254 L139 269 L140 391 L134 478 H107 L105 391 L102 271 L84 257 L83 147 L77 160 L77 221 L65 229 L53 169 L65 98 L95 89 Z" fill="#9eac9b" stroke="#869687" stroke-width="2"/><path d="M103 267 L120 280 L140 267" stroke="#809282" stroke-width="3" fill="none"/><path d="M110 478 L105 490 L87 493 L83 502 H128 L133 482" fill="#819484"/><path d="M134 478 L140 490 L160 493 L164 502 H120 L116 482" fill="#819484"/></svg>`;
function baseDraft(){return{top:null,bottom:null,outerwear:null,footwear:null,accessory:null}}
function pieceEntries(){return Object.entries(draft).filter(([slot,item])=>SLOTS[slot]&&item&&garments.some(g=>g.id===item.garmentId))}
function stageHTML(){
 const murl=urlFor(prefs.mannequinId);
 return `<div class="stage" id="stage"><div class="mannequin">${murl?`<img src="${murl}" alt="Mannequin personnalisé">`:fallbackMannequin}</div>${pieceEntries().map(([slot,item])=>{
  const g=garments.find(x=>x.id===item.garmentId),def=SLOTS[slot],u=urlFor(g.imageId);
  return `<div class="piece-layer ${studioSlot===slot?'selected':''}" data-drag-slot="${slot}" style="left:${item.x}%;top:${item.y}%;width:${def.w}%;height:${def.h}%;--scale:${item.scale};z-index:${def.z}">${u?`<img src="${u}" alt="${esc(g.name)}" draggable="false">`:`<span>${esc(g.name)}</span>`}</div>`
 }).join('')}</div>`;
}
function studioView(){
 const selected=draft[studioSlot];const candidates=garments.filter(g=>g.category===studioSlot);
 return heading('LE CŒUR DU VESTIAIRE','Studio de tenues','Compose ton look sur un mannequin de référence. Sélectionne une zone, ajoute une pièce, puis ajuste son placement.',button('new-look','Nouvelle tenue','ghost')+button('save-look','Enregistrer la tenue'))+
 `<div class="studio-grid"><section class="studio-stage-shell"><div class="stage-label"><span>CANEVAS · ${editingOutfit?'MODIFICATION':'NOUVELLE TENUE'}</span><span>${pieceEntries().length} PIÈCE(S)</span></div>${stageHTML()}<div class="stage-footnote">Glisse directement un vêtement pour ajuster son placement.</div></section>
 <section class="editor-panel"><div class="eyebrow">01 · STRUCTURE</div><h3>Choisis une zone</h3><p class="hint">Chaque catégorie se place automatiquement sur le mannequin.</p><div class="slot-picker">${Object.entries(SLOTS).map(([slot,def])=>`<button type="button" class="slot-btn ${studioSlot===slot?'selected':''}" data-slot="${slot}"><strong>${def.sign}</strong>${esc(def.label)}</button>`).join('')}</div>
 <div class="eyebrow" style="margin-top:23px">02 · PIÈCES DU DRESSING</div><h3>${esc(SLOTS[studioSlot].label)}</h3>
 <p class="hint">${candidates.length?`${candidates.length} pièce(s) disponible(s). Touche-en une pour l'ajouter.`:'Ajoute d’abord un vêtement dans cette catégorie.'}</p>
 <div class="palette">${candidates.map(g=>`<button class="palette-item ${selected?.garmentId===g.id?'active':''}" data-pick="${g.id}">${photo(g.imageId)}<span>${esc(g.name)}</span></button>`).join('')}</div>
 ${!garments.length?`<div style="margin-top:16px">${button('load-demo','Charger des vêtements de démonstration','ghost block')}</div>`:''}
 <div class="eyebrow" style="margin-top:23px">03 · FINITIONS</div><h3>Position et échelle</h3>
 <div class="editor-control"><label for="piece-scale">Taille du vêtement <span id="scale-value">${Math.round((selected?.scale||1)*100)} %</span></label><input id="piece-scale" type="range" min="45" max="190" value="${Math.round((selected?.scale||1)*100)}" ${selected?'':'disabled'}></div>
 <div class="editor-actions">${button('center-piece','Recentrer','ghost small')}${button('remove-piece','Retirer cette pièce','danger small')}${button('add-garment','＋ Nouveau vêtement','soft small')}</div>
 <div class="notice" style="margin-top:22px">Les photos à fond transparent donnent les meilleurs résultats. Ce Studio est une composition visuelle, pas un essayage virtuel réaliste.</div>
 </section></div>`;
}
function outfitCard(o){const src=urlFor(o.thumbnailId);return `<button class="item-card look-card" data-act="edit-look" data-id="${o.id}"><div class="item-photo ${src?'':'placeholder'}">${src?`<img class="look-preview" src="${src}" alt="Aperçu de la tenue">`:'◈'}<span class="look-overlay">${esc(o.occasion||'Sans occasion')}</span></div><div class="item-info"><strong>${esc(o.name)}</strong><p>${Object.values(o.layers||{}).filter(Boolean).length} pièces · ${esc(o.style||'Style libre')}</p></div></button>`}
function looksView(){const list=outfits.filter(o=>selectedOccasion==='all'||o.occasion===selectedOccasion);return heading('TES COMPOSITIONS','Mes tenues','Retrouve exactement les compositions que tu as enregistrées et réouvre-les dans le Studio.',button('new-look','＋ Créer une tenue'))+
 `<div class="toolbar"><select id="filter-occasion" class="select"><option value="all">Toutes les occasions</option>${OCCASIONS.map(x=>`<option ${x===selectedOccasion?'selected':''}>${x}</option>`).join('')}</select></div>`+
 (list.length?`<div class="grid-cards">${list.map(outfitCard).join('')}</div>`:`<div class="empty"><div class="empty-icon">▦</div><h3>${outfits.length?'Aucune tenue pour ce filtre':'Tes futurs looks apparaîtront ici'}</h3><p>Crée ton premier look dans le Studio, puis enregistre-le.</p>${button('open-studio','Ouvrir le Studio')}</div>`);
}
function settingsView(){return heading('CONFIDENTIALITÉ & SAUVEGARDES','Réglages','Tes photos sont actuellement enregistrées sur cet appareil uniquement. Aucun compte ni transfert vers Cloudflare.')+
 `<div class="settings-grid"><section class="panel"><div class="panel-header"><h2>Ton mannequin</h2></div><p class="muted">Ajoute l’image de référence que tu souhaites retrouver derrière chacune de tes tenues.</p>
 <div style="height:150px;max-width:130px;overflow:hidden;background:#f2f3ef;border-radius:12px;display:grid;place-items:center;margin:15px 0">${prefs.mannequinId?`<img src="${urlFor(prefs.mannequinId)}" alt="Mannequin actuel" style="max-width:100%;max-height:100%;object-fit:contain">`:`<span style="color:#a4b5a2;font-size:55px">♙</span>`}</div>
 <div class="settings-actions">${button('upload-mannequin','Importer mon mannequin','soft')}${prefs.mannequinId?button('remove-mannequin','Revenir à la silhouette provisoire','ghost'):''}</div>
 <p class="section-note" style="margin-top:13px">Préférence : PNG transparent ou WebP, image verticale de face.</p></section>
 <section class="panel"><div class="panel-header"><h2>Stockage local</h2></div><div id="storage-status" class="notice">Analyse de l’espace disponible…</div>
 <div class="settings-actions">${button('persist-storage','Protéger le stockage local','soft')}</div><p class="section-note" style="margin-top:14px">Le mode persistant peut limiter l’effacement automatique des données, mais ne remplace jamais une sauvegarde externe.</p></section>
 <section class="panel"><div class="panel-header"><h2>Sauvegardes complètes</h2></div><div class="notice">Exportation au format <strong>.vestiaire</strong> : vêtements, photographies, mannequin et looks sauvegardés. Conserve une copie dans Fichiers / iCloud Drive ou sur ton Mac.</div>
 <div class="settings-actions">${button('export-backup','⇩ Exporter une sauvegarde')}${button('import-backup','⇧ Restaurer une sauvegarde','ghost')}</div><p class="section-note" style="margin-top:13px">Dernier export lancé : ${prefs.lastBackupAt?esc(formatDate(prefs.lastBackupAt)):'aucun'}. La copie externe doit être vérifiée dans Fichiers.</p></section>
 <section class="panel"><div class="panel-header"><h2>À venir · NEXUS LINK</h2></div><p class="muted">La V1.2 pourra associer les tenues à l’agenda NEXUS, puis proposer des looks selon « Restaurant », « Travail », « Soirée » et les autres occasions autorisées.</p>
 <div class="notice" style="margin-top:17px">Aucune synchronisation distante n’est activée dans ce prototype. Les photos ne sont pas envoyées sur GitHub ou Cloudflare.</div>
 <div class="settings-actions">${button('clear-data','Effacer toutes les données','danger')}</div></section></div>`}
function modal(title,content){$('modal-root').innerHTML=`<div class="modal-backdrop" data-close="outside"><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header><h2>${esc(title)}</h2><button type="button" class="modal-close" data-act="close-modal" aria-label="Fermer">×</button></header>${content}</div></div>`}
function closeModal(){$('modal-root').innerHTML=''}
function checklist(name,values,selected){return `<div class="check-grid">${values.map(v=>`<label class="check-pill"><input type="checkbox" name="${esc(name)}" value="${esc(v)}" ${selected.includes(v)?'checked':''}>${esc(v)}</label>`).join('')}</div>`}
function field(label,name,value='',placeholder=''){return `<label class="field"><span>${esc(label)}</span><input class="input" name="${esc(name)}" value="${esc(value)}" placeholder="${esc(placeholder)}" maxlength="110"></label>`}
function garmentModal(id=null){
 const g=id?garments.find(x=>x.id===id):null;
 modal(g?'Modifier le vêtement':'Ajouter un vêtement',`<form id="garment-form"><input type="hidden" name="id" value="${g?.id||''}">
 <label class="field"><span>Photo ${g?.imageId?'(optionnelle pour remplacer l’actuelle)':''}</span><div class="file-upload"><input type="file" name="photo" accept="image/*" ${g?'':'required'}></div><small class="hint">L'image sera compressée et conservée sur ton appareil.</small></label>
 ${field('Nom du vêtement','name',g?.name||'','Ex. Polo en maille beige')}
 <div class="fields-two"><label class="field"><span>Catégorie</span><select class="select" name="category" required>${CATEGORIES.map(([v,label])=>`<option value="${v}" ${g?.category===v?'selected':''}>${label}</option>`).join('')}</select></label>
 ${field('Couleur','color',g?.color||'','Ex. Beige sable')}</div>
 <div class="fields-two">${field('Matière','material',g?.material||'','Ex. Coton')}${field('Coupe','fit',g?.fit||'','Ex. Regular')}</div>
 <div class="fields-two">${field('Marque','brand',g?.brand||'','Facultatif')}${field('Taille','size',g?.size||'','Ex. M')}</div>
 <label class="field"><span>Style principal</span><select class="select" name="style">${STYLES.map(x=>`<option ${g?.style===x?'selected':''}>${x}</option>`).join('')}</select></label>
 <label class="field"><span>Occasions compatibles</span>${checklist('occasion',OCCASIONS,g?.occasions||[])}</label>
 <label class="field"><span>Saisons compatibles</span>${checklist('season',SEASONS,g?.seasons||[])}</label>
 <label class="field"><span>Notes</span><textarea class="textarea" rows="2" name="notes" maxlength="400">${esc(g?.notes||'')}</textarea></label>
 <div class="form-footer">${g?button('delete-garment','Supprimer','danger'):''}<button class="btn" type="submit">${g?'Enregistrer les modifications':'Ajouter au dressing'}</button></div></form>`);
}
async function saveGarment(form){
 if(working)return;working=true;
 try{
  const values=new FormData(form),old=garments.find(g=>g.id===values.get('id'));
  const name=clean(values.get('name'),110),category=values.get('category');if(!name||!SLOTS[category])throw Error('Nom et catégorie obligatoires');
  const file=values.get('photo');let imageId=old?.imageId||null;
  if(file&&file.size)imageId=await storeImage(file);
  if(!imageId)throw Error('Choisis une photo de vêtement');
  const g={id:old?.id||uid(),name,category,imageId,color:clean(values.get('color'),80),material:clean(values.get('material'),80),fit:clean(values.get('fit'),80),brand:clean(values.get('brand'),80),size:clean(values.get('size'),40),style:STYLES.includes(values.get('style'))?values.get('style'):'Autre',notes:clean(values.get('notes'),400),occasions:sanitizeList(values.getAll('occasion'),OCCASIONS),seasons:sanitizeList(values.getAll('season'),SEASONS),createdAt:old?.createdAt||dateNow(),updatedAt:dateNow()};
  await save('garments',g);await reload();await pruneMedia();closeModal();render();toast(old?'Vêtement modifié.':'Pièce ajoutée au dressing.');
 }finally{working=false}
}
async function deleteGarment(id){const g=garments.find(x=>x.id===id);if(!g)return;if(!confirm(`Supprimer « ${g.name} » ? Cette pièce disparaîtra aussi des compositions qui l’utilisent.`))return;
 await remove('garments',id);for(const o of outfits){let changed=false;for(const [slot,layer] of Object.entries(o.layers||{}))if(layer?.garmentId===id){o.layers[slot]=null;changed=true}if(changed){o.updatedAt=dateNow();await save('outfits',o)}}
 for(const [slot,l] of Object.entries(draft))if(l?.garmentId===id)draft[slot]=null;
 await reload();await pruneMedia();closeModal();render();toast('Vêtement supprimé.')}
function place(slot,id){const def=SLOTS[slot],old=draft[slot];draft[slot]={garmentId:id,x:old?.x??def.x,y:old?.y??def.y,scale:old?.scale??1};render()}
function setSlot(slot){if(!SLOTS[slot])return;studioSlot=slot;render()}
function newLook(){draft=baseDraft();editingOutfit=null;studioSlot='top';navigate('studio')}
function editLook(id){const o=outfits.find(x=>x.id===id);if(!o)return;editingOutfit=id;draft={...baseDraft(),...structuredClone(o.layers)};studioSlot='top';navigate('studio')}
async function previewImage(){
 const stage=$('stage');const w=720,h=900;
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#f2f2ed';ctx.fillRect(0,0,w,h);
 const imageFrom=async blob=>{const u=URL.createObjectURL(blob);try{const im=new Image();im.src=u;await im.decode();return im}finally{URL.revokeObjectURL(u)}};
 async function drawCover(blob,x,y,bw,bh){const im=await imageFrom(blob);const ratio=Math.min(bw/im.naturalWidth,bh/im.naturalHeight);const iw=im.naturalWidth*ratio,ih=im.naturalHeight*ratio;ctx.drawImage(im,x+(bw-iw)/2,y+(bh-ih)/2,iw,ih)}
 if(prefs.mannequinId&&media.get(prefs.mannequinId))await drawCover(media.get(prefs.mannequinId).blob,w*.19,h*.03,w*.62,h*.92);
 else{ctx.fillStyle='#d1d8cc';ctx.beginPath();ctx.ellipse(w*.5,h*.13,45,55,0,0,Math.PI*2);ctx.fill();ctx.fillRect(w*.39,h*.23,w*.22,h*.38);ctx.fillRect(w*.4,h*.6,w*.09,h*.3);ctx.fillRect(w*.51,h*.6,w*.09,h*.3)}
 for(const [slot,item] of pieceEntries().sort(([a],[b])=>SLOTS[a].z-SLOTS[b].z)){
  const g=garments.find(x=>x.id===item.garmentId),blob=media.get(g.imageId)?.blob;if(!blob)continue;
  const def=SLOTS[slot],tw=w*def.w/100*item.scale,th=h*def.h/100*item.scale;
  await drawCover(blob,w*item.x/100-tw/2,h*item.y/100-th/2,tw,th);
 }
 return new Promise((resolve,reject)=>canvas.toBlob(x=>x?resolve(x):reject(Error('Aperçu impossible')),'image/webp',.84));
}
function saveLookModal(){if(!pieceEntries().length){toast('Ajoute au moins une pièce avant de sauvegarder.');return}
 const o=outfits.find(x=>x.id===editingOutfit);
 modal(o?'Modifier la tenue':'Enregistrer la tenue',`<form id="look-form">${field('Nom de la tenue','name',o?.name||'','Ex. Restaurant chic décontracté')}
 <label class="field"><span>Occasion principale</span><select class="select" name="occasion">${['Libre',...OCCASIONS].map(x=>`<option ${o?.occasion===x?'selected':''}>${x}</option>`).join('')}</select></label>
 <label class="field"><span>Style</span><select class="select" name="style">${STYLES.map(x=>`<option ${o?.style===x?'selected':''}>${x}</option>`).join('')}</select></label>
 <label class="field"><span>Notes</span><textarea name="notes" class="textarea" rows="3" maxlength="400">${esc(o?.notes||'')}</textarea></label>
 <div class="form-footer">${o?button('delete-look','Supprimer cette tenue','danger'):''}<button type="submit" class="btn">Enregistrer la composition</button></div></form>`)}
async function saveLook(form){if(working)return;working=true;try{const v=new FormData(form),name=clean(v.get('name'),110);if(!name)throw Error('Donne un nom à la tenue');
 const old=outfits.find(o=>o.id===editingOutfit);const thumbnailId=await storeThumbnail(await previewImage());
 const o={id:old?.id||uid(),name,occasion:OCCASIONS.includes(v.get('occasion'))?v.get('occasion'):'Libre',style:STYLES.includes(v.get('style'))?v.get('style'):'Autre',notes:clean(v.get('notes'),400),layers:structuredClone(draft),thumbnailId,createdAt:old?.createdAt||dateNow(),updatedAt:dateNow()};
 await save('outfits',o);editingOutfit=o.id;await reload();await pruneMedia();closeModal();render();toast('Tenue enregistrée avec sa composition et son aperçu.');
 }finally{working=false}}
async function storeThumbnail(blob){const r={id:uid(),blob,size:blob.size,type:blob.type,createdAt:dateNow()};await save('media',r);media.set(r.id,r);return r.id}
async function deleteLook(){const o=outfits.find(x=>x.id===editingOutfit);if(!o)return;if(!confirm('Supprimer définitivement cette tenue ? Tes vêtements resteront dans le dressing.'))return;await remove('outfits',o.id);editingOutfit=null;draft=baseDraft();await reload();await pruneMedia();closeModal();navigate('looks');toast('Tenue supprimée.')}
async function importMannequin(file){if(!file?.size)return;const id=await storeImage(file,1600);prefs.mannequinId=id;await save('prefs',prefs);await reload();await pruneMedia();render();toast('Ton mannequin est enregistré. Le Studio l’utilisera automatiquement.')}
async function persistStorage(){const p=await navigator.storage?.persist?.();toast(p?'Stockage persistant accepté par le navigateur.':'Persistance non confirmée. Fais régulièrement des sauvegardes.') ;refreshStorageStatus()}
async function refreshStorageStatus(){const box=$('storage-status');if(!box)return;try{const info=await navigator.storage?.estimate?.(),persistent=await navigator.storage?.persisted?.();if(!box.isConnected)return;
 const bytes=info?.usage||0,quota=info?.quota||0;box.innerHTML=`<strong>Stockage utilisé : ${prettyBytes(bytes)}</strong><div>Capacité estimée : ${quota?prettyBytes(quota):'indéterminée'}</div><div>Mode persistant : ${persistent?'activé':'non confirmé'}</div><div>${garments.length} pièces · ${outfits.length} tenues · ${media.size} images optimisées</div>`;
 }catch{box.textContent='Impossible de mesurer le stockage sur cet appareil.'}}
const prettyBytes=n=>n>1e9?(n/1e9).toFixed(2)+' Go':n>1e6?(n/1e6).toFixed(1)+' Mo':n>1e3?(n/1e3).toFixed(0)+' Ko':n+' octets';
const sha=async blob=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(b=>b.toString(16).padStart(2,'0')).join('');
async function exportBackup(){if(working)return;working=true;toast('Préparation de la sauvegarde complète…');try{
 const records=[...media.values()].sort((a,b)=>a.id.localeCompare(b.id));let payload=[];
 for(const x of records)payload.push({id:x.id,size:x.blob.size,type:x.blob.type,sha256:await sha(x.blob),createdAt:x.createdAt});
 const header={app:'VESTIAIRE',format:1,exportedAt:dateNow(),state:{garments,outfits,prefs},media:payload};
 const bytes=new TextEncoder().encode(JSON.stringify(header));if(bytes.length>10_000_000)throw Error('Trop de métadonnées pour le format de sauvegarde.');
 const prefix=new Uint8Array(8);prefix.set([86,83,84,49],0);new DataView(prefix.buffer).setUint32(4,bytes.length,true);
 const file=new Blob([prefix,bytes,...records.map(x=>x.blob)],{type:'application/octet-stream'});
 const a=document.createElement('a'),u=URL.createObjectURL(file);a.href=u;a.download='vestiaire-sauvegarde-'+new Date().toISOString().slice(0,10)+'.vestiaire';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),20000);
 prefs.lastBackupAt=dateNow();await save('prefs',prefs);render();toast('Export lancé : vérifie le fichier et conserve-le dans Fichiers ou iCloud Drive.');
 }finally{working=false}}
const validId=x=>typeof x==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(x);
function validateBackupState(s,blobIds){
 const garmentIds=new Set(),lookIds=new Set();
 for(const g of s.garments){
  if(!g||!validId(g.id)||garmentIds.has(g.id)||!SLOTS[g.category]||!validId(g.imageId)||!blobIds.has(g.imageId)||
     typeof g.name!=='string'||g.name.length>110||typeof g.color!=='string'||g.color.length>80||
     !Array.isArray(g.occasions)||!Array.isArray(g.seasons))throw Error('Fiche vêtement invalide');
  garmentIds.add(g.id);
 }
 for(const o of s.outfits){
  if(!o||!validId(o.id)||lookIds.has(o.id)||typeof o.name!=='string'||o.name.length>110||
     !o.layers||typeof o.layers!=='object'||Array.isArray(o.layers)||
     o.thumbnailId!=null&&(!validId(o.thumbnailId)||!blobIds.has(o.thumbnailId)))throw Error('Fiche tenue invalide');
  lookIds.add(o.id);
  for(const [slot,item] of Object.entries(o.layers)){
   if(!SLOTS[slot]||item===null)continue;
   if(!item||!validId(item.garmentId)||!garmentIds.has(item.garmentId)||
      !Number.isFinite(item.x)||item.x<0||item.x>100||!Number.isFinite(item.y)||item.y<0||item.y>100||
      !Number.isFinite(item.scale)||item.scale<.45||item.scale>1.9)throw Error('Position de tenue invalide');
  }
 }
 if(!s.prefs||typeof s.prefs!=='object'||s.prefs.mannequinId!=null&&(!validId(s.prefs.mannequinId)||!blobIds.has(s.prefs.mannequinId)))throw Error('Mannequin invalide');
}
async function pruneMedia(){
 const wanted=new Set([prefs.mannequinId,...garments.map(x=>x.imageId),...outfits.map(x=>x.thumbnailId)].filter(Boolean));
 const unused=[...media.keys()].filter(id=>!wanted.has(id));if(!unused.length)return 0;
 await transact(['media'],'readwrite',tx=>unused.forEach(id=>tx.objectStore('media').delete(id)));
 await reload();return unused.length;
}
async function restoreBackup(file){if(!file)return;if(working)return;working=true;toast('Vérification de la sauvegarde…');try{
 if(file.size<8)throw Error('Fichier trop court');const p=new Uint8Array(await file.slice(0,8).arrayBuffer());if(String.fromCharCode(...p.slice(0,4))!=='VST1')throw Error('Ce fichier n’est pas une sauvegarde VESTIAIRE');
 const headerSize=new DataView(p.buffer).getUint32(4,true);if(headerSize>10_000_000||8+headerSize>file.size)throw Error('En-tête de sauvegarde invalide');
 const header=JSON.parse(await file.slice(8,8+headerSize).text());const s=header.state;
 if(header.app!=='VESTIAIRE'||header.format!==1||!s||!Array.isArray(s.garments)||!Array.isArray(s.outfits)||!Array.isArray(header.media)||!s.prefs||s.garments.length>20000||s.outfits.length>50000||header.media.length>100000)throw Error('Structure de sauvegarde incorrecte');
 let offset=8+headerSize;const loaded=[];
 const ids=new Set();for(const x of header.media){if(typeof x.id!=='string'||!x.id||ids.has(x.id)||!Number.isSafeInteger(x.size)||x.size<0||x.size>30_000_000||offset+x.size>file.size||typeof x.sha256!=='string'||!/^[a-f0-9]{64}$/.test(x.sha256))throw Error('Image de sauvegarde incorrecte');
  ids.add(x.id);const blob=file.slice(offset,offset+x.size,x.type||'image/webp');if(await sha(blob)!==x.sha256)throw Error('Intégrité des photos invalide : restauration annulée');
  loaded.push({id:x.id,size:x.size,type:x.type,createdAt:x.createdAt,blob});offset+=x.size;
 }
 if(offset!==file.size)throw Error('Sauvegarde tronquée ou contenant des données inattendues');
 validateBackupState(s,ids);
 if(!confirm(`Restaurer ${s.garments.length} vêtements et ${s.outfits.length} tenues ? Toutes les données actuelles seront remplacées.`))return;
 await transact(STORES,'readwrite',tx=>{for(const name of STORES)tx.objectStore(name).clear();for(const g of s.garments)tx.objectStore('garments').put(g);for(const o of s.outfits)tx.objectStore('outfits').put(o);for(const x of loaded)tx.objectStore('media').put(x);tx.objectStore('prefs').put({...s.prefs,id:'main'})});
 await reload();closeModal();view='home';draft=baseDraft();editingOutfit=null;render();toast('Sauvegarde vérifiée et restaurée avec toutes les images.');
 }finally{working=false;$('restore-file').value=''}}
async function clearData(){if(!confirm('Effacer toutes les tenues, photos et vêtements de cet appareil ? Fais d’abord une sauvegarde.'))return;if(!confirm('Dernière confirmation : cette action est irréversible sans fichier de sauvegarde.'))return;
 await transact(STORES,'readwrite',tx=>{for(const name of STORES)tx.objectStore(name).clear()});await reload();draft=baseDraft();editingOutfit=null;navigate('home');toast('Données locales effacées.')}
function svgGarment(kind,color){
 const shapes={top:'<path d="M74 37 L116 18 H142 L184 37 L223 73 L189 112 L169 91 V235 H87 V91 L67 112 L33 73 Z"/>',outerwear:'<path d="M73 25 L116 12 L127 40 L138 12 L183 25 L228 72 L190 111 L173 90 L173 239 H83 V90 L66 111 L28 72 Z"/><path d="M127 39 V236" stroke="#fff" fill="none" stroke-width="3"/>',bottom:'<path d="M72 20 H185 L200 225 H142 L127 103 L114 225 H56 Z"/>',footwear:'<path d="M26 111 Q70 108 95 69 L123 88 L155 143 H232 Q242 143 242 169 Q239 185 219 186 H33 Q20 181 20 169 Z"/>',accessory:'<ellipse cx="128" cy="128" rx="75" ry="75"/><ellipse cx="128" cy="128" rx="43" ry="43" fill="#f7f7f1"/>'};
 return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 256 256"><g fill="${color}" stroke="#283128" stroke-width="3" stroke-linejoin="round">${shapes[kind]||shapes.top}</g></svg>`
}
async function loadDemo(){if(garments.length&&!confirm('Ajouter des vêtements fictifs de démonstration à ton dressing ?'))return;
 const list=[['Polo beige','top','#c5b08a','Beige','Coton','Old money',['Restaurant','Travail','Casual']],['T-shirt blanc','top','#f1f1e9','Blanc','Coton','Minimaliste',['Casual','Voyage']],['Pantalon marine','bottom','#424c65','Marine','Laine','Smart casual',['Restaurant','Travail']],['Chino sable','bottom','#c6ab83','Sable','Coton','Classique',['Travail','Casual']],['Veste bleu nuit','outerwear','#34445f','Marine','Coton','Old money',['Restaurant','Soirée']],['Sneakers crème','footwear','#e7e3d8','Crème','Cuir','Minimaliste',['Casual','Voyage']],['Montre argentée','accessory','#929b9c','Argent','Acier','Classique',['Restaurant','Travail']]];
 for(const [name,category,colorHex,color,material,style,occasions] of list){const blob=new Blob([svgGarment(category,colorHex)],{type:'image/svg+xml'});
 const record={id:uid(),blob,size:blob.size,type:blob.type,createdAt:dateNow()};await save('media',record);
 const g={id:uid(),name,category,imageId:record.id,color,material,fit:'Regular',brand:'Démonstration',size:'M',style,notes:'Pièce fictive. Tu peux la supprimer.',occasions,seasons:['Toute l’année'],createdAt:dateNow(),updatedAt:dateNow()};await save('garments',g);
 }
 await reload();render();toast('7 pièces de démonstration ajoutées. Tu peux tester le Studio !')}

// One event-delegation layer keeps the interface functional after every render.
document.addEventListener('click',async e=>{
 try{
  const nav=e.target.closest('[data-nav]');if(nav){navigate(nav.dataset.nav);return}
  if(e.target.closest('[data-close="outside"]')&&e.target===e.target.closest('[data-close="outside"]')){closeModal();return}
  const cat=e.target.closest('[data-category]');if(cat){selectedCategory=cat.dataset.category;render();return}
  const slot=e.target.closest('[data-slot]');if(slot){setSlot(slot.dataset.slot);return}
  const pick=e.target.closest('[data-pick]');if(pick){place(studioSlot,pick.dataset.pick);return}
  const target=e.target.closest('[data-act]');if(!target)return;const action=target.dataset.act;
  if(action==='close-modal')closeModal();
  else if(action==='open-studio')navigate('studio');
  else if(action==='open-looks')navigate('looks');
  else if(action==='add-garment')garmentModal();
  else if(action==='edit-garment')garmentModal(target.dataset.id);
  else if(action==='delete-garment')await deleteGarment($('garment-form')?.querySelector('[name=id]')?.value);
  else if(action==='load-demo')await loadDemo();
  else if(action==='new-look')newLook();
  else if(action==='edit-look')editLook(target.dataset.id);
  else if(action==='save-look')saveLookModal();
  else if(action==='delete-look')await deleteLook();
  else if(action==='remove-piece'){draft[studioSlot]=null;render()}
  else if(action==='center-piece'&&draft[studioSlot]){draft[studioSlot].x=SLOTS[studioSlot].x;draft[studioSlot].y=SLOTS[studioSlot].y;render()}
  else if(action==='upload-mannequin')$('mannequin-file').click();
  else if(action==='remove-mannequin'){prefs.mannequinId=null;await save('prefs',prefs);await pruneMedia();render();toast('Silhouette provisoire rétablie.')}
  else if(action==='persist-storage')await persistStorage();
  else if(action==='export-backup')await exportBackup();
  else if(action==='import-backup')$('restore-file').click();
  else if(action==='clear-data')await clearData();
 }catch(err){error(err)}
});
document.addEventListener('submit',async e=>{
 if(e.target.id==='garment-form'){e.preventDefault();try{await saveGarment(e.target)}catch(err){error(err)}}
 if(e.target.id==='look-form'){e.preventDefault();try{await saveLook(e.target)}catch(err){error(err)}}
});
document.addEventListener('input',e=>{
 if(e.target.id==='search-wardrobe'){query=e.target.value;const pos=e.target.selectionStart;render();const input=$('search-wardrobe');input?.focus();input?.setSelectionRange(pos,pos)}
 if(e.target.id==='piece-scale'&&draft[studioSlot]){draft[studioSlot].scale=clamp(Number(e.target.value)/100,.45,1.9);const layer=document.querySelector(`[data-drag-slot="${studioSlot}"]`);if(layer)layer.style.setProperty('--scale',draft[studioSlot].scale);$('scale-value').textContent=e.target.value+' %'}
});
document.addEventListener('change',e=>{if(e.target.id==='filter-occasion'){selectedOccasion=e.target.value;render()}});
$('header-add').addEventListener('click',()=>garmentModal());
$('restore-file').addEventListener('change',async e=>{try{await restoreBackup(e.target.files?.[0])}catch(err){error(err)}});
$('mannequin-file').addEventListener('change',async e=>{try{await importMannequin(e.target.files?.[0])}catch(err){error(err)}finally{e.target.value=''}});
// Pointer Events unify touch and mouse. Studio stores positions as percentages of the canvas.
document.addEventListener('pointerdown',e=>{
 const layer=e.target.closest('[data-drag-slot]');if(!layer||view!=='studio')return;
 const slot=layer.dataset.dragSlot;if(!draft[slot])return;
 studioSlot=slot;const stage=$('stage').getBoundingClientRect();dragged={pointerId:e.pointerId,slot,startX:e.clientX,startY:e.clientY,x:draft[slot].x,y:draft[slot].y,w:stage.width,h:stage.height,el:layer};
 layer.setPointerCapture(e.pointerId);e.preventDefault();
});
document.addEventListener('pointermove',e=>{
 if(!dragged||e.pointerId!==dragged.pointerId)return;
 const p=dragged,item=draft[p.slot];if(!item)return;
 item.x=clamp(p.x+(e.clientX-p.startX)/p.w*100,0,100);item.y=clamp(p.y+(e.clientY-p.startY)/p.h*100,0,100);
 p.el.style.left=item.x+'%';p.el.style.top=item.y+'%';
});
function endDrag(e){if(!dragged||e.pointerId!==dragged.pointerId)return;dragged=null;render()}
document.addEventListener('pointerup',endDrag);document.addEventListener('pointercancel',endDrag);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
window.addEventListener('pagehide',clearURLs);
Object.assign(window,{VESTIAIRE_DEBUG:{version:'0.1',getState:()=>({garments:structuredClone(garments),outfits:structuredClone(outfits),prefs:structuredClone(prefs)})}});
draft=baseDraft();init();
})();
