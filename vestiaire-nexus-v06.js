(function vestiaireNexusV06(){
 'use strict';
 let api=null,busy=false,timer=null;
 const MAX_LOOKS=24;
 const MAX_PAYLOAD=5500;
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
 function catalog(state){
  const rows=summarize(state.outfits||[],state.garments||[]);
  const chosen=[];let omitted=0;
  for(const row of rows){
   if(chosen.length>=MAX_LOOKS){omitted++;continue;}
   if(new TextEncoder().encode(JSON.stringify({type:'vestiaire.catalog.v1',sourceApp:'vestiaire',revision:1,looks:[...chosen,row]})).byteLength>MAX_PAYLOAD){omitted++;continue;}
   chosen.push(row);
  }
  return {looks:chosen,total:rows.length,omitted};
 }
 function settingsCard(){
  if(!api)return '';
  const link=current(),c=connected(),preview=catalog(api.state());
  return `<section class="panel"><div class="panel-header"><h2>🔗 NEXUS · Suggestions de tenues</h2></div>
   <p class="section-note">Transmets seulement le <strong>nom, l’occasion, le style et la disponibilité</strong> de tes tenues à NEXUS. Ni photos, ni mannequin, ni vêtements détaillés, ni agenda transmis à ce relais chiffré.</p>
   ${c?`<div class="notice">Connecté à NEXUS · ${preview.looks.length} tenue(s) partageable(s)${preview.omitted?' · '+preview.omitted+' non incluses dans ce lot':''}. ${link.lastSentAt?'Dernier envoi : '+safe(new Date(link.lastSentAt).toLocaleString('fr-FR')):'Aucun envoi effectué.'}</div>
     <label class="field" style="display:flex;flex-direction:row;align-items:center;gap:10px"><input type="checkbox" id="vestiaire-nexus-auto" ${link.autoShare?'checked':''}> <span>Envoyer les changements automatiquement quand Vestiaire est ouverte</span></label>
     <div class="settings-actions"><button type="button" class="btn soft" data-act="vestiaire-nexus-send">Envoyer mes tenues</button>
      <button type="button" class="btn ghost" data-act="vestiaire-nexus-revoke">Déconnecter</button></div>`:
    `<p class="section-note">1. Dans NEXUS → Réglages → Vestiaire, crée la liaison et copie le code privé.<br>2. Colle ce code ici pour autoriser le partage.</p>
     <label class="field"><span>Code de jumelage NEXUS (privé)</span><textarea id="vestiaire-nexus-code" rows="3" placeholder="NXL1.…" autocomplete="off"></textarea></label>
     <div class="settings-actions"><button type="button" class="btn soft" data-act="vestiaire-nexus-connect">Connecter à NEXUS</button></div>`}
   <p class="section-note">NEXUS compare ensuite les tenues à ses propres événements et à la météo. Aucun calendrier n’entre dans Vestiaire et rien n’est sélectionné sans ton accord.</p></section>`;
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
  const link=current(),items=catalog(api.state());
  const fingerprint=JSON.stringify(items.looks);
  if(!manual&&fingerprint===link.lastFingerprint)return;
  if(manual&&fingerprint===link.lastFingerprint){api.toast('Le catalogue est déjà à jour dans NEXUS.');return;}
  busy=true;
  try{
   const revision=Math.min(1000000,(Number(link.revision)||0)+1);
   await CORE().publish(link.pair,{entityId:'vestiaire:catalog',scope:'outfit_catalog',revision,
    payload:{type:'vestiaire.catalog.v1',sourceApp:'vestiaire',revision,
     looks:items.looks,sharedAt:new Date().toISOString(),total:items.total,omitted:items.omitted}});
   await api.savePrefs({nexusLink:{...link,revision,lastFingerprint:fingerprint,lastSentAt:new Date().toISOString()}});
   if(manual)api.toast(`${items.looks.length} tenue(s) envoyée(s) à NEXUS${items.omitted?' ('+items.omitted+' hors lot)':''}.`);
  }catch(err){if(manual)api.toast('Envoi impossible : '+String(err.message||err).slice(0,80));console.warn('Vestiaire LINK send failed',err?.message);}
  finally{busy=false;}
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
 function schedule(){
  if(!connected()||!current().autoShare)return;
  clear();
  timer=setTimeout(()=>{timer=null;void send();},2200);
 }
 async function action(kind){
  if(kind==='vestiaire-nexus-connect'){await connect();return true;}
  if(kind==='vestiaire-nexus-send'){await send(true);return true;}
  if(kind==='vestiaire-nexus-revoke'){await revoke();return true;}
  return false;
 }
 function attach(value){api=value; if(connected())schedule();}
 window.VestiaireNexus=Object.freeze({attach,settingsCard,action,toggle,schedule,catalog,summarize,send});
 if(window.VESTIAIRE_LINK_API)attach(window.VESTIAIRE_LINK_API);
})();
