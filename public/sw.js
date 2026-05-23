// Service Worker for My Agenda PWA
// Cache strategies:
//   - HTML navigations: network-first with cache fallback (offline shell)
//   - Static assets (_next/static, icons, fonts): cache-first
//   - API calls and auth callbacks: bypass cache entirely (fresh or fail)

const CACHE_VERSION = "v1";
const CACHE_NAME = `task-app-${CACHE_VERSION}`;
const OFFLINE_SHELL = "/";

const PRECACHE = ["/", "/manifest.json", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:png|jpe?g|svg|webp|ico|css|js|woff2?|ttf)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Skip API, auth, and Next data prefetches — they must hit the network
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/data/")
  ) {
    return;
  }

  // HTML navigations: network-first, offline fallback to cached shell
  const accept = req.headers.get("accept") ?? "";
  if (req.mode === "navigate" || accept.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, copy).catch(() => {});
          });
          return response;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached ?? caches.match(OFFLINE_SHELL))
        )
    );
    return;
  }

  // Static assets: cache-first
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, copy).catch(() => {});
          });
          return response;
        });
      })
    );
  }
});
