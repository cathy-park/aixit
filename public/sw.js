/* eslint-disable no-restricted-globals */

const CACHE_VERSION = "v6";
const CACHE_NAME = `aixit-pwa-${CACHE_VERSION}`;

const OFFLINE_URL = "/offline.html";
const ICON_192 = "/icon-192-v2.png";
const ICON_512 = "/icon-512-v2.png";
const MANIFEST_URL = "/manifest.json";

const PRECACHE_URLS = [OFFLINE_URL, MANIFEST_URL, ICON_192, ICON_512];

function isNavigationRequest(request) {
  // Request.mode === "navigate" is the most reliable for browser navigations.
  return request.mode === "navigate";
}

/** PNG/JPG/SVG 등과 next/image 최적화 URL은 cache-first 금지 — 배포 후에도 옛 이미지가 남는 문제 방지 */
function shouldBypassAggressiveCache(url) {
  const p = url.pathname;
  if (p.startsWith("/_next/image")) return true;
  if (/\.(png|jpe?g|gif|webp|svg|ico)$/i.test(p)) return true;
  if (p === "/favicon.ico") return true;
  return false;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_URLS);
      self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Clean up old caches.
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))));
      self.clients.claim();
    })(),
  );
});

async function respondWithOfflineFallback() {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(OFFLINE_URL);
  if (cached) return cached;
  // Last-resort fallback.
  return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Navigation requests: try network first, then fall back to offline page.
  if (isNavigationRequest(request)) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          return response;
        } catch {
          return respondWithOfflineFallback();
        }
      })(),
    );
    return;
  }

  // 이미지·next/image: 항상 네트워크 우선 (SW에 오래된 바이너리가 박히지 않게)
  if (url.origin === self.location.origin && shouldBypassAggressiveCache(url)) {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match(request)) || respondWithOfflineFallback();
        }
      })(),
    );
    return;
  }

  // 그 외 same-origin GET: cache-first (오프라인 보조)
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;

        try {
          const response = await fetch(request);
          if (response && response.status === 200) {
            const copy = response.clone();
            await cache.put(request, copy);
          }
          return response;
        } catch {
          return (await cache.match(request)) || respondWithOfflineFallback();
        }
      })(),
    );
    return;
  }
});

