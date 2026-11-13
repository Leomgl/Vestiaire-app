/* LINK Hub client enrollment · strictly user-triggered, no background polling.
 * App-specific credentials live in an IndexedDB separate from business data.
 * This is only identity bootstrap; data contracts/grants are managed in LINK.
 */
"use strict";
(()=>{
 const APP_ID="vestiaire",ENDPOINT="https://link-app.q9pfwtztsc.workers.dev";
 const DB_NAME="link-hub-"+APP_ID+"-v1";
 let opening=null;
 const standalone=()=>navigator.standalone===true||
  window.matchMedia?.("(display-mode: standalone)")?.matches===true;
 function parseInvitation(value){
  let raw=String(value||"").trim();
  if(raw.startsWith("LHI1.")){
   const match=/^LHI1\.([a-z][a-z0-9-]{2,39})\.([a-f0-9]{64})$/i.exec(raw);
   if(!match||match[1].toLowerCase()!==APP_ID)throw Error("INVITATION_AUTRE_APP");
   raw=match[2];
  }
  if(!/^[a-f0-9]{64}$/i.test(raw))throw Error("CODE_LINK_INVALIDE");
  return raw.toLowerCase();
 }
 function db(){
  if(opening)return opening;
  opening=new Promise((resolve,reject)=>{
   const request=indexedDB.open(DB_NAME,1);
   request.onupgradeneeded=()=>{
    if(!request.result.objectStoreNames.contains("auth"))
     request.result.createObjectStore("auth");
   };
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(Error("STOCKAGE_PWA_INDISPONIBLE"));
  });
  return opening;
 }
 async function get(){
  const database=await db();
  return new Promise((resolve,reject)=>{
   const request=database.transaction("auth","readonly").objectStore("auth").get("client");
   request.onsuccess=()=>resolve(request.result||null);
   request.onerror=()=>reject(Error("LECTURE_LINK_IMPOSSIBLE"));
  });
 }
 async function put(value){
  const database=await db();
  return new Promise((resolve,reject)=>{
   const tx=database.transaction("auth","readwrite");
   tx.objectStore("auth").put(value,"client");
   tx.oncomplete=()=>resolve();
   tx.onerror=()=>reject(Error("ENREGISTREMENT_LINK_IMPOSSIBLE"));
   tx.onabort=()=>reject(Error("ENREGISTREMENT_LINK_ANNULE"));
  });
 }
 async function enroll(value){
  if(!standalone())throw Error("OUVRE_L_ICONE_IPHONE_DE_L_APP");
  const invitation=parseInvitation(value);
  const response=await fetch(ENDPOINT+"/api/v2/hub/enroll",{
   method:"POST",cache:"no-store",headers:{"content-type":"application/json"},
   body:JSON.stringify({appId:APP_ID,invitation})
  });
  const body=await response.json().catch(()=>({error:"REPONSE_LINK_INVALIDE"}));
  if(!response.ok)throw Error(body?.error||"LINK_INDISPONIBLE");
  if(body?.appId!==APP_ID||!/^[a-f0-9]{64}$/i.test(body.credential||"")||
     !Number.isFinite(Date.parse(body.expiresAt)))
   throw Error("INSCRIPTION_NON_VERIFIEE");
  await put({appId:APP_ID,credential:body.credential,expiresAt:body.expiresAt});
  return {registered:true,appId:APP_ID,expiresAt:body.expiresAt};
 }
 async function status(){
  const c=await get().catch(()=>null);
  return {appId:APP_ID,registered:!!(c?.appId===APP_ID&&
   /^[a-f0-9]{64}$/i.test(c.credential||"")&&Date.parse(c.expiresAt)>Date.now()),
   expiresAt:c?.expiresAt||null};
 }
 // Never expose bearer secrets in logs, HTML, URLs or UI.
 window.LinkHubOnboard=Object.freeze({appId:APP_ID,parseInvitation,enroll,status});
})();
