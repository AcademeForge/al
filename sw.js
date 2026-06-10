// sw.js
const CACHE_NAME = "academeforge-v7";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/AF%20LOGO%202.jpeg"
];

// ── INSTALL ────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE ───────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── FETCH ──────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = request.url;

  // ── 1. NEVER intercept non-GET requests — pass straight through ──────
  // This is the PRIMARY fix: POST/PUT/DELETE/OPTIONS must never touch the
  // Cache API because cache.put() does not support them.
  if (request.method !== "GET") {
    return; // let the browser handle it natively — no event.respondWith()
  }

  // ── 2. NEVER cache Supabase or any API/auth requests ─────────────────
  if (
    url.includes(".supabase.co") ||
    url.includes("/functions/v1/") ||
    url.includes("/rest/v1/") ||
    url.includes("/auth/v1/") ||
    url.includes("supabase.in") ||
    request.headers.get("authorization")
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // ── 3. NEVER cache third-party CDN requests (fonts, scripts) ─────────
  if (
    url.includes("fonts.googleapis.com") ||
    url.includes("fonts.gstatic.com") ||
    url.includes("cdn.jsdelivr.net") ||
    url.includes("esm.sh")
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // ── 4. HTML navigation → Network First, fall back to cache ───────────
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // ── 5. Static assets → Cache First, background revalidate ────────────
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok && response.status < 400) {
            const clone = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, clone))
              .catch(() => {}); // silently ignore cache write errors
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
