// Os ícones oficiais podem ser atualizados mantendo o mesmo caminho público.
// Não use uma resposta antiga do Cache Storage quando houver conexão: isso evita
// que uma versão substituída do ícone reapareça após recarregar a página.
const CACHE='arl-static-v5';
const ROOT=new URL('./',self.registration.scope);
const asset=path=>new URL(path,ROOT).href;
const PRECACHE=['manifest.webmanifest','arl-assets/icons/icon-192.png','arl-assets/icons/icon-512.png','arl-assets/icons/icon-maskable-512.png'].map(asset);
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('arl-static-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));

const cacheable=response=>response.status===200&&!response.redirected
  &&!/\b(private|no-store)\b/i.test(response.headers.get('Cache-Control')||'')
  &&!/text\/html/i.test(response.headers.get('Content-Type')||'');

self.addEventListener('install',event=>event.waitUntil((async()=>{
  const resources=await Promise.all(PRECACHE.map(async url=>{
    const response=await fetch(new Request(url,{cache:'reload'}));
    if(!cacheable(response))throw new Error('Invalid static precache response');
    return [url,response];
  }));
  const cache=await caches.open(CACHE);
  await Promise.all(resources.map(([url,response])=>cache.put(url,response)));
  await self.skipWaiting();
})()));

async function staticResponse(request,networkFirst){
  // Cache Storage may be unavailable or full; valid network delivery still works.
  const cache=await caches.open(CACHE).catch(()=>null);
  const stored=cache?await cache.match(request).catch(()=>undefined):undefined;
  const validStored=stored&&cacheable(stored)?stored:undefined;
  if(stored&&!validStored)await cache.delete(request).catch(()=>false);
  if(validStored&&!networkFirst)return validStored;
  let response;
  try{
    response=await fetch(networkFirst?new Request(request,{cache:'reload'}):request);
  }catch(error){
    if(validStored)return validStored;
    throw error;
  }
  // HTTP failures remain visible. Only actual network failure uses offline fallback.
  if(cache&&cacheable(response))await cache.put(request,response.clone()).catch(()=>undefined);
  return response;
}

self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==location.origin||request.headers.has('Range')||request.headers.has('Authorization'))return;
  if(url.pathname===new URL(asset('build/manifest.json')).pathname||url.pathname===new URL(asset('build/.htaccess')).pathname)return;
  const manifest=url.pathname===new URL(asset('manifest.webmanifest')).pathname;
  if(!manifest&&!url.href.startsWith(asset('arl-assets/'))&&!url.href.startsWith(asset('build/')))return;
  const response=staticResponse(request,manifest||url.href.startsWith(asset('arl-assets/icons/')));
  event.respondWith(response);
  // Keep cache writes alive; respondWith still exposes network/HTTP errors to callers.
  event.waitUntil(response.then(()=>undefined,()=>undefined));
});
self.addEventListener('push',event=>{let data={title:'ARL Informática',description:'Existe uma nova notificação.',url:'./'};try{data={...data,...event.data.json()}}catch{}event.waitUntil(self.registration.showNotification(data.title,{body:data.description,icon:asset('arl-assets/icons/icon-192.png'),badge:asset('arl-assets/icons/icon-192.png'),data:{url:data.url}}))});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{const url=new URL(event.notification.data?.url||'./',ROOT).href;const existing=list.find(client=>client.url===url);return existing?existing.focus():clients.openWindow(url)}))});
