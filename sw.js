// Funciona sem internet: abre o que está guardado e busca a versão nova por trás (aparece na próxima abertura).
const CACHE = 'rotina-v2';
const ARQUIVOS = ['./', './index.html', './estilo.css', './rotina.js', './app.js', './manifest.webmanifest', './icones/icone-192.png', './icones/icone-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const rede = fetch(req).then((r) => { if (r.ok) cache.put(req, r.clone()); return r; });
    const guardado = await cache.match(req, { ignoreSearch: true });
    if (guardado) { e.waitUntil(rede.catch(() => {})); return guardado; }
    try { return await rede; } catch (err) {
      return (await cache.match('./index.html')) || Response.error();
    }
  })());
});
