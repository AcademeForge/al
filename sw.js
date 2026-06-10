const CACHE_NAME = "academeforge-v2";

const STATIC_FILES = [
  "/",
  "/index.html",
  "/offline/",
  "/AF%20LOGO%202.jpeg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_FILES))
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

  // Ignore non-GET
  if (request.method !== "GET") {
    return;
  }

  // Ignore APIs
  if (
    request.url.includes("supabase.co") ||
    request.url.includes("/functions/v1/")
  ) {
    return;
  }

  // HTML Navigation -> Network First
  if (request.mode === "navigate") {

    event.respondWith(
      fetch(request)
        .then(response => {

          if (response.ok) {
            const copy = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, copy));
          }

          return response;
        })
        .catch(async () => {

          const cached = await caches.match(request);

          if (cached) {
            return cached;
          }

          return caches.match("/offline/");
        })
    );

    return;
  }

  // Static Assets -> Cache First
  event.respondWith(
    caches.match(request).then(cached => {

      if (cached) {
        return cached;
      }

      return fetch(request)
        .then(response => {

          if (
            response &&
            response.ok &&
            request.method === "GET"
          ) {

            const copy = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, copy))
              .catch(() => {});
          }

          return response;
        })
        .catch(() => caches.match("/offline/"));
    })
  );

});
