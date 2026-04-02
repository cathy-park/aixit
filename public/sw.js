/* eslint-disable no-restricted-globals */

const CACHE_VERSION = "v2";
const CACHE_NAME = `aixit-pwa-${CACHE_VERSION}`;

const OFFLINE_URL = "/offline.html";
const ICON_192 = "/icon-192.png";
const ICON_512 = "/icon-512.png";
const MANIFEST_URL = "/manifest.json";

const PRECACHE_URLS = [OFFLINE_URL, MANIFEST_URL, ICON_192, ICON_512];

function isNavigationRequest(request) {
  // Request.mode === "navigate" is the most reliable for browser navigations.
  return request.mode === "navigate";
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

  // For same-origin GET requests, do cache-first then network, with caching on success.
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;

        try {
          const response = await fetch(request);
          // Cache only successful basic GET responses.
          if (response && response.status === 200) {
            const copy = response.clone();
            // Cache matching uses the request URL as key.
            await cache.put(request, copy);
          }
          return response;
        } catch {
          // If we can't reach network, return whatever we have in cache.
          return (await cache.match(request)) || respondWithOfflineFallback();
        }
      })(),
    );
    return;
  }
});

