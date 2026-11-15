/** @file Service worker (T-41): precaches the app shell, caches map tiles and glyphs as they are viewed, serves the cached app when offline. Placeholders are filled in by vite.config.ts at build. */
const VERSION = "__VERSION__";
const SHELL_CACHE = `cims-shell-${VERSION}`;
const RUNTIME_CACHE = "cims-runtime-v1";
const SHELL = __SHELL__;
const MAX_RUNTIME_ENTRIES = 700; // map tiles and glyph ranges seen so far; oldest are dropped first
const RUNTIME_HOSTS = ["tiles.openfreemap.org", "demotiles.maplibre.org"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("cims-shell-") && k !== SHELL_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Keep the runtime cache from growing forever: delete the oldest entries beyond the cap. */
async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_RUNTIME_ENTRIES; i++) await cache.delete(keys[i]);
}

/** Serve from the runtime cache right away when we have it, and refresh it in the background. */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then((response) => {
      if (response && (response.ok || response.type === "opaque")) {
        cache.put(request, response.clone()).then(() => trim(cache));
      }
      return response;
    })
    .catch(() => undefined);
  return cached || (await refresh) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Page loads: the network when it works (so deploys show up), the cached app when it does not.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/index.html")));
    return;
  }

  // Our own files (hashed assets, fonts, data bundled into the JS): precached, cache first.
  if (url.origin === self.location.origin) {
    event.respondWith(caches.match(request, { ignoreSearch: true }).then((hit) => hit || fetch(request)));
    return;
  }

  // Map tiles and label glyphs: whatever the user has looked at keeps working offline.
  if (RUNTIME_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
