'use strict';
const CACHE='vestiaire-v06.0';
const ASSETS=['./','./index.html','./styles.css','./v02.css','./fit-engine.js','./app.js?v=0600','./nexus-link-core.js?v=0600','./vestiaire-nexus-v06.js?v=0600','./vestiaire-nexus-v06.css?v=0600','./fits-import.js','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin)return;
 event.respondWith(fetch(event.request).then(response=>{
  if(response.ok&&ASSETS.some(p=>new URL(p,self.registration.scope).pathname===url.pathname)){
   const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));
  }
  return response;
 }).catch(()=>caches.match(event.request).then(cached=>cached||(event.request.mode==='navigate'?caches.match('./index.html'):Response.error()))));
});
