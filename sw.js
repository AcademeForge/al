// sw.js

const CACHE_NAME = "academeforge-v1";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/AF%20LOGO%201.jpeg",
  "/AF%20LOGO%202.jpeg",
  "/AF%20LOGO%203.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Never cache API calls
  if (
    request.url.includes("/functions/v1/") ||
    request.headers.has("authorization")
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // HTML = network first
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => cache.put(request, clone));

          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets = stale while revalidate
  event.respondWith(
    caches.match(request).then(cached => {
      const fetchPromise = fetch(request)
        .then(networkResponse => {
          const clone = networkResponse.clone();

          caches.open(CACHE_NAME)
            .then(cache => cache.put(request, clone));

          return networkResponse;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
