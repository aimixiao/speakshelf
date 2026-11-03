const SHELL='speakshelf-shell-v1';
const AUDIO='speakshelf-audio-v1';
const urls=['./','./index.html','./style.css','./app.mjs','./core.mjs','./db.mjs','./icons.mjs','./player.mjs','./seed.mjs','./manifest.webmanifest','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(SHELL).then(cache=>cache.addAll(urls))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('speakshelf-shell-')&&key!==SHELL)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data==='skipWaiting')self.skipWaiting();});
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
  event.respondWith((async()=>{if(request.mode==='navigate'){try{return await fetch(request);}catch{return await caches.match(new URL('./index.html',self.registration.scope));}}
  if(url.pathname.endsWith('.mp3')){const cached=await (await caches.open(AUDIO)).match(url.href);if(!cached)return fetch(request);const range=request.headers.get('range');if(range){const data=await cached.arrayBuffer(),match=/^bytes=(\d*)-(\d*)$/.exec(range);if(match){const start=match[1]?Number(match[1]):Math.max(0,data.byteLength-Number(match[2])),end=match[1]&&match[2]?Math.min(Number(match[2]),data.byteLength-1):data.byteLength-1;if(start>=data.byteLength||end<start)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${data.byteLength}`}});return new Response(data.slice(start,end+1),{status:206,headers:{'Content-Type':'audio/mpeg','Content-Range':`bytes ${start}-${end}/${data.byteLength}`,'Content-Length':String(end-start+1),'Accept-Ranges':'bytes'}});}}return cached;}
  return await caches.match(request)||fetch(request);})());});
