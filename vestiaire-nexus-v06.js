(function vestiaireNexusV06(){
 'use strict';
 let api=null,busy=false,timer=null,lifecycleBound=false,lastHubAttempt=0;
 const MAX_LOOKS=24;
 const MAX_PAYLOAD=5500;
 const MAX_PAGES=200; // Relay supports up to 250 pending encrypted events per connection.
 const CORE=()=>window.NexusLinkCore;
 const safe=s=>api?.esc?.(s)??String(s??'').replace(/[&<>"']/g,'');
 const current=()=>api?.getPrefs?.().nexusLink||null;
 const connected=()=>current()?.pair?.sourceApp==='vestiaire'&&current().pair.scopes?.includes('outfit_catalog');
 const clear=()=>{if(timer)clearTimeout(timer);timer=null;};
 function summarize(looks,garments){
  const byId=new Map(garments.map(g=>[g.id,g]));
  return looks.slice().sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))).map(o=>{
   const layers=Object.values(o.layers||{}).filter(Boolean);
   const pieces=layers.map(layer=>byId.get(layer.garmentId));
   const available=pieces.length>0&&pieces.every(g=>g&&(!g.availability||g.availability==='available'));
   const outer=pieces.some(g=>g?.category==='outerwear');
   const warm=pieces.some(g=>/laine|wool|cachemire|mohair|polaire|fleece/i.test(g?.material||''));
   const light=pieces.some(g=>/lin|linen/i.test(g?.material||''));
   const warmth=Math.min(3,Math.max(0,1+Number(outer)+Number(warm)-Number(light)));
   return {id:String(o.id||'').slice(0,100),name:String(o.name||'Tenue').slice(0,85),
    occasion:String(o.occasion||'Libre').slice(0,25),style:String(o.style||'Autre').slice(0,25),
    available,warmth,updatedAt:String(o.updatedAt||'').slice(0,30)};
  }).filter(x=>x.id&&x.name);
 }
 // Each page is an independent encrypted event with a shared batch/revision.
 const sampleMeta={type:'vestiaire.catalog.page.v2',sourceApp:'vestiaire',batchId:'00000000-0000-4000-8000-000000000000',
  revision:1000000,pageIndex:999,pageCount:999,total:50000,sharedAt:'2026-11-12T22:22:22.222Z'};
 const byteLength=value=>new TextEncoder().encode(JSON.stringify(value)).byteLength;
 function catalog(state){
  const rows=summarize(state.outfits||[],state.garments||[]);
  const pages=[[]];
  for(const row of rows){
   let page=pages[pages.length-1];
   if(page.length>=MAX_LOOKS||byteLength({...sampleMeta,looks:[...page,row]})>MAX_PAYLOAD){
    if(!page.length)throw Error('Une tenue contient trop de texte pour le relais chiffré.');
    pages.push([]);page=pages[pages.length-1];
   }
   if(byteLength({...sampleMeta,looks:[row]})>MAX_PAYLOAD)throw Error('Une tenue dépasse la taille maximale du relais.');
   page.push(row);
   if(pages.length>MAX_PAGES)throw Error('Catalogue trop volumineux pour un envoi unique sécurisé.');
  }
  return {pages,total:rows.length};
 }
 async function fingerprint(pages){
  const bytes=new TextEncoder().encode(JSON.stringify(pages));
  const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
  return [...hash].map(x=>x.toString(16).padStart(2,'0')).join('');
 }
 function settingsCard(){
  if(!api)return '';
  const link=current(),c=connected();let preview;try{preview=catalog(api.state())}catch{preview={pages:[],total:api.state().outfits?.length||0,error:true}};
  return `<section class="panel"><div class="panel-header"><h2>🔗 NEXUS · Suggestions de tenues</h2></div>
   <p class="section-note">Transmets seulement le <strong>nom, l’occasion, le style et la disponibilité</strong> de tes tenues à NEXUS. Ni photos, ni mannequin, ni vêtements détaillés, ni agenda transmis à ce relais chiffré.</p>
   ${c?`<div class="notice">Connecté à NEXUS · ${preview.total} tenue(s) disponibles pour la liaison · ${preview.pages.length} lot(s) chiffré(s)${preview.error?' · catalogue trop volumineux':''}. ${link.lastSentAt?'Dernier envoi : '+safe(new Date(link.lastSentAt).toLocaleString('fr-FR')):'Aucun envoi effectué.'}</div>
     <label class="field" style="display:flex;flex-direction:row;align-items:center;gap:10px"><input type="checkbox" id="vestiaire-nexus-auto" ${link.autoShare?'checked':''}> <span>Envoyer les changements automatiquement quand Vestiaire est ouverte</span></label>
     <div class="settings-actions"><button type="button" class="btn soft" data-act="vestiaire-nexus-send">Envoyer mes tenues</button>
     <button type="button" class="btn soft" data-act="vestiaire-hub-send">Envoyer via LINK</button>
      <button type="button" class="btn ghost" data-act="vestiaire-nexus-revoke">Déconnecter</button></div>`:
    `<p class="section-note">1. Dans NEXUS → Réglages → Vestiaire, crée la liaison et copie le code privé.<br>2. Colle ce code ici pour autoriser le partage.</p>
     <label class="field"><span>Code de jumelage NEXUS (privé)</span><textarea id="vestiaire-nexus-code" rows="3" placeholder="NXL1.…" autocomplete="off"></textarea></label>
     <div class="settings-actions"><button type="button" class="btn soft" data-act="vestiaire-nexus-connect">Connecter à NEXUS</button></div>`}
   <p class="section-note">NEXUS compare ensuite les tenues à ses propres événements et à la météo. Aucun calendrier n’entre dans Vestiaire et rien n’est sélectionné sans ton accord.</p>
   <label class="field"><span>Inscription au hub LINK · invitation Vestiaire uniquement</span><textarea id="vestiaire-hub-code" rows="2" placeholder="LHI1.vestiaire.…" autocomplete="off" spellcheck="false"></textarea></label>
   <div class="settings-actions"><button type="button" class="btn soft" data-act="vestiaire-hub-enroll">Inscrire Vestiaire à LINK</button></div>
   <p class="section-note">L'inscription ne publie aucune tenue. LINK centralise les permissions ; l'ancien jumelage reste actif.</p></section>`;
 }
 async function connect(){
  if(busy)return;
  const code=document.getElementById('vestiaire-nexus-code')?.value?.trim();
  if(!code){api.toast('Colle le code généré dans NEXUS.');return;}
  let pair;
  try{pair=CORE()?.readInvite(code)}catch{api.toast('Code de jumelage invalide.');return;}
  if(pair.sourceApp!=='vestiaire'||pair.scopes.length!==1||pair.scopes[0]!=='outfit_catalog'){
   api.toast('Ce code n’autorise pas le partage des tenues Vestiaire.');return;
  }
  if(current()?.pair?.id===pair.id){api.toast('Cette connexion existe déjà.');return;}
  if(!window.confirm('Autoriser Vestiaire à envoyer un catalogue résumé de tes tenues à NEXUS ? Aucune photo ni donnée de l’agenda ne sera partagée.'))return;
  busy=true;
  try{
   await CORE().status(pair);
   await api.savePrefs({nexusLink:{pair,autoShare:false,revision:0,lastFingerprint:'',lastSentAt:null}});
   api.toast('Connexion créée. Tu peux maintenant envoyer tes tenues.');
  }catch(err){api.toast('Impossible de valider la liaison : '+String(err.message||err).slice(0,65))}
  finally{busy=false;}
 }
 async function send(manual=false){
  if(busy||!connected())return;
  if(typeof navigator!=='undefined'&&navigator.onLine===false){if(manual)api.toast('Internet requis pour envoyer les tenues.');return;}
  busy=true;
  try{
   const items=catalog(api.state()),link=current(),fp=await fingerprint(items.pages);
   if(fp===link.lastFingerprint){if(manual)api.toast('Toutes les tenues sont déjà à jour dans NEXUS.');return;}
   // Reserve the revision before sending, so retries cannot mix different snapshots.
   const revision=Math.max(Number(link.revision)||0,Number(link.pendingRevision)||0)+1;
   if(!Number.isSafeInteger(revision)||revision>1000000)throw Error('Limite de révisions LINK atteinte.');
   const batchId=crypto.randomUUID(),sharedAt=new Date().toISOString();
   await api.savePrefs({nexusLink:{...link,pendingRevision:revision}});
   for(let i=0;i<items.pages.length;i++){
    await CORE().publish(link.pair,{entityId:'vestiaire:catalog:v2:page:'+i,scope:'outfit_catalog',revision,
     payload:{type:'vestiaire.catalog.page.v2',sourceApp:'vestiaire',revision,batchId,
      pageIndex:i,pageCount:items.pages.length,total:items.total,sharedAt,looks:items.pages[i]}});
   }
   await api.savePrefs({nexusLink:{...current(),revision,pendingRevision:null,lastFingerprint:fp,lastSentAt:new Date().toISOString()}});
   if(manual)api.toast(items.total+' tenue(s) envoyée(s) en '+items.pages.length+' lot(s). Ouvre NEXUS puis appuie sur Recevoir.');
  }catch(err){
   if(manual)api.toast('Envoi incomplet : '+String(err.message||err).slice(0,80));
   console.warn('Vestiaire LINK send failed',err?.message);
  }finally{busy=false;}
 }
 async function sendHub({quiet=false}={}){
  if(busy||!connected())throw Error("Jumelage Vestiaire/Nexus nécessaire.");
  if(!window.LinkHubBus)throw Error("Module de transport LINK indisponible.");
  busy=true;
  try{
   const items=catalog(api.state()),fp=await fingerprint(items.pages),link=current();
   if(fp===link.hubLastFingerprint){if(!quiet)api.toast("Catalogue LINK déjà à jour.");return {sent:0,complete:true,unchanged:true}}
   const pending=link.hubPending;
   const fresh=!pending||pending.fingerprint!==fp||pending.totalPages!==items.pages.length;
   const meta=fresh?{
    revision:Math.max(Number(link.revision)||0,Number(link.hubRevision)||0,Number(pending?.revision)||0)+1,
    batchId:crypto.randomUUID(),sharedAt:new Date().toISOString(),
    fingerprint:fp,totalPages:items.pages.length,nextIndex:0
   }:pending;
   if(meta.revision>1000000)throw Error("Limite de révisions atteinte.");
   if(fresh)await api.savePrefs({nexusLink:{...current(),hubPending:meta}});
   let sent=0;
   for(let i=meta.nextIndex;i<Math.min(meta.nextIndex+12,items.pages.length);i++){
    const payload={type:"vestiaire.catalog.page.v2",sourceApp:"vestiaire",
     revision:meta.revision,batchId:meta.batchId,pageIndex:i,
     pageCount:items.pages.length,total:items.total,sharedAt:meta.sharedAt,
     looks:items.pages[i]};
    await window.LinkHubBus.publish({pair:link.pair,from:"vestiaire",to:"nexus",
     contractId:"vestiaire-nexus",scope:"outfit_catalog",
     entityId:"vestiaire:catalog:v2:page:"+i,revision:meta.revision,
     schemaVersion:"vestiaire.catalog.page.v2",payload});
    sent++;
    const progressed={...meta,nextIndex:i+1};
    await api.savePrefs({nexusLink:{...current(),hubPending:progressed}});
   }
   const complete=meta.nextIndex+sent>=items.pages.length;
   if(complete){
    await api.savePrefs({nexusLink:{...current(),hubPending:null,hubRevision:meta.revision,
     hubLastFingerprint:fp,hubLastSentAt:new Date().toISOString()}});
   }
   if(!quiet)api.toast(sent+" lot(s) chiffré(s) envoyés à LINK. "+(complete?
    "Nexus les recevra automatiquement à sa prochaine ouverture.":"Les lots suivants partiront automatiquement."));
   return {sent,complete,remaining:Math.max(0,items.pages.length-(meta.nextIndex+sent))};
  }finally{busy=false}
 }
 async function toggle(enabled){
  if(!connected())return;
  await api.savePrefs({nexusLink:{...current(),autoShare:enabled}});
  api.toast(enabled?'Envoi automatique activé quand Vestiaire est ouverte.':'Envoi automatique désactivé.');
  if(enabled)schedule();
 }
 async function revoke(){
  if(!connected()||busy)return;
  if(!confirm('Révoquer le partage avec NEXUS ? Les tenues déjà reçues par NEXUS devront être effacées séparément.'))return;
  busy=true;try{
   await CORE().revoke(current().pair);
   await api.savePrefs({nexusLink:null});
   api.toast('Liaison révoquée.');clear();
  }catch(err){api.toast('Révocation impossible : '+String(err?.message||err).slice(0,80))}
  finally{busy=false;}
 }
 function schedule(force=false){
  if(!connected()||!current().autoShare)return;
  if(typeof navigator!=="undefined"&&navigator.onLine===false)return;
  if(typeof document!=="undefined"&&document.visibilityState==="hidden")return;
  const now=Date.now();if(!force&&now-lastHubAttempt<30000)return;
  clear();
  timer=setTimeout(async()=>{
   timer=null;lastHubAttempt=Date.now();
   try{
    const result=await sendHub({quiet:true});
    if(result&&!result.complete)schedule(true);
   }catch(error){
    console.warn("Vestiaire LINK Hub différé",error?.message||error);
    await send(false);
   }
  },900);
 }
 async function action(kind){
  if(kind==='vestiaire-hub-enroll'){
   try{
    if(!window.LinkHubOnboard)throw Error("MODULE_LINK_INDISPONIBLE");
    const input=document.getElementById("vestiaire-hub-code");
    const value=input?.value||"";
    await window.LinkHubOnboard.enroll(value);
    if(input)input.value=""; // Never leave a consumed, single-use invitation visible.
    api?.toast?.("Vestiaire inscrit dans LINK ; les tenues ne sont pas envoyées automatiquement.");
   }catch(e){api?.toast?.("LINK : "+String(e.message||e).slice(0,100))}
   return true;
  }
  if(kind==='vestiaire-nexus-connect'){await connect();return true;}
  if(kind==='vestiaire-nexus-send'){await send(true);return true;}
  if(kind==='vestiaire-hub-send'){try{await sendHub()}catch(e){api.toast("LINK : "+String(e.message||e).slice(0,90))}return true;}
  if(kind==='vestiaire-nexus-revoke'){await revoke();return true;}
  return false;
 }
 function attach(value){
  api=value;
  if(!lifecycleBound&&typeof window!=="undefined"&&typeof document!=="undefined"){
   lifecycleBound=true;
   window.addEventListener("online",()=>schedule(true));
   window.addEventListener("focus",()=>schedule(false));
   document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")schedule(false)});
  }
  if(connected())schedule(true);
 }
 window.VestiaireNexus=Object.freeze({attach,settingsCard,action,toggle,schedule,catalog,summarize,send,sendHub});
 if(window.VESTIAIRE_LINK_API)attach(window.VESTIAIRE_LINK_API);
})();
