/* Service worker do Banco de Músicas do Lyra.
   Navegação: rede primeiro. HTML só entra no cache se a resposta for 200 e
   não for a tela de login — assim um visitante sem sessão não reaproveita letra.
   O logout apaga estes caches. Estáticos: cache primeiro. API: sempre rede.
*/
const VERSION = 'lyra-v3';
const SHELL = `${VERSION}-shell`;
const PAGES = `${VERSION}-pages`;

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
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
        .then(async (response) => {
          const finalUrl = new URL(response.url);
          const isLogin = finalUrl.pathname === '/login' || finalUrl.pathname.startsWith('/login/');
          if (response.redirected || !response.ok || response.type !== 'basic' || isLogin) {
            const cache = await caches.open(PAGES);
            await cache.delete(request);
            return response;
          }
          const copy = response.clone();
          const cache = await caches.open(PAGES);
          await cache.put(request, copy);
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response('Sem conexão. Entre novamente quando a internet voltar.', {
            status: 503,
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Cache-Control': 'no-store',
            },
          });
        })
    );
    return;
  }

  if (
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/logo.png'
  ) {
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
