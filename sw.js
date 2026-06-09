// sw.js

const CACHE_NAME = "academeforge-v2";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/AF%20LOGO%201.jpeg",
  "/AF%20LOGO%202.jpeg",
  "/AF%20LOGO%203.png"
];

// INSTALL
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// FETCH
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // NEVER cache non-GET requests
  if (request.method !== "GET") {
    event.respondWith(fetch(request));
    return;
  }

  // NEVER cache Supabase Functions/API requests
  if (
    request.url.includes("/functions/v1/") ||
    request.url.includes(".supabase.co") ||
    request.headers.has("authorization")
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // HTML Pages → Network First
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }

          return response;
        })
        .catch(() => caches.match(request))
    );

    return;
  }

  // Static Assets → Cache First + Background Update
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }

          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
