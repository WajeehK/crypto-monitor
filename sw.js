// Crypto Trader service worker (GitHub Pages build): app shell network-first with an offline copy, Web Push notifications.
// Data (encrypted) and Kraken prices are cross-origin and never touched here.
const SHELL='ct-shell-v7';
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(SHELL).then(c=>c.addAll(['./','index.html','app.css?v=7','app.js?v=7','chart.js?v=7','lwc.js','icon.svg','icon-192.png','coins/index.json']).catch(()=>{})))});
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==SHELL)await caches.delete(k);await self.clients.claim()})()));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  e.respondWith(fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(SHELL).then(c=>c.put(r,cp))}return res})
    .catch(async()=>(await caches.match(r,{ignoreSearch:false}))||(await caches.match(r,{ignoreSearch:true}))||(r.mode==='navigate'&&await caches.match('index.html'))||new Response('Offline',{status:503})))});
self.addEventListener('push',e=>{
  let d={};try{d=e.data?e.data.json():{}}catch(_){d={title:'Crypto Trader',body:e.data&&e.data.text()}}
  const base=self.registration.scope;
  e.waitUntil(self.registration.showNotification(d.title||'Crypto Trader',{
    body:d.body||'',tag:d.tag,renotify:true,icon:new URL('icon-192.png',base).href,badge:new URL('badge-96.png',base).href,
    data:{url:new URL(d.url||'./index.html',base).href},timestamp:Date.now(),vibrate:[60,40,60]}));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();const url=(e.notification.data&&e.notification.data.url)||self.registration.scope;
  e.waitUntil((async()=>{const cs=await clients.matchAll({type:'window',includeUncontrolled:true});
    for(const c of cs){if(c.url.startsWith(self.registration.scope)){await c.focus();try{c.postMessage({type:'open',url})}catch(_){ }return}}
    return clients.openWindow(url)})());
});
