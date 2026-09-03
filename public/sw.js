/* Service worker do Banco de Músicas do Lyra.
   Estratégia:
   - navegações: rede primeiro, cache como rede reserva (offline mostra a última versão vista)
   - estáticos do Next: cache primeiro
   - API: sempre rede (dados precisam estar atuais)
*/
const VERSION = 'lyra-v1';
const SHELL = `${VERSION}-shell`;
const PAGES = `${VERSION}-pages`;

const PRECACHE = ['/', '/offline'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(PRECACHE).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/login')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(PAGES).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || (await caches.match('/offline')) || Response.error();
        })
    );
    return;
  }

  if (url.pathname.startsWith('/_next/static') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(SHELL).then((cache) => cache.put(request, copy)).catch(() => {});
            return response;
          })
      )
    );
  }
});
