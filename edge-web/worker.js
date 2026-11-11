/**
 * VESTIAIRE — Cloudflare Worker de diffusion statique.
 * Domaine HTTPS séparé, pas de D1, R2, KV, compte ni secret.
 * Le code public vient du dépôt GitHub ; les photos personnelles restent
 * dans IndexedDB de l'appareil, jamais sur GitHub/Cloudflare.
 */
const SOURCE='https://raw.githubusercontent.com/Leomgl/Vestiaire-app/main';
const TYPES={
 '/index.html':'text/html; charset=utf-8',
 '/app.js':'text/javascript; charset=utf-8',
 '/styles.css':'text/css; charset=utf-8',
 '/sw.js':'text/javascript; charset=utf-8',
 '/manifest.webmanifest':'application/manifest+json; charset=utf-8',
 '/icon.svg':'image/svg+xml',
 '/icons/icon-192.png':'image/png',
 '/icons/icon-512.png':'image/png',
 '/icons/apple-touch-icon.png':'image/png'
};
const CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; worker-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
export default {
 async fetch(request){
  const url=new URL(request.url);
  if(!['GET','HEAD'].includes(request.method))return new Response('Method Not Allowed',{status:405,headers:{allow:'GET, HEAD'}});
  const path=url.pathname==='/'?'/index.html':url.pathname;
  if(!Object.prototype.hasOwnProperty.call(TYPES,path))return new Response('Not Found',{status:404});
  let origin;
  try{
   origin=await fetch(SOURCE+path,{method:'GET',headers:{accept:'*/*'},redirect:'follow',cf:{cacheEverything:true,cacheTtl:60}});
  }catch{return new Response('Source temporairement indisponible',{status:503});}
  if(!origin.ok)return new Response(origin.status===404?'Not Found':'Source temporairement indisponible',{status:origin.status===404?404:503});
  const headers=new Headers({
   'content-type':TYPES[path],
   'cache-control':path==='/index.html'||path==='/sw.js'?'no-cache':'public, max-age=120',
   'content-security-policy':CSP,
   'referrer-policy':'no-referrer',
   'x-content-type-options':'nosniff',
   'x-frame-options':'DENY',
   'cross-origin-resource-policy':'same-origin'
  });
  if(path==='/sw.js')headers.set('service-worker-allowed','/');
  return new Response(request.method==='HEAD'?null:origin.body,{status:200,headers});
 }
};