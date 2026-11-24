/* MedLink DZ service worker.
   - Pages: network first, so users always get the latest version; pages already visited stay available offline.
   - Static files (/assets, images, fonts): served from cache and refreshed in the background.
   - Offline and not cached: /offline.html.
   - /api/ is never touched (real backend, or the in-browser demo API that runs inside the page).
   Bump VERSION to drop every cache at the next visit. */
const VERSION = 'v1';
const PAGES = `medlink-pages-${VERSION}`;
const FILES = `medlink-files-${VERSION}`;
const OFFLINE_URL = '/offline.html';
const MAX_PAGES = 30;
const MAX_FILES = 100;

/* A response that went through a redirect can't be used to answer a navigation: rebuild it as a plain 200. */
async function plain(res) {
  return new Response(await res.blob(), { status: 200, statusText: 'OK', headers: res.headers });
}

/* One cached copy per page: /annonce/12 and /annonce/57 are the same HTML, and query strings don't matter. */
function pageKey(url) {
  const path = url.pathname.replace(/\/$/, '') || '/';
  return new Request(url.origin + (path.startsWith('/annonce/') ? '/annonce' : path));
}

async function trim(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const res = await fetch(OFFLINE_URL, { cache: 'reload' });
    if (!res.ok) throw new Error('offline page unavailable');
    await (await caches.open(PAGES)).put(OFFLINE_URL, res.redirected ? await plain(res) : res);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith('medlink-') && name !== PAGES && name !== FILES) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

async function navigate(request) {
  const url = new URL(request.url);
  try {
    const res = await fetch(request);
    if (res.ok && !res.redirected && res.type === 'basic') {
      const cache = await caches.open(PAGES);
      await cache.put(pageKey(url), res.clone());
      trim(PAGES, MAX_PAGES);
    }
    return res;
  } catch {
    const cache = await caches.open(PAGES);
    return (await cache.match(pageKey(url))) || (await cache.match(OFFLINE_URL)) || Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) { (await caches.open(FILES)).put(request, res.clone()); trim(FILES, MAX_FILES); }
  return res;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(FILES);
  const cached = await cache.match(request);
  const refresh = fetch(request).then((res) => {
    // Opaque responses (cross-origin fonts) can't be inspected but can be cached
    if (res.ok || res.type === 'opaque') { cache.put(request, res.clone()); trim(FILES, MAX_FILES); }
    return res;
  }).catch(() => null);
  return cached || (await refresh) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin && url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') { event.respondWith(navigate(request)); return; }

  if (sameOrigin) {
    if (url.pathname.startsWith('/assets/')) event.respondWith(cacheFirst(request)); // hashed file names: never change
    else if (/\.(?:png|jpe?g|webp|avif|svg|ico|woff2?)$/i.test(url.pathname) && !url.pathname.startsWith('/og/')) event.respondWith(staleWhileRevalidate(request));
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request));
  }
});
