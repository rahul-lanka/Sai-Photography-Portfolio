const CACHE_VERSION = "v2";
const CORE_CACHE = `core-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./gallery.html",
  "./event.html",
  "./contact.html",
  "./client-gallery.html",
  "./client-event.html",
  "./admin.html",
  "./css/style.css",
  "./js/main.js",
  "./js/initAuth.js",
  "./js/public-event.js",
  "./js/client-gallery.js",
  "./js/client-event.js",
  "./js/admin.js",
  "./js/auth.js",
  "./js/supabase.js",
  "./assets/Others/manifest.json",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CORE_CACHE).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CORE_CACHE && key !== IMAGE_CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isImageRequest =
    request.destination === "image" ||
    (url.hostname.endsWith(".supabase.co") && /\.(png|jpg|jpeg|webp|gif|avif|svg)$/i.test(url.pathname));

  if (isImageRequest) {
    event.respondWith(staleWhileRevalidateImage(request));
    return;
  }

  const isDocument = request.mode === "navigate" || request.destination === "document";
  const isStaticSameOrigin =
    isSameOrigin && (request.destination === "script" || request.destination === "style");

  if (isDocument || isStaticSameOrigin) {
    event.respondWith(networkFirstCore(request));
  }
});

async function staleWhileRevalidateImage(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then(response => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || networkFetch || Response.error();
}

async function networkFirstCore(request) {
  const cache = await caches.open(CORE_CACHE);

  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}
